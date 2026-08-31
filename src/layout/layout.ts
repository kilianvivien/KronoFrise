/**
 * Moteur de mise en page : `Document → SceneGraph` (PLAN.md §4.3, problème 2).
 *
 * Empilement glouton déterministe, bande par bande : les éléments sont triés
 * par date de début puis posés dans la première rangée libre. Un élément
 * « épinglé » (`pinnedRow`) devient un obstacle fixe autour duquel les autres
 * s'écoulent. Objectif de vitesse : la mise en page tourne à chaque image de
 * glissement (< 5 ms pour 500 éléments, cf. layout.bench.test.ts).
 */
import { formatDate, formatYear, toFractionalYear } from '../core/dates';
import { itemStart, maskOf } from '../core/document';
import { hides } from '../core/pedagogy';
import type { EventItem, Item, KronoDocument, Lane, MaskKind, PeriodItem } from '../core/types';
import { approximateMeasurer, cachedMeasurer, type Measurer } from './measure';
import {
  AXIS_BAND_HEIGHT,
  CANVAS_PADDING,
  MASK_LINE_MIN_WIDTH,
  EVENT_CARD_HEIGHT,
  EVENT_CHIP_HEIGHT,
  EVENT_CHIP_HEIGHT_WITH_DATE,
  EVENT_IMAGE_SIZE,
  LANE_HEIGHT,
  LANE_LABEL_HEIGHT,
  PERIOD_BAR_HEIGHT,
  ROW_GAP,
  ROW_HEIGHT,
} from './metrics';
import type { Scale } from './scale';
import { chooseStep } from './ticks';
import type {
  SceneAxisSegment,
  SceneCoupure,
  SceneEvent,
  SceneGraph,
  SceneLane,
  ScenePeriod,
} from './scene';

export interface LayoutOptions {
  measurer?: Measurer;
  /** hauteur disponible ; la scène peut la dépasser (défilement vertical) */
  height?: number;
  /**
   * Mode fiche élève : les masques de `doc.pedagogy` deviennent des lignes à
   * compléter (docs/format.md §5). Le corrigé, c'est la même scène sans ce
   * drapeau.
   */
  worksheet?: boolean;
}

/** Taille de police des libellés sur le canevas (DESIGN.md §2 : --fs-ui). */
const LABEL_FONT_SIZE = 13;
const CAPTION_FONT_SIZE = 11;
/** Rembourrage horizontal d'une puce (DESIGN.md §4 : 3px 8px). */
const CHIP_PADDING_X = 8;
/** Écart minimal entre deux éléments d'une même rangée. */
const ITEM_GAP = 8;
/** Écart minimal entre le libellé d'une barre et ses dates. */
const PERIOD_DATES_GAP = 16;
/** Marge intérieure d'une barre pour y loger le libellé. */
const PERIOD_LABEL_PADDING = 16;
/** En deçà de cette densité, la date sous la puce devient illisible : on la cache. */
const MAX_YEAR_STEP_FOR_DATES = 10;
const BRACKET_LABEL_HEIGHT = 20;

