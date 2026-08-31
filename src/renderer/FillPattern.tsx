import type { JSX } from 'react';
import type { FillStyle } from '../core/types';
import type { Theme } from '../themes';
import { contrastRatio, contrastText, mix, resolveBase } from '../shared/palette';
import { patternTile } from './shapes';
import { themeColors } from './themeColors';

/**
 * Les deux extrémités d'un remplissage en dégradé — PLAN.md M4 (ajout 3) :
 * « la couleur de l'élément qui s'estompe le long de la barre ».
 *
 * Le dégradé va de la teinte légère du thème à une version soutenue, jamais
 * jusqu'à la couleur pleine : le libellé doit rester lisible **d'un bout à
 * l'autre**. L'encre est donc calculée contre l'extrémité la plus soutenue,
 * le pire cas ; à l'autre bout, elle contraste encore davantage.
 */
export function gradientPaint(color: string, theme: Theme) {
  const source = resolveBase(color);
  const { fill: from, text } = themeColors(color, theme);
  // Le libellé traverse toute la barre : plutôt que de chercher une encre qui
  // tienne sur deux arrêts choisis d'avance — impossible quand ils encadrent
  // la luminance moyenne —, on garde **l'encre du thème**, déjà validée sur
  // son remplissage, et l'on pousse le second arrêt vers la couleur pleine
  // aussi loin que la lisibilité le permet. Le dégradé est donc franc sur un
  // thème à remplissage clair, discret sur « Frise officielle » qui colore
  // déjà fort — et lisible dans les deux cas, par construction.
  let to = from;
  for (let step = 1; step <= GRADIENT_MAX_STEPS; step++) {
    const candidate = mix(from, source, (step / GRADIENT_MAX_STEPS) * GRADIENT_REACH);
    if (contrastRatio(text, candidate) < AA_CONTRAST) break;
    to = candidate;
  }
  return { from, to, text };
}

/** Poussée maximale vers la couleur pleine, et finesse de la recherche. */
const GRADIENT_REACH = 0.45;
const GRADIENT_MAX_STEPS = 9;
/** Seuil WCAG AA pour du texte courant (DESIGN.md §7). */
const AA_CONTRAST = 4.5;

export function fillPaint(color: string, theme: Theme, style: FillStyle = 'tint', id: string) {
  const colors = themeColors(color, theme);
  if (style === 'solid') return { ...colors, fill: colors.base, text: contrastText(colors.base) };
  if (style === 'none') return { ...colors, fill: 'transparent' };
  if (style === 'gradient') return { ...colors, fill: `url(#${id})`, text: gradientPaint(color, theme).text };
  if (style !== 'tint') return { ...colors, fill: `url(#${id})` };
  return colors;
}
/** Shared by document drawing and inspector previews. No bitmap or external assets. */
export function FillPattern({ id, style = 'tint', color, theme }: { id: string; style?: FillStyle; color: string; theme: Theme }): JSX.Element | null {
  if (style === 'gradient') {
    // Un vrai dégradé SVG : c'est le PDF, sans primitive équivalente, qui
    // l'approche en bandes (renderer/shapes.ts).
    const { from, to } = gradientPaint(color, theme);
    return <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient></defs>;
  }
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
