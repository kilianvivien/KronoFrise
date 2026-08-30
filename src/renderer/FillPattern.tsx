import type { JSX } from 'react';
import type { FillStyle } from '../core/types';
import type { Theme } from '../themes';
import { contrastText } from '../shared/palette';
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
  if (style === 'tint' || style === 'solid' || style === 'none') return null;
  const { base, fill } = themeColors(color, theme);
  const size = style === 'crosshatch' || style === 'grid' ? 10 : 8;
  return <defs><pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size}>
    <rect width={size} height={size} fill={fill} />
    <g stroke={base} strokeWidth={1} strokeOpacity={.3} fill="none">
      {style === 'hatch' && <path d="M-2 2L2-2 M0 8L8 0 M6 10L10 6" />}
      {style === 'crosshatch' && <path d="M-2 2L2-2 M0 10L10 0 M8 12L12 8 M-2 8L2 12 M0 0L10 10 M8-2L12 2" />}
      {style === 'lines' && <path d="M0 4H8" />}
      {style === 'grid' && <path d="M0 5H10 M5 0V10" />}
    </g>
    {style === 'dots' && <circle cx={4} cy={4} r={1.1} fill={base} opacity={.38} />}
  </pattern></defs>;
}
