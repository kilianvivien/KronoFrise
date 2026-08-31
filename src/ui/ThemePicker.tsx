/**
 * Choix du thème du document : des aperçus plutôt qu'une liste déroulante.
 *
 * Chaque carte montre le vrai papier du thème, sa ligne de base et une barre
 * de période, avec les couleurs résolues depuis `tokens.css` — ce que l'on
 * voit dans la carte est ce que l'on obtient sur la frise.
 */
import type { JSX } from 'react';
import { THEMES, type Theme } from '../themes';
import { themeColors } from '../renderer/themeColors';
import { resolveToken } from './tokenValues';
import { M2 } from './strings';

export function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }): JSX.Element {
  return <fieldset className="themeGrid">
    <legend className="srOnly">{M2.theme}</legend>
    {THEMES.map((theme) => <button key={theme.id} type="button" className="themeCard"
      aria-pressed={value === theme.id} onClick={() => onChange(theme.id)}>
      <Preview theme={theme} />
      <span>{theme.name}</span>
    </button>)}
  </fieldset>;
}

function Preview({ theme }: { theme: Theme }): JSX.Element {
  const period = themeColors('brique', theme);
  const event = themeColors('ardoise', theme);
  return <svg viewBox="0 0 96 44" aria-hidden="true">
    <rect width={96} height={44} rx={4} fill={resolveToken(theme.paper)} />
    <rect x={8} y={9} width={46} height={9} rx={2} fill={period.fill} stroke={period.base} strokeWidth={1} />
    <rect x={30} y={22} width={34} height={8} rx={2} fill={event.fill} stroke={event.base} strokeWidth={1} />
    <line x1={6} y1={36} x2={90} y2={36} stroke={resolveToken(theme.axisInk)} strokeWidth={1.25} />
    {[14, 30, 46, 62, 78].map((x) => <line key={x} x1={x} y1={36} x2={x} y2={39.5} stroke={resolveToken(theme.rulerInkMinor)} strokeWidth={1} />)}
  </svg>;
}
