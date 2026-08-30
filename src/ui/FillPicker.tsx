import { useId, type JSX } from 'react';
import { FILL_STYLES, type FillStyle } from '../core/types';
import type { Theme } from '../themes';
import { FillPattern, fillPaint } from '../renderer/FillPattern';
import { resolveToken } from './tokenValues';
import { FILLS } from './strings';
import styles from './FillPicker.module.css';

export function FillPicker({ value, color, theme, onChange, disabled = false }: { value: FillStyle | null; color: string; theme: Theme; onChange: (style: FillStyle) => void; disabled?: boolean }): JSX.Element {
  return <fieldset className={styles.picker} disabled={disabled}><legend>{FILLS.title}</legend>
    <div className={styles.grid}>{FILL_STYLES.map((style) => <button key={style} type="button" aria-label={FILLS[style]} aria-pressed={value === style} title={FILLS[style]} onClick={() => onChange(style)}>
      <Swatch style={style} color={color} theme={theme} /><span>{FILLS[style]}</span>
    </button>)}</div>
    {value === null && <p>{FILLS.mixed}</p>}
  </fieldset>;
}
function Swatch({ style, color, theme }: { style: FillStyle; color: string; theme: Theme }): JSX.Element {
  const id = `fill-preview-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { base, fill } = fillPaint(color, theme, style, id);
  return <svg viewBox="0 0 56 24" width="56" height="24" aria-hidden="true">
    <FillPattern id={id} style={style} color={color} theme={theme} />
    <rect width={56} height={24} rx={4} fill={resolveToken(theme.paper)} />
    <rect x={1} y={1} width={54} height={22} rx={3} fill={fill} stroke={base} />
  </svg>;
}
