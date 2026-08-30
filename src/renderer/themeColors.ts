import { ink, mix, resolveBase, tint } from '../shared/palette';
import { resolveToken } from '../ui/tokenValues';
import type { Theme } from '../themes';
export function themeColors(color: string, theme: Theme) {
  const source = resolveBase(color), paper = resolveToken(theme.paper);
  if (theme.id === 'journal') return { base: resolveToken(theme.axisInk), fill: paper, text: resolveToken(theme.axisInk) };
  if (theme.id === 'craie') return { base: mix(source, resolveToken(theme.axisInk), .65), fill: mix(source, paper, .8), text: resolveToken(theme.axisInk) };
  if (theme.id === 'parchemin') return { base: source, fill: mix(source, paper, .88), text: ink(source) };
  return { base: source, fill: tint(source), text: ink(source) };
}
