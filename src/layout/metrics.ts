/**
 * Constantes géométriques de la frise.
 *
 * Les valeurs venues de DESIGN.md §4 y renvoient explicitement ; celles que la
 * spécification ne fixe pas sont dérivées et consignées dans
 * docs/spec-gaps.md §3.
 */

/* ---- axe et coupures (DESIGN.md §4) ---- */

/** Largeur du vide laissé dans la ligne de base entre deux segments. */
export const COUPURE_GAP = 14;

/** Une coupure ne s'affiche que si les densités diffèrent de plus de 1,25× (format.md §3). */
export const COUPURE_DENSITY_RATIO = 1.25;

/** Épaisseur de la ligne de base. */
export const BASELINE_WIDTH = 1.5;

export const TICK_MAJOR_HEIGHT = 10;
export const TICK_MINOR_HEIGHT = 5;
/** Écart entre une graduation majeure et son libellé. */
export const TICK_LABEL_GAP = 6;

/* ---- graduations : seuils de densité (docs/spec-gaps.md §2) ---- */

/** Largeur minimale d'un pas majeur : « 3000 av. J.-C. » en 11 px + marge. */
export const MIN_MAJOR_STEP_PX = 72;
/** En deçà, les graduations mineures deviennent du bruit. */
export const MIN_MINOR_STEP_PX = 8;
/** DESIGN.md §4 : jamais plus de 10 mineures entre deux majeures. */
export const MAX_MINOR_PER_MAJOR = 10;

/* ---- bandes et empilement (docs/spec-gaps.md §3) ---- */

export const CANVAS_PADDING = 24;
export const LANE_HEIGHT = 120;
export const LANE_LABEL_HEIGHT = 16;
/** Hauteur d'une rangée par défaut ; une bande adopte celle de son plus grand élément. */
export const ROW_HEIGHT = 28;
export const ROW_GAP = 4;

/** Hauteur d'une barre de période (DESIGN.md §4). */
export const PERIOD_BAR_HEIGHT = 24;
/** Diamètre de la pastille d'ancrage d'un événement (DESIGN.md §4). */
export const EVENT_DOT_SIZE = 7;
/** Hauteur d'une puce de libellé seul (3 px + 13 px × 1,2 + 3 px). */
export const EVENT_CHIP_HEIGHT = 22;
/** Puce avec la date sur une deuxième ligne (DESIGN.md §4). */
export const EVENT_CHIP_HEIGHT_WITH_DATE = 35;
/** Puce avec image : vignette de 40 px + 4 px de marge (DESIGN.md §4). */
export const EVENT_CARD_HEIGHT = 48;
export const EVENT_IMAGE_SIZE = 40;

/** Hauteur de la zone réservée à l'axe et à ses libellés, sous les bandes. */
export const AXIS_BAND_HEIGHT = 40;
