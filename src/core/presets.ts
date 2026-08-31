import { addItems, type Command } from './commands';
import { newId } from './ids';
import type { Axis, KDate, KronoDocument, PeriodItem } from './types';
import { GREAT_PERIOD_COLORS } from '../shared/palette';
import { GREAT_PERIOD_NAMES, PRESET_LANE_NAME } from '../shared/strings';

/**
 * Bornes des cinq grandes périodes scolaires, en années astronomiques.
 * La dernière suit le calendrier : l'époque contemporaine court jusqu'à nous.
 */
export function greatPeriodBoundaries(year = new Date().getUTCFullYear()): number[] {
  return [-3_000_000, -3299, 476, 1492, 1789, Math.max(year, 1790)];
}

/**
 * Les mêmes périodes vues comme des intervalles nommés : la boîte de mise en
 * route s'en sert pour remplir les deux bornes d'un clic, sans rien insérer.
 */
export function greatPeriodRanges(year?: number): { name: string; start: KDate; end: KDate }[] {
  const boundaries = greatPeriodBoundaries(year);
  return GREAT_PERIOD_NAMES.map((name, i) => ({
    name, start: { year: boundaries[i]! }, end: { year: boundaries[i + 1]! },
  }));
}

/** Insert a self-contained background lane; no existing item is removed. */
export function greatPeriodsPreset(doc: KronoDocument, year = new Date().getUTCFullYear()): Command {
  const lane = { id: newId(), name: PRESET_LANE_NAME };
  const boundaries = greatPeriodBoundaries(year);
  const colors = Object.values(GREAT_PERIOD_COLORS);
  const items: PeriodItem[] = GREAT_PERIOD_NAMES.map((label, i) => ({
    id: newId(), laneId: lane.id, label, kind: 'period', color: colors[i]!,
    start: { year: boundaries[i]! }, end: { year: boundaries[i + 1]! }, shape: 'bar',
    ...(i === 0 ? { fuzzyStart: true } : {}),
  }));
  const end = { year: boundaries[5]! };
  const axis: Axis = { start: { year: boundaries[0]! }, end, segments: [
    { until: { year: -3299 }, weight: 1 }, { until: { year: 476 }, weight: 2 },
    { until: { year: 1492 }, weight: 2 }, { until: end, weight: 4 },
  ] };
  return { name: 'batch', label: 'greatPeriodsPreset', commands: [
    { name: 'insertLane', lane, at: 0 }, { name: 'setAxis', axis }, addItems(doc, items),
  ] };
}
