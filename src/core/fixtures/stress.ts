/**
 * Fixture 4 (docs/format.md §10) — document de charge, généré.
 * 500 éléments sur 4 bandes ; sert au test de performance de la mise en page
 * (objectif : < 5 ms). Le générateur est déterministe : même document à
 * chaque exécution, donc mesures comparables entre deux commits.
 */
import { PALETTE } from '../../ui/palette';
import type { EventItem, KronoDocument, Item, PeriodItem } from '../types';

/** Générateur pseudo-aléatoire (mulberry32) — déterministe, sans dépendance. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const LANES = ['Politique', 'Arts', 'Sciences', 'Monde'];
const AXIS_START = 1000;
const AXIS_END = 2000;
const ITEM_COUNT = 500;

function generate(): Item[] {
  const random = seeded(20260830);
  const items: Item[] = [];
  for (let i = 0; i < ITEM_COUNT; i++) {
    const laneId = `stress-lane-${i % LANES.length}`;
    const color = PALETTE[i % PALETTE.length]!.id;
    const year = AXIS_START + Math.floor(random() * (AXIS_END - AXIS_START));
    if (i % 5 === 0) {
      const span = 1 + Math.floor(random() * 40);
      const period: PeriodItem = {
        id: `stress-p${i}`, kind: 'period', laneId, label: `Période ${i}`,
        color, start: { year }, end: { year: Math.min(year + span, AXIS_END) }, shape: 'bar',
      };
      if (period.start.year < period.end.year) items.push(period);
      continue;
    }
    const event: EventItem = {
      id: `stress-e${i}`, kind: 'event', laneId, label: `Événement ${i}`,
      color, date: { year, month: 1 + Math.floor(random() * 12) },
    };
    items.push(event);
  }
  return items;
}

export const stress: KronoDocument = {
  schema: 'krono/1',
  id: 'fixture-stress',
  meta: {
    title: 'Charge — 500 éléments',
    createdAt: '2026-08-30T09:00:00.000Z',
    modifiedAt: '2026-08-30T09:00:00.000Z',
  },
  axis: {
    start: { year: AXIS_START },
    end: { year: AXIS_END },
    segments: [{ until: { year: AXIS_END }, weight: 1 }],
  },
  themeId: 'manuel-scolaire',
  lanes: LANES.map((name, index) => ({ id: `stress-lane-${index}`, name })),
  items: generate(),
  pedagogy: { maskedItems: [] },
};
