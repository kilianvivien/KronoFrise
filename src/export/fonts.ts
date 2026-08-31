/**
 * Polices incorporées aux exports — PLAN.md M4 (ajout 2), validé par Kilian
 * le 31 août 2026 avec l'ajout de `@pdf-lib/fontkit` à la liste fermée de
 * §8.4.
 *
 * Pourquoi : les 14 polices standard d'un PDF sont encodées en WinAnsi, qui
 * ne contient pas « ᵉ » (U+1D49). « XVIIᵉ siècle » s'imprimait « XVIIe »
 * (docs/spec-gaps.md §8). Une police réellement incorporée règle la question.
 *
 * Le fichier est un **sous-ensemble** d'Inter (SIL OFL 1.1, voir
 * `assets/fonts/Inter-OFL.txt`) réduit au répertoire dont l'application a
 * besoin : français complet, ordinaux, ponctuation, espaces insécables —
 * 49 Ko par graisse au lieu de 300. `pdf-lib` le réduit encore à l'embarquer,
 * puisqu'il n'y met que les glyphes réellement employés.
 *
 * Inter, et pas une autre : ses chasses tiennent dans les boîtes que
 * `layout/measure.ts` a réservées avec les métriques de SF Pro Text
 * (`fonts.test.ts` le vérifie sur les quatre fixtures). Une police plus large
 * ferait déborder les libellés à l'impression sans rien changer à l'écran —
 * le défaut de docs/spec-gaps.md §12.7, mais visible seulement sur papier.
 */
import interRegular from '../../assets/fonts/Inter-Regular.ttf?inline';
import interSemiBold from '../../assets/fonts/Inter-SemiBold.ttf?inline';
import garamondRegular from '../../assets/fonts/EBGaramond-Regular.ttf?inline';
import garamondSemiBold from '../../assets/fonts/EBGaramond-SemiBold.ttf?inline';
import craieRegular from '../../assets/fonts/Caveat-Regular.ttf?inline';
import craieBold from '../../assets/fonts/Caveat-Bold.ttf?inline';
import { faceById, type FaceId } from '../shared/faces';

function decode(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Les fichiers de chaque fonte, en data URL et en octets.
 *
 * La fonte d'interface n'a pas de fichier — c'est celle du système. Inter la
 * remplace **à l'impression seulement**, parce que ses chasses tiennent dans
 * les boîtes mesurées avec les métriques de SF Pro (`fonts.test.ts`). Les
 * fontes de thème, elles, sont les mêmes à l'écran et sur le papier : la table
 * de `layout/faceMetrics.ts` est relevée dans ces fichiers.
 */
const FILES: Record<FaceId, { regular: string; bold: string; family: string }> = {
  ui: { regular: interRegular, bold: interSemiBold, family: 'Inter' },
  garamond: { regular: garamondRegular, bold: garamondSemiBold, family: 'EB Garamond' },
  craie: { regular: craieRegular, bold: craieBold, family: 'Caveat' },
};

export const EMBEDDED_FONTS = {
  /** graisse 400/500 — libellés, dates, graduations */
  regular: (face: FaceId = 'ui') => decode(FILES[face].regular),
  /** graisse 600 — libellés de période, en-têtes */
  semibold: (face: FaceId = 'ui') => decode(FILES[face].bold),
} as const;

/** Nom de la famille incorporée, pour la règle `@font-face` des SVG exportés. */
export function embeddedFamily(face: FaceId = 'ui'): string {
  return FILES[face].family;
}

/**
 * Règle `@font-face` autonome pour un SVG exporté : la police y voyage en
 * data URL, si bien que le fichier s'ouvre correctement sur une machine qui ne
 * l'a pas. Rien n'est incorporé pour la fonte d'interface — le SVG doit alors
 * suivre la police du système, comme à l'écran.
 */
export function faceFontRule(face: FaceId): string {
  if (faceById(face).table === undefined) return '';
  const files = FILES[face];
  return [400, 600].map((weight) => `@font-face{font-family:'${files.family}';font-style:normal;`
    + `font-weight:${weight === 400 ? '400 500' : '600 700'};`
    + `src:url(${weight === 400 ? files.regular : files.bold}) format('truetype');}`).join('');
}
