/**
 * Temps ⇄ pixels — le cœur de l'application (PLAN.md §4.3, format.md §3).
 *
 * L'axe est découpé en segments contigus qui se partagent la largeur selon
 * leur poids : c'est le « temps élastique ». À l'intérieur d'un segment la
 * projection est linéaire ; entre segments elle est linéaire par morceaux et
 * **strictement croissante**. Tout passe par ici : graduations, aimantation,
 * glissement, minimap, exports.
 *
 * Conventions :
 * - `t` est une année fractionnaire (`toFractionalYear`), pas une `KDate` ;
 * - `zoom` = 1 signifie « l'axe entier tient dans la largeur » ;
 * - `pan` est un décalage en pixels de contenu (0 = bord gauche de l'axe) ;
 * - un élément hors de l'axe n'est jamais rogné : la projection est
 *   extrapolée avec la densité du segment de bord.
 */
import { toFractionalYear } from '../core/dates';
import type { Axis } from '../core/types';
import { COUPURE_DENSITY_RATIO, COUPURE_GAP } from './metrics';
import type { Measurer } from './measure';
import { buildTicks, type Tick, type TickLevel } from './ticks';

export interface ScaleSegment {
  index: number;
  /** bornes en années fractionnaires */
  from: number;
  to: number;
  /** bornes en pixels de contenu (avant `pan`) */
  x0: number;
  x1: number;
  pxPerYear: number;
  /** une coupure est dessinée juste avant ce segment */
  coupureBefore: boolean;
}

export interface Coupure {
  /** bord gauche du vide, en pixels de contenu */
  x: number;
  width: number;
  /** segments de part et d'autre */
  leftIndex: number;
  rightIndex: number;
}

export type BoundarySide = 'left' | 'right';

export interface Scale {
  readonly width: number;
  readonly zoom: number;
  readonly pan: number;
  /** largeur totale du contenu à ce zoom, coupures comprises */
  readonly contentWidth: number;
  readonly segments: readonly ScaleSegment[];
  readonly coupures: readonly Coupure[];
  /** bornes de l'axe en années fractionnaires */
  readonly domain: { from: number; to: number };
  /**
   * `side` lève l'ambiguïté d'une date posée sur une coupure : « right »
   * (défaut) la place au début du segment suivant — le cas d'un début de
   * période ; « left » la place à la fin du segment précédent — le cas d'une
   * fin de période. Sans coupure, les deux donnent le même pixel.
   */
  timeToX(t: number, side?: BoundarySide): number;
  xToTime(x: number): number;
  /** graduations visibles ; sans argument, le niveau est choisi par segment */
  visibleTicks(level?: TickLevel, measurer?: Measurer): Tick[];
  /** pan maximal utile : au-delà, le contenu quitte l'écran */
  maxPan(): number;
}

export function makeScale(axis: Axis, widthPx: number, pan = 0, zoom = 1): Scale {
  const domainFrom = toFractionalYear(axis.start);
  const domainTo = toFractionalYear(axis.end);
  const safeWidth = Math.max(widthPx, 1);
  const safeZoom = zoom > 0 ? zoom : 1;

  const bounds = segmentBounds(axis, domainFrom, domainTo);
  const totalWeight = bounds.reduce((sum, b) => sum + b.weight, 0);

  // 1) Décider des coupures. Le rapport des densités ne dépend que des poids et
  //    des durées, jamais de la largeur : on peut donc trancher avant de
  //    retirer les vides de la largeur disponible.
  const density = bounds.map((b) => (b.weight / totalWeight) / Math.max(b.to - b.from, Number.EPSILON));
  const coupureBefore = bounds.map((_bound, i) => {
    if (i === 0) return false;
    const previous = density[i - 1] ?? 1;
    const current = density[i] ?? 1;
    const ratio = Math.max(previous, current) / Math.max(Math.min(previous, current), Number.EPSILON);
    return ratio > COUPURE_DENSITY_RATIO;
  });

  // 2) Répartir la largeur restante entre les segments.
  const contentWidth = safeWidth * safeZoom;
  const gapCount = coupureBefore.filter(Boolean).length;
  const usableWidth = Math.max(contentWidth - gapCount * COUPURE_GAP, 1);

  const segments: ScaleSegment[] = [];
  const coupures: Coupure[] = [];
  let cursor = 0;
  bounds.forEach((bound, index) => {
    if (coupureBefore[index] === true) {
      coupures.push({ x: cursor, width: COUPURE_GAP, leftIndex: index - 1, rightIndex: index });
      cursor += COUPURE_GAP;
    }
    const width = usableWidth * (bound.weight / totalWeight);
    const years = Math.max(bound.to - bound.from, Number.EPSILON);
    segments.push({
      index,
      from: bound.from,
      to: bound.to,
      x0: cursor,
      x1: cursor + width,
      pxPerYear: width / years,
      coupureBefore: coupureBefore[index] === true,
    });
    cursor += width;
  });

  const first = segments[0] as ScaleSegment;
  const last = segments[segments.length - 1] as ScaleSegment;

  function timeToX(t: number, side: BoundarySide = 'right'): number {
    return contentX(t, side) - pan;
  }

  function contentX(t: number, side: BoundarySide): number {
    if (t <= first.from) return first.x0 + (t - first.from) * first.pxPerYear;
    if (t >= last.to) return last.x1 + (t - last.to) * last.pxPerYear;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i] as ScaleSegment;
      // t est forcément ≥ segment.from : les segments sont contigus.
      const belongsHere = side === 'left' ? t <= segment.to : t < segment.to;
      if (belongsHere || i === segments.length - 1) {
        return segment.x0 + (t - segment.from) * segment.pxPerYear;
      }
    }
    return last.x1;
  }

  function xToTime(x: number): number {
    const xc = x + pan;
    if (xc <= first.x0) return first.from + (xc - first.x0) / first.pxPerYear;
    if (xc >= last.x1) return last.to + (xc - last.x1) / last.pxPerYear;
    for (const segment of segments) {
      if (xc <= segment.x1) {
        // Dans le vide d'une coupure : on retombe sur la borne du segment.
        if (xc <= segment.x0) return segment.from;
        return segment.from + (xc - segment.x0) / segment.pxPerYear;
      }
    }
    return last.to;
  }

  const scale: Scale = {
    width: safeWidth,
    zoom: safeZoom,
    pan,
    contentWidth,
    segments,
    coupures,
    domain: { from: domainFrom, to: domainTo },
    timeToX,
    xToTime,
    visibleTicks: (level?: TickLevel, measurer?: Measurer) => buildTicks(scale, level, measurer),
    maxPan: () => Math.max(0, contentWidth - safeWidth),
  };
  return scale;
}

/** Densité moyenne de l'axe entier, en pixels par année (utile pour le zoom). */
export function averagePxPerYear(scale: Scale): number {
  return scale.contentWidth / Math.max(scale.domain.to - scale.domain.from, Number.EPSILON);
}

interface Bound {
  from: number;
  to: number;
  weight: number;
}

function segmentBounds(axis: Axis, domainFrom: number, domainTo: number): Bound[] {
  const bounds: Bound[] = [];
  let from = domainFrom;
  axis.segments.forEach((segment, index) => {
    const isLast = index === axis.segments.length - 1;
    const to = isLast ? domainTo : toFractionalYear(segment.until);
    bounds.push({ from, to: Math.max(to, from + Number.EPSILON), weight: segment.weight });
    from = to;
  });
  if (bounds.length === 0) {
    bounds.push({ from: domainFrom, to: domainTo, weight: 1 });
  }
  return bounds;
}