export function layout(doc: KronoDocument, scale: Scale, options: LayoutOptions = {}): SceneGraph {
  const measurer = cachedMeasurer(options.measurer ?? approximateMeasurer);
  const masks = options.worksheet === true ? maskLookup(doc) : undefined;
  const lanes: SceneLane[] = [];
  const events: SceneEvent[] = [];
  const periods: ScenePeriod[] = [];

  // 1) Empiler chaque bande et mesurer la hauteur qu'elle réclame.
  const placedLanes = doc.lanes.map((lane) => {
    const placed = lane.collapsed ? { events: [], periods: [], rows: 0, rowHeight: ROW_HEIGHT } : layoutLane(doc, lane, scale, measurer, masks);
    const contentHeight = placed.rows * (placed.rowHeight + ROW_GAP);
    return {
      lane,
      placed,
      height: lane.collapsed ? 32 : Math.max(LANE_HEIGHT, LANE_LABEL_HEIGHT + contentHeight + ROW_GAP),
    };
  });

  // 2) S'il reste de la place, la partager entre les bandes plutôt que de
  //    laisser l'axe flotter au milieu d'un canevas vide.
  const needed =
    CANVAS_PADDING * 2 + AXIS_BAND_HEIGHT + placedLanes.reduce((sum, entry) => sum + entry.height, 0);
  const spare = Math.max((options.height ?? 0) - needed, 0);
  const expanded = placedLanes.filter((entry) => !entry.lane.collapsed).length;
  const bonus = expanded ? spare / expanded : 0;

  let y = CANVAS_PADDING;
  placedLanes.forEach((entry, index) => {
    const height = entry.height + (entry.lane.collapsed ? 0 : bonus);
    const anchorY = y + height;

    for (const event of entry.placed.events) {
      events.push(finishEvent(event, anchorY, entry.placed.rowHeight));
    }
    for (const period of entry.placed.periods) {
      periods.push(finishPeriod(period, anchorY, entry.placed.rowHeight));
    }

    lanes.push({
      id: entry.lane.id,
      name: entry.lane.name,
      ...(entry.lane.color ? { color: entry.lane.color } : {}),
      y,
      height,
      anchorY,
      rows: entry.placed.rows,
      striped: index % 2 === 1,
    });
    y = anchorY;
  });

  const baselineY = y;
  const height = Math.max(options.height ?? 0, baselineY + AXIS_BAND_HEIGHT + CANVAS_PADDING);
  const coupures: SceneCoupure[] = scale.coupures.map((coupure) => ({
    x: coupure.x - scale.pan,
    width: coupure.width,
    top: CANVAS_PADDING,
    bottom: baselineY,
  }));

  const axisSegments: SceneAxisSegment[] = scale.segments.map((segment) => ({
    index: segment.index,
    x0: segment.x0 - scale.pan,
    x1: segment.x1 - scale.pan,
  }));

  return {
    width: scale.width,
    height,
    baselineY,
    lanes,
    events,
    periods,
    ticks: scale.visibleTicks(undefined, measurer),
    coupures,
    axisSegments,
  };
}

/* ------------------------------------------------------------------ */
/* Empilement                                                          */
/* ------------------------------------------------------------------ */

interface PlacedEvent {
  item: EventItem;
  x: number;
  chipWidth: number;
  chipHeight: number;
  row: number;
  showDate: boolean;
  dateLabel: string;
  labelWidth: number;
  dateWidth: number;
  mask?: MaskKind;
}

interface PlacedPeriod {
  item: PeriodItem;
  x0: number;
  x1: number;
  row: number;
  labelWidth: number;
  datesWidth: number;
  mask?: MaskKind;
}

interface LaneLayout {
  events: PlacedEvent[];
  periods: PlacedPeriod[];
  rows: number;
  /** toutes les rangées d'une bande ont la hauteur de son plus grand élément */
  rowHeight: number;
}

interface Box {
  left: number;
  right: number;
  row: number;
}

/** Masques du document, indexés par élément — seulement en fiche élève. */
function maskLookup(doc: KronoDocument): Map<string, MaskKind> {
  const masks = new Map<string, MaskKind>();
  for (const item of doc.items) {
    const hide = maskOf(doc, item.id);
    if (hide !== undefined) masks.set(item.id, hide);
  }
  return masks;
}

/** Le masque n'apparaît dans la scène que s'il existe (`exactOptionalPropertyTypes`). */
function maskOf_(masks: Map<string, MaskKind> | undefined, itemId: string): { mask?: MaskKind } {
  const mask = masks?.get(itemId);
  return mask === undefined ? {} : { mask };
}

function layoutLane(doc: KronoDocument, lane: Lane, scale: Scale, measurer: Measurer, masks?: Map<string, MaskKind>): LaneLayout {
  const items = doc.items
    .filter((item) => item.laneId === lane.id)
    .sort(byStart);

  const occupied: Box[] = [];
  const events: PlacedEvent[] = [];
  const periods: PlacedPeriod[] = [];
  let rows = 0;
  let rowHeight = ROW_HEIGHT;

  // Les éléments épinglés d'abord : ils sont des obstacles, pas des candidats.
  for (const item of [...items].sort(pinnedFirst)) {
    const box = boxOf(item, scale, measurer, masks?.get(item.id));
    const row = item.pinnedRow ?? firstFreeRow(occupied, box.left, box.right);
    occupied.push({ left: box.left, right: box.right, row });
    rows = Math.max(rows, row + 1);
    rowHeight = Math.max(rowHeight, box.height);

    if (item.kind === 'event') {
      events.push({
        item,
        x: box.anchorX,
        chipWidth: box.width,
        chipHeight: box.height,
        row,
        showDate: box.showDate,
        dateLabel: box.dateLabel,
        labelWidth: box.labelWidth,
        dateWidth: box.datesWidth,
        ...maskOf_(masks, item.id),
      });
    } else {
      periods.push({
        item,
        x0: box.x0,
        x1: box.x1,
        row,
        labelWidth: box.labelWidth,
        datesWidth: box.datesWidth,
        ...maskOf_(masks, item.id),
      });
    }
  }

  return { events, periods, rows, rowHeight };
}

