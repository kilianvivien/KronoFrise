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
import { TITLE_FONT_SIZE, TITLE_META_SIZE, TITLE_SUBTITLE_SIZE } from '../layout/metrics';

export const FONT_UI = 'var(--font-ui)';
/**
 * Typographie du **document**. `Frise` pose `--font-doc` d'après la fonte du
 * thème ; à défaut, on retombe sur celle de l'interface. Passer par une
 * variable évite de faire descendre le thème jusque dans chaque style, et vaut
 * aussi bien à l'écran que dans le SVG exporté, où la variable est écrite en
 * ligne sur la balise `<svg>`.
 */
export const FONT_DOC = 'var(--font-doc, var(--font-ui))';
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
  fontFamily: FONT_DOC,
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
  fontFamily: FONT_DOC,
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
    fontFamily: FONT_DOC,
    fontSize: FS_UI,
    fontWeight: 500,
  };
}

export function chipDateStyle(color: string): CSSProperties {
  return {
    fill: color,
    fontFamily: FONT_DOC,
    fontSize: FS_CAPTION,
    fontVariantNumeric: 'tabular-nums',
    opacity: 0.7,
  };
}

export function periodLabelStyle(color: string): CSSProperties {
  return {
    fill: color,
    fontFamily: FONT_DOC,
    fontSize: FS_UI,
    fontWeight: 600,
    textAnchor: 'middle',
  };
}

export function periodDatesStyle(color: string): CSSProperties {
  return {
    fill: color,
    fontFamily: FONT_DOC,
    fontSize: FS_CAPTION,
    fontVariantNumeric: 'tabular-nums',
    opacity: 0.75,
    textAnchor: 'end',
  };
}

/* ---- bloc de titre (PLAN.md M4, ajout 4) ---- */

/**
 * La typographie du bloc suit le thème : les jetons `--text-*` sont
 * redéfinis sur le `<svg>` par les couleurs du thème (voir `Frise`), si bien
 * qu'un titre posé sur *Craie* s'écrit à la craie sans règle propre.
 */
export const titleStyle: CSSProperties = {
  fill: 'var(--text-primary)',
  fontFamily: FONT_DOC,
  fontSize: TITLE_FONT_SIZE,
  fontWeight: 600,
};

export const titleSubtitleStyle: CSSProperties = {
  fill: 'var(--text-secondary)',
  fontFamily: FONT_DOC,
  fontSize: TITLE_SUBTITLE_SIZE,
};

export const titleMetaStyle: CSSProperties = {
  fill: 'var(--text-tertiary)',
  fontFamily: FONT_DOC,
  fontSize: TITLE_META_SIZE,
  fontVariantNumeric: 'tabular-nums',
};
