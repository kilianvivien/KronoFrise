/**
 * Mesure de texte — PLAN.md §4.2 : `layout/` ne touche pas au DOM, la mesure
 * passe donc par une interface injectable. Le navigateur fournit un mesureur
 * exact (canvas) ; les tests et les rendus sans DOM utilisent la table
 * ci-dessous.
 */

import { DEFAULT_FACE, faceById, type FaceId } from '../shared/faces';
import { GENERATED_FACES } from './faceMetrics';

export interface Measurer {
  /**
   * Largeur en pixels d'un texte, pour une taille, une graisse et une fonte.
   *
   * `face` est optionnel pour que les appelants qui n'en ont qu'une — les
   * tests, la fonte d'interface — restent lisibles ; `forFace` le fige une
   * fois pour toutes plutôt que de le faire traverser le moteur.
   */
  measure(text: string, fontSize: number, weight?: number, face?: FaceId): number;
}

/**
 * Fige la fonte d'un mesureur.
 *
 * Le moteur de mise en page mesure à une trentaine d'endroits ; leur faire
 * tous porter la fonte aurait multiplié les occasions de l'oublier — et un
 * oubli ne se voit pas, il décale seulement une puce. La fonte est donc
 * résolue une fois, à l'entrée de `layout()`.
 */
export function forFace(inner: Measurer, face: FaceId): Measurer {
  return { measure: (text, fontSize, weight) => inner.measure(text, fontSize, weight, face) };
}

/**
 * Chasse réelle des glyphes, en em, relevée sur la police d'interface
 * (SF Pro Text, graisse 500) — la cible de PLAN.md §0.2, macOS d'abord. Les
 * rapports d'em ne varient pas avec la taille ; seule la graisse les décale,
 * d'où les facteurs plus bas.
 *
 * Une moyenne par glyphe ne suffisait pas : elle sous-estimait « Naissance de
 * l'écriture » de plus de 10 %, et le texte débordait de sa puce. Une largeur
 * un peu trop grande n'ajoute qu'un blanc ; une largeur trop petite fait un
 * défaut visible.
 */
const GLYPHS: readonly (readonly [string, number])[] = [
  ['e7éèêë', 0.5752],
  ['nu–ùûü', 0.5923],
  ['.,;:\'’', 0.3081],
  ['aàâä', 0.5586],
  ['ijîï', 0.2544],
  ['EÉÈÊ', 0.5986],
  ['UÙÛÜ', 0.7393],
  ['oôö', 0.5947],
  ['AÀÂ', 0.6875],
  ['OQÔ', 0.7705],
  ['bd', 0.6206],
  ['cç', 0.5630],
  ['CÇ', 0.7183],
  ['GN', 0.7451],
  ['IÎ', 0.2788],
  ['M—', 0.8789],
  ['P0', 0.6421],
  ['69', 0.6465],
  ['«»', 0.6680],
  ['-°', 0.4702],
  ['()', 0.3916],
  ['f', 0.3716],
  ['g', 0.6157],
  ['h', 0.5972],
  ['k', 0.5566],
  ['l', 0.2612],
  ['m', 0.8848],
  ['p', 0.6167],
  ['q', 0.6162],
  ['r', 0.3931],
  ['s', 0.5317],
  ['t', 0.3740],
  ['v', 0.5498],
  ['w', 0.7930],
  ['x', 0.5371],
  ['y', 0.5552],
  ['z', 0.5425],
  ['B', 0.6636],
  ['D', 0.7275],
  ['F', 0.5747],
  ['H', 0.7500],
  ['J', 0.5532],
  ['K', 0.6699],
  ['L', 0.5708],
  ['R', 0.6611],
  ['S', 0.6440],
  ['T', 0.6367],
  ['V', 0.6836],
  ['W', 0.9756],
  ['X', 0.6899],
  ['Y', 0.6670],
  ['Z', 0.6606],
  ['1', 0.4741],
  ['2', 0.6108],
  ['3', 0.6353],
  ['4', 0.6523],
  ['5', 0.6274],
  ['8', 0.6514],
  [' ', 0.2676],
  ['!', 0.3203],
  ['?', 0.5215],
  ['/', 0.3086],
  ['Æ', 0.9692],
  ['Œ', 1.1255],
  ['œ', 0.9688],
  ['æ', 0.9043],
  ['ᵉ', 0.3950],
];

const WIDTHS = new Map<string, number>();
for (const [chars, width] of GLYPHS) for (const char of chars) WIDTHS.set(char, width);

/** Lettre inconnue (grec, cyrillique, emoji…) : la chasse moyenne des lettres. */
const FALLBACK = 0.58;
/** Graisse 400 et 600 relativement à la table, relevées sur la même police. */
const WEIGHT_400 = 0.979;
const WEIGHT_600 = 1.021;
/**
 * Marge de sûreté : la police réelle du poste peut être un peu plus large que
 * celle du relevé. Mieux vaut une puce de 1 % trop large qu'un texte dehors.
 */