function byStart(a: Item, b: Item): number {
  const delta = toFractionalYear(itemStart(a)) - toFractionalYear(itemStart(b));
  return delta !== 0 ? delta : a.id.localeCompare(b.id); // déterministe
}

function pinnedFirst(a: Item, b: Item): number {
  const pa = a.pinnedRow === undefined ? 1 : 0;
  const pb = b.pinnedRow === undefined ? 1 : 0;
  return pa !== pb ? pa - pb : byStart(a, b);
}

interface ItemBox {
  /** emprise horizontale utilisée par l'empilement (libellés compris) */
  left: number;
  right: number;
  /** bornes propres de l'élément */
  x0: number;
  x1: number;
  width: number;
  height: number;
  anchorX: number;
  labelWidth: number;
  datesWidth: number;
  showDate: boolean;
  dateLabel: string;
}

/**
 * Une ligne à compléter mesure au moins 48 px : la boîte s'élargit donc pour
 * un libellé court masqué, sinon l'élève n'aurait pas la place d'écrire.
 */
function maskedWidth(width: number, masked: boolean): number {
  return masked ? Math.max(width, MASK_LINE_MIN_WIDTH) : width;
}

function boxOf(item: Item, scale: Scale, measurer: Measurer, mask?: MaskKind): ItemBox {
  if (item.kind === 'event') {
    const x = scale.timeToX(toFractionalYear(item.date));
    const dateLabel = formatDate(item.date, { monthStyle: 'long' });
    const textWidth = maskedWidth(measurer.measure(item.label, LABEL_FONT_SIZE, 500), hides(mask, 'label'));
    const time = toFractionalYear(item.date);
    const density = (scale.segments.find((segment) => time >= segment.from && time <= segment.to) ?? scale.segments[0])?.pxPerYear ?? 0;
    const showDate = chooseStep(density) <= MAX_YEAR_STEP_FOR_DATES;
    const dateWidth = showDate ? maskedWidth(measurer.measure(dateLabel, CAPTION_FONT_SIZE), hides(mask, 'date')) : 0;
    const hasImage = item.image !== undefined;
    const width =
      Math.max(textWidth, dateWidth) +
      CHIP_PADDING_X * 2 +
      (hasImage ? EVENT_IMAGE_SIZE + ROW_GAP : 0);
    const height = hasImage
      ? EVENT_CARD_HEIGHT
      : showDate
        ? EVENT_CHIP_HEIGHT_WITH_DATE
        : EVENT_CHIP_HEIGHT;
    return {
      left: x - width / 2 - ITEM_GAP / 2,
      right: x + width / 2 + ITEM_GAP / 2,
      x0: x - width / 2,
      x1: x + width / 2,
      width,
      height,
      anchorX: x,
      labelWidth: textWidth,
      datesWidth: dateWidth,
      showDate,
      dateLabel,
    };
  }
  const x0 = scale.timeToX(toFractionalYear(item.start));
  const x1 = scale.timeToX(toFractionalYear(item.end), 'left');
  const labelWidth = maskedWidth(measurer.measure(item.label, LABEL_FONT_SIZE, 600), hides(mask, 'label'));
  // Un libellé qui ne tient pas dans la barre se pose à sa droite : il occupe
  // alors de la place, sinon il chevaucherait l'élément suivant.
  const outsideLabel = x1 - x0 >= labelWidth + PERIOD_LABEL_PADDING ? 0 : labelWidth + ROW_GAP;
  const datesWidth = maskedWidth(measurer.measure(periodDates(item), CAPTION_FONT_SIZE), hides(mask, 'date'));
  return {
    left: item.shape === 'bracket' ? Math.min(x0, (x0 + x1 - labelWidth) / 2) - ITEM_GAP / 2 : x0,
    // Deux périodes qui se touchent (Antiquité / Moyen Âge) restent sur la
    // même rangée : pas d'écart forcé entre barres, seulement autour d'un
    // libellé posé à l'extérieur.
    right: item.shape === 'bracket' ? Math.max(x1, (x0 + x1 + labelWidth) / 2) + ITEM_GAP / 2 : Math.max(x1, x0 + 2) + (outsideLabel > 0 ? outsideLabel + ITEM_GAP : 0),
    x0,
    x1,
    width: Math.max(x1 - x0, 2),
    height: PERIOD_BAR_HEIGHT + (item.shape === 'bracket' ? BRACKET_LABEL_HEIGHT : 0),
    anchorX: x0,
    labelWidth,
    datesWidth,
    showDate: false,
    dateLabel: '',
  };
}

