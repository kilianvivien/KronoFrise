import { compareDates, toFractionalYear } from './dates';
import { itemEnd, itemStart } from './document';
import { axisSchema } from './schema';
import { MAX_SEGMENTS, type Axis, type Item, type KDate } from './types';
import { ERRORS } from '../shared/strings';

/** Split without distorting the projection: equal density, until the weights are edited. */
export function splitAxis(axis: Axis, date: KDate): Axis {
  if (axis.segments.length >= MAX_SEGMENTS) throw new Error(ERRORS.tooManySegments);
  const index = axis.segments.findIndex((segment, i) =>
    compareDates(date, i ? axis.segments[i - 1]!.until : axis.start) > 0 && compareDates(date, segment.until) < 0);
  if (index < 0) throw new Error(ERRORS.segmentsNotSorted);
  const segment = axis.segments[index]!;
  const start = toFractionalYear(index ? axis.segments[index - 1]!.until : axis.start);
  const end = toFractionalYear(segment.until), time = toFractionalYear(date);
  const ratio = (time - start) / (end - start);
  const segments = [...axis.segments];
  segments.splice(index, 1, { until: date, weight: segment.weight * ratio }, { ...segment, weight: segment.weight * (1 - ratio) });
  return axisSchema.parse({ ...axis, segments });
}
/** boundaryIndex is the segment to the left of the boundary. */
export function removeAxisBreak(axis: Axis, boundaryIndex: number): Axis {
  const left = axis.segments[boundaryIndex], right = axis.segments[boundaryIndex + 1];
  if (!left || !right) throw new Error(ERRORS.segmentsNotSorted);
  const segments = [...axis.segments];
  segments.splice(boundaryIndex, 2, { until: right.until, weight: left.weight + right.weight });
  return axisSchema.parse({ ...axis, segments });
}
export function moveAxisBreak(axis: Axis, boundaryIndex: number, date: KDate): Axis {
  if (!axis.segments[boundaryIndex + 1]) throw new Error(ERRORS.segmentsNotSorted);
  return axisSchema.parse({ ...axis, segments: axis.segments.map((segment, index) => index === boundaryIndex ? { ...segment, until: date } : segment) });
}
export function redistributeAxis(axis: Axis, boundaryIndex: number, leftShare: number): Axis {
  const left = axis.segments[boundaryIndex], right = axis.segments[boundaryIndex + 1];
  if (!left || !right || !Number.isFinite(leftShare)) throw new Error(ERRORS.segmentWeight);
  const total = left.weight + right.weight;
  // SPEC? Keep each adjacent segment at least 2% of the pair; see spec-gaps §11.
  const share = Math.max(.02, Math.min(.98, leftShare));
  return axisSchema.parse({ ...axis, segments: axis.segments.map((segment, index) => index === boundaryIndex ? { ...segment, weight: total * share } : index === boundaryIndex + 1 ? { ...segment, weight: total * (1 - share) } : segment) });
}
export function setAxisBounds(axis: Axis, start: KDate, end: KDate): Axis {
  return axisSchema.parse({ ...axis, start, end, segments: axis.segments.map((segment, index) => index === axis.segments.length - 1 ? { ...segment, until: end } : segment) });
}

/**
 * Étend l'axe pour contenir des éléments importés ou collés, avec une marge
 * d'un vingtième. Rend `null` si l'axe les contient déjà : coller ne modifie
 * l'axe que lorsque c'est nécessaire, et jamais dans l'autre sens — un axe ne
 * se rétrécit pas tout seul.
 */
export function axisCovering(axis: Axis, items: readonly Item[]): Axis | null {
  if (items.length === 0) return null;
  const years = items.flatMap((item) => [toFractionalYear(itemStart(item)), toFractionalYear(itemEnd(item))]);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const from = toFractionalYear(axis.start);
  const to = toFractionalYear(axis.end);
  if (first >= from && last <= to) return null;
  const margin = Math.max(1, Math.round((Math.max(last, to) - Math.min(first, from)) * 0.05));
  const start: KDate = first < from ? { year: Math.floor(first) - margin } : axis.start;
  const end: KDate = last > to ? { year: Math.ceil(last) + margin } : axis.end;
  return setAxisBounds(axis, start, end);
}
