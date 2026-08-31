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
import regular from '../../assets/fonts/Inter-Regular.ttf?inline';
import semibold from '../../assets/fonts/Inter-SemiBold.ttf?inline';

function decode(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const EMBEDDED_FONTS = {
  /** graisse 400/500 — libellés, dates, graduations */
  regular: () => decode(regular),
  /** graisse 600 — libellés de période, en-têtes */
  semibold: () => decode(semibold),
} as const;

/** Nom de la famille incorporée, pour la règle `@font-face` des SVG exportés. */
export const EMBEDDED_FAMILY = 'Inter';
