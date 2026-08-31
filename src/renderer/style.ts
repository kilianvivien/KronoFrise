/**
 * Styles du rendu SVG — DESIGN.md §2 et §4.
 *
 * Le rendu n'utilise que des jetons (`var(--…)`) et les couleurs dérivées de
 * `palette.ts` : aucun hexadécimal ici. Les styles sont écrits en ligne plutôt
 * qu'en classes CSS pour que `renderToSvgString` produise exactement la même
 * image sans dépendre d'une feuille externe (docs/format.md §9).
 */
import type { CSSProperties } from 'react';
import { MASK_DASH } from './shapes';

export const FONT_UI = 'var(--font-ui)';
export const FS_UI = 13;
export const FS_CAPTION = 11;

export const baselineStyle: CSSProperties = {
  stroke: 'var(--text-primary)',
  strokeWidth: 1.5,
  strokeLinecap: 'butt',
};

export const tickMajorStyle: CSSProperties = {
  stroke: 'var(--text-primary)',
  strokeWidth: 1,
};

export const tickMinorStyle: CSSProperties = {
  stroke: 'var(--text-tertiary)',
  strokeWidth: 1,
};

export const tickLabelStyle: CSSProperties = {
  fill: 'var(--text-secondary)',
  fontFamily: FONT_UI,
  fontSize: FS_CAPTION,
  fontVariantNumeric: 'tabular-nums',
  textAnchor: 'middle',
};

/** Élément masqué (fiche élève) — DESIGN.md §5 : papier, bord 1 px en tirets. */
export const maskedChipStyle = {
  stroke: 'var(--text-tertiary)',
  strokeDasharray: MASK_DASH,
} as const;

export const coupureStyle: CSSProperties = {
  stroke: 'var(--text-secondary)',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
};

export const laneNameStyle: CSSProperties = {
  fill: 'var(--text-tertiary)',
  fontFamily: FONT_UI,
  fontSize: FS_CAPTION,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

export const laneBoundaryStyle: CSSProperties = {
  stroke: 'var(--paper-line)',
  strokeWidth: 1,
};

export function chipTextStyle(color: string): CSSProperties {
  return {
    fill: color,
    fontFamily: FONT_UI,
    fontSize: FS_UI,
    fontWeight: 500,
  };
}

export function chipDateStyle(color: string): CSSProperties {
  return {
    fill: color,
    fontFamily: FONT_UI,
    fontSize: FS_CAPTION,
    fontVariantNumeric: 'tabular-nums',
    opacity: 0.7,
  };
}

export function periodLabelStyle(color: string): CSSProperties {
  return {
    fill: color,
    fontFamily: FONT_UI,
    fontSize: FS_UI,
    fontWeight: 600,
    textAnchor: 'middle',
  };
}

export function periodDatesStyle(color: string): CSSProperties {
  return {
    fill: color,
    fontFamily: FONT_UI,
    fontSize: FS_CAPTION,
    fontVariantNumeric: 'tabular-nums',
    opacity: 0.75,
    textAnchor: 'end',
  };
}
