/**
 * Mesure de texte — PLAN.md §4.2 : `layout/` ne touche pas au DOM, la mesure
 * passe donc par une interface injectable. Le navigateur fournit un mesureur
 * exact (canvas) ; les tests et les rendus sans DOM utilisent la table
 * ci-dessous.
 */

export interface Measurer {
  /** largeur en pixels d'un texte, pour une taille et une graisse données */
  measure(text: string, fontSize: number, weight?: number): number;
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

export const approximateMeasurer: Measurer = {
  measure(text: string, fontSize: number, weight = 400): number {
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
    measure(text, fontSize, weight = 400) {
      const key = `${fontSize}|${weight}|${text}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const width = inner.measure(text, fontSize, weight);
      cache.set(key, width);
      return width;
    },
  };
}