const SAFETY = 1.01;
/**
 * Les polices d'interface ont une taille optique : sous 13 px, la chasse
 * s'élargit d'environ 0,006 em par point manquant (relevé sur 11 px). Sans ce
 * terme, les dates en 11 px sortaient de leur puce.
 */
const TRACKING_PER_PX = 0.006;
const TABLE_SIZE = 13;

/** Tables des fontes livrées : deux graisses réelles, pas un facteur. */
const GENERATED = new Map<string, { regular: Map<string, number>; bold: Map<string, number>; fallback: number; missing: string }>();
for (const [key, face] of Object.entries(GENERATED_FACES)) {
  const build = (groups: readonly (readonly [string, number])[]): Map<string, number> => {
    const map = new Map<string, number>();
    for (const [chars, em] of groups) for (const char of chars) map.set(char, em);
    return map;
  };
  GENERATED.set(key, {
    regular: build(face.regular),
    bold: build(face.bold),
    fallback: face.fallback,
    missing: face.missing,
  });
}

/**
 * Remplacement sûr d'un caractère qu'une fonte d'affichage ne porte pas.
 *
 * Les sous-ensembles d'EB Garamond et de Caveat n'ont ni l'espace fine
 * insécable ni, pour la seconde, les lettres modificatives. Laissées telles
 * quelles, elles s'affichaient avec le glyphe manquant — plus large de moitié
 * que ce que la table annonçait, si bien que la mesure et le dessin ne
 * parlaient plus de la même chaîne.
 */
const SUBSTITUTIONS: Record<string, string> = {
  'ᵉ': 'e', 'ʳ': 'r',
  '\u202F': ' ', '\u00A0': ' ',
  '–': '-', '—': '-', '…': '...', '’': "'",
  '«': '"', '»': '"',
  'œ': 'oe', 'Œ': 'OE', 'æ': 'ae', 'Æ': 'AE',
};

/** Caractères que cette fonte ne porte pas ; vide pour la fonte du système. */
export function missingChars(face: FaceId = DEFAULT_FACE): string {
  const table = faceById(face).table;
  return table === undefined ? '' : GENERATED.get(table)?.missing ?? '';
}

/**
 * Réécrit un texte pour une fonte donnée, en remplaçant ce qu'elle ne porte
 * pas. Appliqué à l'écran **et** à l'impression, pour que les deux disent la
 * même chose ; et toujours après la mesure, puisque les remplacements ne font
 * que rétrécir le texte — les largeurs restent donc des majorants.
 */
export function foldForFace(text: string, face: FaceId = DEFAULT_FACE): string {
  const missing = missingChars(face);
  if (missing === '') return text;
  // « ᵉʳ » se lit « er » : les remplacer un à un donnerait le même résultat,
  // mais l'ordre explicite dit l'intention.
  let out = missing.includes('ᵉ') && missing.includes('ʳ') ? text.replace(/\u1D49\u02B3/g, 'er') : text;
  for (const char of missing) out = out.split(char).join(SUBSTITUTIONS[char] ?? '');
  return out;
}

export const approximateMeasurer: Measurer = {
  measure(text: string, fontSize: number, weight = 400, face: FaceId = DEFAULT_FACE): number {
    const table = faceById(face).table;
    if (table !== undefined) {
      const generated = GENERATED.get(table);
      if (generated !== undefined) {
        // La graisse 500 est rendue par le fichier « regular » : c'est la
        // règle d'appariement CSS quand seules 400 et 600 sont déclarées, et
        // la mesure suit donc exactement ce que le navigateur affiche.
        const widths = weight >= 600 ? generated.bold : generated.regular;
        let em = 0;
        for (const char of text) em += widths.get(char) ?? generated.fallback;
        // Aucun terme de taille optique : ces fontes sont statiques.
        return em * fontSize * SAFETY;
      }
    }
    let em = 0;
    let glyphs = 0;
    for (const char of text) { em += WIDTHS.get(char) ?? FALLBACK; glyphs++; }
    const scale = weight >= 600 ? WEIGHT_600 : weight >= 500 ? 1 : WEIGHT_400;
    const tracking = Math.max(0, TABLE_SIZE - fontSize) * TRACKING_PER_PX * glyphs;
    return (em * scale + tracking) * fontSize * SAFETY;
  },
};

/** Mesureur mémoïsé : la mise en page tourne à chaque image de glissement. */
export function cachedMeasurer(inner: Measurer): Measurer {
  const cache = new Map<string, number>();
  return {
    measure(text, fontSize, weight = 400, face = DEFAULT_FACE) {
      const key = `${face}|${fontSize}|${weight}|${text}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const width = inner.measure(text, fontSize, weight, face);
      cache.set(key, width);
      return width;
    },
  };
}
