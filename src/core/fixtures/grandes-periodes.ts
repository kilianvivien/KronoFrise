/**
 * Fixture 2 (docs/format.md §10) — « Les grandes périodes de l’Histoire ».
 * -3 000 000 → 2026 sur **4 segments** : c'est le test de torture de l'axe
 * élastique (préhistoire fortement comprimée, époque contemporaine dilatée).
 *
 * Rappel de la convention astronomique : « 3300 av. J.-C. » se stocke -3299.
 */
import { GREAT_PERIOD_COLORS } from '../../shared/palette';
import type { EventItem, KronoDocument, PeriodItem } from '../types';

const LANE_PERIODS = 'lane-grandes-periodes';
const LANE_EVENTS = 'lane-reperes';

/** Fin de la préhistoire = apparition de l'écriture, v. 3300 av. J.-C. */
const WRITING = { year: -3299 };
const FALL_OF_ROME = { year: 476 };
const AMERICA = { year: 1492 };
const REVOLUTION = { year: 1789 };
const TODAY = { year: 2026 };

const periods: PeriodItem[] = [
  {
    id: 'gp-p1', kind: 'period', laneId: LANE_PERIODS, label: 'Préhistoire',
    color: GREAT_PERIOD_COLORS.prehistoire,
    start: { year: -3_000_000 }, end: WRITING, shape: 'bar', fuzzyStart: true,
  },
  {
    id: 'gp-p2', kind: 'period', laneId: LANE_PERIODS, label: 'Antiquité',
    color: GREAT_PERIOD_COLORS.antiquite,
    start: WRITING, end: FALL_OF_ROME, shape: 'bar',
  },
  {
    id: 'gp-p3', kind: 'period', laneId: LANE_PERIODS, label: 'Moyen Âge',
    color: GREAT_PERIOD_COLORS['moyen-age'],
    start: FALL_OF_ROME, end: AMERICA, shape: 'bar',
  },
  {
    id: 'gp-p4', kind: 'period', laneId: LANE_PERIODS, label: 'Époque moderne',
    color: GREAT_PERIOD_COLORS['epoque-moderne'],
    start: AMERICA, end: REVOLUTION, shape: 'bar',
  },
  {
    id: 'gp-p5', kind: 'period', laneId: LANE_PERIODS, label: 'Époque contemporaine',
    color: GREAT_PERIOD_COLORS['epoque-contemporaine'],
    start: REVOLUTION, end: TODAY, shape: 'bar',
  },
];

const events: EventItem[] = [
  { id: 'gp-e1', label: 'Peintures de Lascaux', date: { year: -16_999, circa: true }, color: 'terre' },
  { id: 'gp-e2', label: 'Naissance de l’écriture', date: { year: -3299, circa: true }, color: 'ocre' },
  { id: 'gp-e3', label: 'Fondation de Rome', date: { year: -752, circa: true }, color: 'ocre' },
  { id: 'gp-e4', label: 'Chute de l’Empire romain d’Occident', date: { year: 476 }, color: 'ardoise' },
  { id: 'gp-e5', label: 'Couronnement de Charlemagne', date: { year: 800, month: 12, day: 25 }, color: 'ardoise' },
  { id: 'gp-e6', label: 'Prise de Constantinople', date: { year: 1453, month: 5, day: 29 }, color: 'foret' },
  { id: 'gp-e7', label: 'Révolution française', date: { year: 1789, month: 7, day: 14 }, color: 'brique' },
  { id: 'gp-e8', label: 'Première Guerre mondiale', date: { year: 1914, month: 7, day: 28 }, color: 'brique' },
].map((seed) => ({ ...seed, kind: 'event' as const, laneId: LANE_EVENTS }));

export const grandesPeriodes: KronoDocument = {
  schema: 'krono/1',
  id: 'fixture-grandes-periodes',
  meta: {
    title: 'Les grandes périodes de l’Histoire',
    createdAt: '2026-08-30T09:00:00.000Z',
    modifiedAt: '2026-08-30T09:00:00.000Z',
  },
  axis: {
    start: { year: -3_000_000 },
    end: TODAY,
    // 4 segments : préhistoire écrasée (1/9 de la largeur pour 3 millions
    // d'années), époque contemporaine dilatée (4/9 pour 237 ans).
    segments: [
      { until: WRITING, weight: 1 },
      { until: FALL_OF_ROME, weight: 2 },
      { until: AMERICA, weight: 2 },
      { until: TODAY, weight: 4 },
    ],
  },
  themeId: 'manuel-scolaire',
  lanes: [
    { id: LANE_PERIODS, name: 'Grandes périodes' },
    { id: LANE_EVENTS, name: 'Repères' },
  ],
  items: [...periods, ...events],
  pedagogy: { maskedItems: [] },
};
