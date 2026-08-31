/**
 * Les 50 couleurs de MiCetF ramenées à nos 12 (docs/format.md §8.1).
 *
 * Table figée, jamais calculée à l'exécution : le rapprochement a été fait une
 * fois à la teinte (et non à la distance RVB brute, qui écrasait tous les tons
 * pâles sur la même couleur), puis corrigé à la main. Les 50 noms viennent du
 * sélecteur réel de micetf.fr/frise.
 */
import type { PaletteId } from '../../shared/palette';

export const MICETF_COLORS: Readonly<Record<string, PaletteId>> = {
  red: 'brique', lightcoral: 'brique', darksalmon: 'brique', salmon: 'brique', lightsalmon: 'ocre',
  pink: 'lie-de-vin', lightpink: 'lie-de-vin', hotpink: 'lie-de-vin',
  orange: 'ocre', coral: 'brique', darkorange: 'ocre', tomato: 'brique',
  lightyellow: 'ble', yellow: 'ble', lemonchiffon: 'ble', lightgoldenrodyellow: 'ble',
  papayawhip: 'ble', moccasin: 'ble', khaki: 'ble', gold: 'ble',
  lavender: 'encre', violet: 'prune', purple: 'prune', orchid: 'prune', fuchsia: 'prune',
  green: 'foret', mediumseagreen: 'foret', mediumaquamarine: 'canard', darkseagreen: 'olive',
  palegreen: 'foret', lightgreen: 'foret', lime: 'foret',
  blue: 'encre', cornflowerblue: 'ardoise', dodgerblue: 'ardoise', deepskyblue: 'canard',
  lightskyblue: 'ardoise', skyblue: 'ardoise', lightblue: 'ardoise',
  maroon: 'lie-de-vin', chocolate: 'terre', peru: 'terre', goldenrod: 'ocre',
  sandybrown: 'ocre', tan: 'terre',
  white: 'pierre', seashell: 'pierre', beige: 'pierre', ivory: 'pierre', linen: 'pierre',
};

/** Une couleur inconnue prend la couleur par défaut d'un nouvel élément. */
export const DEFAULT_IMPORT_COLOR: PaletteId = 'brique';

export function paletteFor(name: unknown): PaletteId {
  return typeof name === 'string'
    ? MICETF_COLORS[name.trim().toLowerCase()] ?? DEFAULT_IMPORT_COLOR
    : DEFAULT_IMPORT_COLOR;
}
