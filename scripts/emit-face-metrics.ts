/**
 * Engendre `src/layout/faceMetrics.ts` — la chasse de chaque glyphe des polices
 * incorporées, relevée **dans les fichiers eux-mêmes**.
 *
 * Pourquoi engendrer plutôt que relever à la main comme pour SF Pro Text : ces
 * polices-là, nous les livrons. Le fichier que mesure ce script est exactement
 * celui que le navigateur affiche et que le PDF incorpore, donc la table est
 * juste par construction et le restera si l'on change de sous-ensemble.
 *
 * `pnpm metrics`
 */
import fontkit from '@pdf-lib/fontkit';
import { readFileSync, writeFileSync } from 'node:fs';

interface Face {
  unitsPerEm: number;
  characterSet: number[];
  hasGlyphForCodePoint(code: number): boolean;
  glyphForCodePoint(code: number): { advanceWidth: number };
}

/** Les fontes livrées, et le nom de leur table. */
const FACES: { id: string; regular: string; bold: string }[] = [
  { id: 'garamond', regular: 'EBGaramond-Regular', bold: 'EBGaramond-SemiBold' },
  { id: 'craie', regular: 'Caveat-Regular', bold: 'Caveat-Bold' },
];

/**
 * Caractères que la typographie française emploie et qu'une fonte d'affichage
 * peut ne pas porter. Le script relève ceux qui **manquent** ; `measure.ts`
 * les remplace alors partout, à l'écran comme à l'impression.
 *
 * Ce n'est pas une liste de commodité : sans elle, « 3 000 001 av. J.-C. »
 * mesuré avec l'espace fine se dessinait avec le glyphe manquant, plus large
 * de moitié — la mesure et le rendu ne parlaient plus de la même chaîne.
 */
const RISKY = ['ᵉ', 'ʳ', '\u202F', '\u00A0', '–', '—', '…', '’', '«', '»', 'œ', 'Œ', 'æ', 'Æ'];

function load(name: string): Face {
  return fontkit.create(readFileSync(`assets/fonts/${name}.ttf`));
}

/** Chasse de chaque caractère de la fonte, en em, arrondie au dix-millième. */
function widths(face: Face): Map<string, number> {
  const table = new Map<string, number>();
  for (const code of face.characterSet) {
    // On ignore les caractères de contrôle : ils ne s'écrivent pas.
    if (code < 0x20 && code !== 0x09) continue;
    if (!face.hasGlyphForCodePoint(code)) continue;
    const em = face.glyphForCodePoint(code).advanceWidth / face.unitsPerEm;
    table.set(String.fromCodePoint(code), Number(em.toFixed(4)));
  }
  return table;
}

/**
 * Regroupe les caractères de même chasse, comme la table relevée à la main :
 * un `['aàâä', 0.5586]` se relit, huit cents lignes non.
 */
function group(table: Map<string, number>): [string, number][] {
  const byWidth = new Map<number, string[]>();
  for (const [char, em] of [...table].sort((a, b) => a[0].localeCompare(b[0], 'fr'))) {
    const bucket = byWidth.get(em);
    if (bucket) bucket.push(char); else byWidth.set(em, [char]);
  }
  return [...byWidth]
    .sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
    .map(([em, chars]) => [chars.join(''), em]);
}

/** Chasse moyenne des lettres : le repli pour un caractère hors table. */
function fallback(table: Map<string, number>): number {
  const letters = [...table].filter(([char]) => /\p{L}/u.test(char)).map(([, em]) => em);
  return Number((letters.reduce((sum, em) => sum + em, 0) / Math.max(letters.length, 1)).toFixed(4));
}

const blocks = FACES.map(({ id, regular, bold }) => {
  const faces = { regular: load(regular), bold: load(bold) };
  const tables = { regular: widths(faces.regular), bold: widths(faces.bold) };
  // Une fonte à deux graisses peut différer d'une graisse à l'autre : un
  // caractère manquant dans l'une seulement doit être remplacé dans les deux.
  const missing = RISKY.filter((char) =>
    !faces.regular.hasGlyphForCodePoint(char.codePointAt(0) as number)
    || !faces.bold.hasGlyphForCodePoint(char.codePointAt(0) as number));
  const entries = (which: 'regular' | 'bold'): string =>
    group(tables[which]).map(([chars, em]) => `      [${JSON.stringify(chars)}, ${em}],`).join('\n');
  return `  ${id}: {
    missing: ${JSON.stringify(missing.join(''))},
    fallback: ${fallback(tables.regular)},
    regular: [
${entries('regular')}
    ],
    bold: [
${entries('bold')}
    ],
  },`;
}).join('\n');

const source = `/**
 * Chasses des polices livrées — **fichier engendré par \`pnpm metrics\`**.
 * Ne pas modifier à la main : relancez le script après tout changement de
 * sous-ensemble ou de fonte.
 *
 * Les valeurs sont en em, relevées dans les fichiers de \`assets/fonts/\`, ceux
 * que le navigateur affiche et que le PDF incorpore : la table est donc juste
 * par construction, à la crénelure près — laquelle ne fait que resserrer le
 * texte, donc jamais déborder.
 */

export interface GeneratedFace {
  /**
   * Caractères de la typographie française que cette fonte **ne porte pas**.
   * \`measure.ts\` les remplace par un équivalent sûr, dans la mesure comme
   * dans le rendu, pour que les deux parlent de la même chaîne.
   */
  missing: string;
  /** chasse moyenne des lettres, pour un caractère hors table */
  fallback: number;
  /** groupes [caractères, chasse en em] */
  regular: readonly (readonly [string, number])[];
  bold: readonly (readonly [string, number])[];
}

export const GENERATED_FACES: Record<string, GeneratedFace> = {
${blocks}
};
`;

writeFileSync('src/layout/faceMetrics.ts', source);
console.log(`src/layout/faceMetrics.ts écrit (${FACES.map((f) => f.id).join(', ')})`);
