import { compareDates, daysInMonth, toFractionalYear, type DatePrecision } from '../core/dates';
import { itemStart } from '../core/document';
import type { Command, ItemPatch } from '../core/commands';
import { YEAR_MAX, YEAR_MIN, type KDate, type KronoDocument } from '../core/types';
import type { Scale } from '../layout/scale';

export function dateAtTime(time: number, precision: DatePrecision): KDate {
  const bounded = Math.min(YEAR_MAX, Math.max(YEAR_MIN, time));
  if (precision === 'year') return { year: Math.round(bounded) };
  const monthIndex = Math.round(bounded * 12);
  if (precision === 'month') return { year: Math.floor(monthIndex / 12), month: ((monthIndex % 12) + 12) % 12 + 1 };
  // Invert the specified fractional mapping, including its small month overlaps.
  let best: KDate = { year: Math.floor(bounded), month: 1, day: 1 };
  let distance = Infinity;
  for (let i = Math.floor(bounded * 12) - 1; i <= Math.floor(bounded * 12) + 1; i++) {
    const year = Math.floor(i / 12), month = ((i % 12) + 12) % 12 + 1;
    if (year < YEAR_MIN || year > YEAR_MAX) continue;
    const day = Math.max(1, Math.min(daysInMonth(year, month), Math.round((bounded - year - (month - 1) / 12) * 365) + 1));
    const candidate = { year, month, day };
    const delta = Math.abs(toFractionalYear(candidate) - bounded);
    if (delta < distance) { best = candidate; distance = delta; }
  }
  return best;
}
export function precisionAt(scale: Scale, x: number): DatePrecision {
  const year = scale.xToTime(x);
  const segment = scale.segments.find((s) => year >= s.from && year <= s.to) ?? scale.segments[0];
  const density = segment?.pxPerYear ?? 1;
  return density >= 1500 ? 'day' : density >= 96 ? 'month' : 'year';
}
export function snapDate(scale: Scale, x: number, disable: boolean, precision = precisionAt(scale, x)) {
  const nearest = scale.visibleTicks().reduce<{ x: number; t: number } | null>((best, tick) =>
    Math.abs(tick.x - x) <= 8 && (!best || Math.abs(tick.x - x) < Math.abs(best.x - x)) ? tick : best, null);
  const date = dateAtTime(!disable && nearest ? nearest.t : scale.xToTime(x), precision);
  return { date, guide: !disable && nearest ? scale.timeToX(toFractionalYear(date)) : null };
}
function shifted(date: KDate, delta: number, precision: DatePrecision): KDate {
  if (precision === 'year') {
    const year = Math.max(YEAR_MIN, Math.min(YEAR_MAX, date.year + Math.round(delta)));
    return { ...date, year, ...(date.day ? { day: Math.min(date.day, daysInMonth(year, date.month ?? 1)) } : {}) };
  }
  if (precision === 'month') {
    const index = date.year * 12 + (date.month ?? 1) - 1 + Math.round(delta * 12);
    const year = Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.floor(index / 12)));
    const month = ((index % 12) + 12) % 12 + 1;
    return { ...date, year, month, ...(date.day ? { day: Math.min(date.day, daysInMonth(year, month)) } : {}) };
  }
  return { ...date, ...dateAtTime(toFractionalYear(date) + delta, 'day') };
}
export function moveSelection(doc: KronoDocument, ids: string[], delta: number, precision: DatePrecision): Command {
  return { name: 'updateItems', label: 'moveSelection', patches: doc.items.filter((item) => ids.includes(item.id)).flatMap<{ itemId: string; patch: ItemPatch }>((item) => {
    if (item.kind === 'event') return [{ itemId: item.id, patch: { date: shifted(item.date, delta, precision) } }];
    const start = shifted(item.start, delta, precision), end = shifted(item.end, delta, precision);
    return compareDates(start, end) < 0 ? [{ itemId: item.id, patch: { start, end } }] : [];
  }) };
}
export function selectedStart(doc: KronoDocument, id: string): KDate | undefined {
  const item = doc.items.find((item) => item.id === id); return item ? itemStart(item) : undefined;
}
