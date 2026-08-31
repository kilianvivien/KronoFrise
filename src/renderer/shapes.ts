/**
 * Géométrie et constantes de dessin, partagées par tous les rendus.
 *
 * Règle de fidélité (docs/format.md §9) : l'écran, le SVG, le PNG et le PDF
 * dessinent la même scène. Les formes vivent donc **ici**, en fonctions pures,
 * et non dans un composant : l'exporteur PDF appelle exactement les mêmes.
 * Aucune de ces valeurs n'est décidée deux fois.
 */
import type { FillStyle } from '../core/types';

/* ---- puces et cartes d'événement (DESIGN.md §4) ---- */
export const CHIP_RADIUS = 5;
export const CARD_RADIUS = 8;
export const CHIP_PADDING_X = 8;
export const CONNECTOR_OPACITY = 0.5;
/** Trait 2-4 pour les dates approximatives (DESIGN.md §4). */
export const CIRCA_DASH = '2 4';
/** Ligne de base du libellé dans une puce, selon qu'elle porte une date. */
export function chipLabelBaseline(chipY: number, chipHeight: number, showDate: boolean): number {
  return chipY + (showDate ? 15 : chipHeight / 2 + 4);
}
export function chipDateBaseline(chipY: number): number {
  return chipY + 29;
}

/* ---- périodes ---- */
export const BAR_RADIUS = 4;
/** Longueur du fondu d'un bord flou (DESIGN.md §4). */
export const FUZZY_LENGTH = 24;
/** Retour vers le bas aux extrémités d'une accolade. */
export const BRACKET_DROP = 6;
/** Pointe d'une période « flèche ». */
export const ARROW_HEAD = 10;
export const PERIOD_LABEL_PADDING = 8;

export function arrowPath(x: number, y: number, width: number, height: number): string {
  const body = Math.max(width - ARROW_HEAD, 1);
  return `M ${x} ${y} H ${x + body} L ${x + width} ${y + height / 2} L ${x + body} ${y + height} H ${x} Z`;
}

export function bracketPath(x0: number, x1: number, top: number): string {
  return `M ${x0} ${top + BRACKET_DROP} V ${top} H ${x1} V ${top + BRACKET_DROP}`;
}

/* ---- fiche élève (DESIGN.md §5) ---- */
export const MASK_DASH = '3 3';
/** La ligne à compléter passe juste sous la ligne de base du texte. */
export const MASK_BASELINE_DROP = 3;

/* ---- bandes (DESIGN.md §4) ---- */
export const STRIPE_OPACITY = 0.35;
export const LANE_COLOR_OPACITY = 0.07;
export const LANE_NAME_BASELINE = 12;

/* ---- coupure ⫽ (DESIGN.md §4) ---- */
/** Inclinaison du glyphe : 20° depuis la verticale. */
const COUPURE_SLANT = Math.tan((20 * Math.PI) / 180);
/** Le glyphe déborde de 8 px de part et d'autre de la ligne de base. */
const COUPURE_OVERHANG = 8;
/** Écart entre les deux traits du glyphe. */
const COUPURE_SPACING = 5;

export interface Segment2D { x1: number; y1: number; x2: number; y2: number }

export function coupureStrokes(x: number, y: number): Segment2D[] {
  const dx = COUPURE_OVERHANG * COUPURE_SLANT;
  return [-COUPURE_SPACING / 2, COUPURE_SPACING / 2].map((offset) => ({
    x1: x + offset - dx,
    y1: y + COUPURE_OVERHANG,
    x2: x + offset + dx,
    y2: y - COUPURE_OVERHANG,
  }));
}

/* ---- libellés de la règle ---- */
/**
 * Un libellé posé en bord de canevas se cale contre le bord au lieu d'être
 * coupé en deux : sans cela, la date de début d'un segment très comprimé
 * (« 3 000 000 av. J.-C. ») serait invisible.
 */
export const EDGE_ZONE = 48;

export function tickAnchor(x: number, width: number): 'start' | 'middle' | 'end' {
  if (x < EDGE_ZONE) return 'start';
  if (x > width - EDGE_ZONE) return 'end';
  return 'middle';
}

export function clampTickLabelX(x: number, width: number): number {
  if (x < EDGE_ZONE) return Math.max(x, 2);
  if (x > width - EDGE_ZONE) return Math.min(x, width - 2);
  return x;
}

/* ---- motifs de remplissage (DESIGN.md §6, M2) ---- */
export interface PatternTile {
  size: number;
  /** traits du motif, en coordonnées de la tuile */
  strokes: string[];
  strokeOpacity: number;
  /** pastilles du motif « points » */
  dot?: { cx: number; cy: number; r: number; opacity: number };
}

const TILES: Record<string, PatternTile> = {
  hatch: { size: 8, strokes: ['M-2 2L2-2 M0 8L8 0 M6 10L10 6'], strokeOpacity: 0.3 },
  crosshatch: { size: 10, strokes: ['M-2 2L2-2 M0 10L10 0 M8 12L12 8 M-2 8L2 12 M0 0L10 10 M8-2L12 2'], strokeOpacity: 0.3 },
  lines: { size: 8, strokes: ['M0 4H8'], strokeOpacity: 0.3 },
  grid: { size: 10, strokes: ['M0 5H10 M5 0V10'], strokeOpacity: 0.3 },
  dots: { size: 8, strokes: [], strokeOpacity: 0.3, dot: { cx: 4, cy: 4, r: 1.1, opacity: 0.38 } },
};

/** `undefined` pour les styles sans motif : teinte, plein, sans fond. */
export function patternTile(style: FillStyle | undefined): PatternTile | undefined {
  return style === undefined ? undefined : TILES[style];
}