/** Première rangée où la place est libre, de la plus proche de l'axe vers le haut. */
function firstFreeRow(occupied: readonly Box[], left: number, right: number): number {
  for (let row = 0; ; row++) {
    const collides = occupied.some(
      (box) => box.row === row && box.left < right && left < box.right,
    );
    if (!collides) return row;
  }
}

/* ------------------------------------------------------------------ */
/* Géométrie finale                                                    */
/* ------------------------------------------------------------------ */

/** Rangée 0 = au plus près de l'axe ; les rangées suivantes montent. */
function rowY(anchorY: number, row: number, height: number, rowHeight: number): number {
  return anchorY - ROW_GAP - (row + 1) * (rowHeight + ROW_GAP) + (rowHeight - height) / 2;
}

function finishEvent(placed: PlacedEvent, anchorY: number, rowHeight: number): SceneEvent {
  const { item } = placed;
  const event: SceneEvent = {
    itemId: item.id,
    laneId: item.laneId,
    label: item.label,
    dateLabel: placed.dateLabel,
    color: item.color,
    ...(item.fillStyle ? { fillStyle: item.fillStyle } : {}),
    circa: item.date.circa === true,
    x: placed.x,
    dotY: anchorY,
    chip: {
      // Centrée sur la pastille : le connecteur reste vertical. Une puce en
      // bord de vue est simplement rognée, elle réapparaît en faisant glisser.
      x: placed.x - placed.chipWidth / 2,
      y: rowY(anchorY, placed.row, placed.chipHeight, rowHeight),
      width: placed.chipWidth,
      height: placed.chipHeight,
    },
    row: placed.row,
    showDate: placed.showDate,
    labelWidth: placed.labelWidth,
    dateWidth: placed.dateWidth,
    ...(hides(placed.mask, 'label') ? { maskLabel: true } : {}),
    ...(hides(placed.mask, 'date') ? { maskDate: true } : {}),
  };
  if (item.image !== undefined) event.imageSrc = item.image.src;
  return event;
}

/** Dans une barre, les dates s'écrivent en années seules : « 1799 – 1815 ». */
function periodDates(item: PeriodItem): string {
  return `${formatYear(item.start.year)} – ${formatYear(item.end.year)}`;
}

function finishPeriod(placed: PlacedPeriod, anchorY: number, rowHeight: number): ScenePeriod {
  const { item } = placed;
  const width = placed.x1 - placed.x0;
  const labelInside = width >= placed.labelWidth + PERIOD_LABEL_PADDING;
  const showDates =
    width >= placed.labelWidth + placed.datesWidth + PERIOD_LABEL_PADDING + PERIOD_DATES_GAP;
  // Le libellé se centre dans l'espace qui reste à gauche des dates.
  const labelCentre = showDates
    ? placed.x0 + (width - placed.datesWidth - PERIOD_DATES_GAP / 2) / 2
    : placed.x0 + width / 2;
  const datesLabel = periodDates(item);
  return {
    itemId: item.id,
    laneId: item.laneId,
    label: item.label,
    datesLabel,
    color: item.color,
    ...(item.fillStyle ? { fillStyle: item.fillStyle } : {}),
    shape: item.shape,
    x0: placed.x0,
    x1: placed.x1,
    y: rowY(anchorY, placed.row, PERIOD_BAR_HEIGHT + (item.shape === 'bracket' ? BRACKET_LABEL_HEIGHT : 0), rowHeight) + (item.shape === 'bracket' ? BRACKET_LABEL_HEIGHT : 0),
    height: PERIOD_BAR_HEIGHT,
    row: placed.row,
    labelInside,
    labelX: labelInside ? labelCentre : placed.x1 + ROW_GAP,
    showDates,
    fuzzyStart: item.fuzzyStart === true,
    fuzzyEnd: item.fuzzyEnd === true,
    labelWidth: placed.labelWidth,
    datesWidth: placed.datesWidth,
    ...(hides(placed.mask, 'label') ? { maskLabel: true } : {}),
    ...(hides(placed.mask, 'date') ? { maskDate: true } : {}),
  };
}
