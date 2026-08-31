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

/* ---- dégradé (PLAN.md M4, ajout 3) ---- */

/**
 * Nombre de bandes de l'approximation PDF.
 *
 * Le SVG reçoit un vrai `linearGradient` ; le PDF n'a pas de primitive de
 * dégradé accessible depuis pdf-lib, et le rend donc en **16 bandes de la même
 * géométrie**, découpées sur la forme exacte. L'écart est spécifié — il figure
 * dans la boîte d'export — plutôt que découvert à l'impression.
 */
export const GRADIENT_BANDS = 16;

/**
 * Les couches de l'approximation, de la plus large à la plus étroite.
 *
 * Le PDF ne sait pas découper sur une forme sans reconstruire son chemin
 * (`drawSvgPath` referme son propre état graphique). L'approximation est donc
 * un **empilement** : on peint d'abord la forme entière dans la teinte la plus
 * soutenue, puis des copies de plus en plus courtes par-dessus, de plus en
 * plus claires. La tranche visible entre deux couches est exactement une
 * bande du dégradé, et la silhouette reste celle de la forme réelle — c'est
 * la couche du dessous qui la donne.
 *
 * Fonction pure et partagée : l'exporteur la dessine, le test la vérifie, et
 * personne ne recalcule des seizièmes dans son coin.
 */
export function gradientLayers(count = GRADIENT_BANDS): { width: number; mix: number; full: boolean }[] {
  return Array.from({ length: count }, (_value, index) => {
    const layer = count - index;
    return {
      /** fraction de la largeur totale couverte par cette couche */
      width: layer / count,
      /** position dans le dégradé, prise au milieu de la tranche visible */
      mix: (layer - 0.5) / count,
      /** la couche du dessous porte la vraie forme (coins, pointe de flèche) */
      full: layer === count,
    };
  });
}

/**
 * Rectangle arrondi **à gauche seulement** — les couches intermédiaires du
 * dégradé. Leur bord droit doit être franc : arrondi, il laisserait un feston
 * clair à chaque jointure de bande.
 */
export function leftRoundedPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width, height / 2));
  return `M ${x + r} ${y} H ${x + width} V ${y + height} H ${x + r}`
    + ` A ${r} ${r} 0 0 1 ${x} ${y + height - r}`
    + ` V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}
