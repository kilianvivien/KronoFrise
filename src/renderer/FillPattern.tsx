import type { JSX } from 'react';
import type { FillStyle } from '../core/types';
import type { Theme } from '../themes';
import { contrastText } from '../shared/palette';
import { patternTile } from './shapes';
import { themeColors } from './themeColors';

export function fillPaint(color: string, theme: Theme, style: FillStyle = 'tint', id: string) {
  const colors = themeColors(color, theme);
  if (style === 'solid') return { ...colors, fill: colors.base, text: contrastText(colors.base) };
  if (style === 'none') return { ...colors, fill: 'transparent' };
  if (style !== 'tint') return { ...colors, fill: `url(#${id})` };
  return colors;
}
/** Shared by document drawing and inspector previews. No bitmap or external assets. */
export function FillPattern({ id, style = 'tint', color, theme }: { id: string; style?: FillStyle; color: string; theme: Theme }): JSX.Element | null {
  const tile = patternTile(style);
  if (tile === undefined) return null;
  const { base, fill } = themeColors(color, theme);
  return <defs><pattern id={id} patternUnits="userSpaceOnUse" width={tile.size} height={tile.size}>
    <rect width={tile.size} height={tile.size} fill={fill} />
    <g stroke={base} strokeWidth={1} strokeOpacity={tile.strokeOpacity} fill="none">
      {tile.strokes.map((d) => <path key={d} d={d} />)}
    </g>
    {tile.dot && <circle cx={tile.dot.cx} cy={tile.dot.cy} r={tile.dot.r} fill={base} opacity={tile.dot.opacity} />}
  </pattern></defs>;
}
