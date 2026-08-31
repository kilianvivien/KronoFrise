import { contrastText, mix, readableInk, resolveBase, tint } from '../shared/palette';
import { resolveToken } from '../ui/tokenValues';
import type { Theme } from '../themes';
export function themeColors(color: string, theme: Theme) {
  const source = resolveBase(color), paper = resolveToken(theme.paper);
  if (theme.id === 'journal') return { base: resolveToken(theme.axisInk), fill: paper, text: resolveToken(theme.axisInk) };
  if (theme.id === 'craie') return { base: mix(source, resolveToken(theme.axisInk), .65), fill: mix(source, paper, .8), text: resolveToken(theme.axisInk) };
  if (theme.id === 'parchemin') { const fill = mix(source, paper, .88); return { base: source, fill, text: readableInk(source, fill) }; }
  // Frise officielle : des bandes franchement colorées, comme sur les frises
  // des programmes, et non la teinte légère du manuel. Le texte suit le
  // contraste réel du remplissage, jamais une couleur choisie à l'œil.
  if (theme.id === 'officielle') {
    const fill = mix(source, paper, .3);
    return { base: mix(source, resolveToken(theme.axisInk), .2), fill, text: contrastText(fill) };
  }
  // Tableau blanc : la saturation d'un feutre sur un papier froid. Le
  // remplissage doit franchement se distinguer de la teinte légère du manuel,
  // sans quoi les deux thèmes se ressemblent.
  if (theme.id === 'tableau') { const fill = mix(source, paper, .62); return { base: mix(source, resolveToken(theme.axisInk), .15), fill, text: readableInk(source, fill) }; }
  return { base: source, fill: tint(source), text: readableInk(source, tint(source)) };
}
