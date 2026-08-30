/**
 * Fixture 3 (docs/format.md §10) — « L’Antiquité ».
 * -800 → 500 : traversée de l'an 1, dates approximatives, périodes floues.
 */
import type { EventItem, KronoDocument, PeriodItem } from '../types';

const LANE_GRECE = 'lane-grece';
const LANE_ROME = 'lane-rome';

const periods: PeriodItem[] = [
  {
    id: 'ant-p1', kind: 'period', laneId: LANE_GRECE, label: 'Grèce archaïque',
    color: 'canard', start: { year: -775 }, end: { year: -509 }, shape: 'bar', fuzzyStart: true,
  },
  {
    id: 'ant-p2', kind: 'period', laneId: LANE_GRECE, label: 'Grèce classique',
    color: 'canard', start: { year: -509 }, end: { year: -322 }, shape: 'bar',
  },
  {
    id: 'ant-p3', kind: 'period', laneId: LANE_GRECE, label: 'Période hellénistique',
    color: 'olive', start: { year: -322 }, end: { year: -29 }, shape: 'bar', fuzzyEnd: true,
  },
  {
    id: 'ant-p4', kind: 'period', laneId: LANE_ROME, label: 'République romaine',
    color: 'ocre', start: { year: -508 }, end: { year: -26 }, shape: 'bar',
  },
  {
    id: 'ant-p5', kind: 'period', laneId: LANE_ROME, label: 'Empire romain',
    color: 'brique', start: { year: -26 }, end: { year: 476 }, shape: 'bar', fuzzyEnd: true,
  },
  {
    id: 'ant-p6', kind: 'period', laneId: LANE_ROME, label: 'Pax Romana',
    color: 'terre', start: { year: -26 }, end: { year: 180 }, shape: 'bracket',
  },
];

const events: EventItem[] = [
  { id: 'ant-e1', laneId: LANE_GRECE, label: 'Premiers Jeux olympiques', date: { year: -775, circa: true }, color: 'canard' },
  { id: 'ant-e2', laneId: LANE_ROME, label: 'Fondation de Rome', date: { year: -752, circa: true }, color: 'ocre' },
  { id: 'ant-e3', laneId: LANE_GRECE, label: 'Bataille de Marathon', date: { year: -489, month: 9 }, color: 'canard' },
  { id: 'ant-e4', laneId: LANE_GRECE, label: 'Mort d’Alexandre le Grand', date: { year: -322, month: 6, day: 11 }, color: 'olive' },
  { id: 'ant-e5', laneId: LANE_ROME, label: 'Assassinat de Jules César', date: { year: -43, month: 3, day: 15 }, color: 'lie-de-vin' },
  { id: 'ant-e6', laneId: LANE_ROME, label: 'Naissance du christianisme', date: { year: 30, circa: true }, color: 'prune' },
  { id: 'ant-e7', laneId: LANE_ROME, label: 'Édit de Milan', date: { year: 313 }, color: 'prune' },
  { id: 'ant-e8', laneId: LANE_ROME, label: 'Chute de Rome', date: { year: 476, month: 9, day: 4 }, color: 'brique' },
].map((seed) => ({ ...seed, kind: 'event' as const }));

export const antiquite: KronoDocument = {
  schema: 'krono/1',
  id: 'fixture-antiquite',
  meta: {
    title: 'L’Antiquité',
    createdAt: '2026-08-30T09:00:00.000Z',
    modifiedAt: '2026-08-30T09:00:00.000Z',
  },
  axis: {
    start: { year: -800 },
    end: { year: 500 },
    segments: [{ until: { year: 500 }, weight: 1 }],
  },
  themeId: 'manuel-scolaire',
  lanes: [
    { id: LANE_GRECE, name: 'Grèce' },
    { id: LANE_ROME, name: 'Rome' },
  ],
  items: [...periods, ...events],
  pedagogy: { maskedItems: [] },
};
