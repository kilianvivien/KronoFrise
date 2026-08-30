/**
 * Fixture 1 (docs/format.md §10) — « La Révolution française ».
 * 1770–1830, une bande, 15 événements, 4 périodes, 2 images.
 * Sert aussi de document de démonstration du critère de sortie M2.
 */
import type { EventItem, KDate, KronoDocument, PeriodItem } from '../types';
import { PLACEHOLDER_BRIQUE, PLACEHOLDER_OCRE } from './images';

const LANE = 'lane-revolution';

type EventSeed = [id: string, label: string, date: KDate, color: string, image?: string];

const eventSeeds: EventSeed[] = [
  ['rev-e01', 'Avènement de Louis XVI', { year: 1774, month: 5, day: 10 }, 'ardoise'],
  ['rev-e02', 'Ouverture des États généraux', { year: 1789, month: 5, day: 5 }, 'brique'],
  ['rev-e03', 'Serment du Jeu de paume', { year: 1789, month: 6, day: 20 }, 'brique'],
  ['rev-e04', 'Prise de la Bastille', { year: 1789, month: 7, day: 14 }, 'brique', PLACEHOLDER_BRIQUE],
  ['rev-e05', 'Déclaration des droits de l’homme', { year: 1789, month: 8, day: 26 }, 'brique'],
  ['rev-e06', 'Constitution de 1791', { year: 1791, month: 9, day: 3 }, 'ocre'],
  ['rev-e07', 'Proclamation de la République', { year: 1792, month: 9, day: 21 }, 'ocre'],
  ['rev-e08', 'Exécution de Louis XVI', { year: 1793, month: 1, day: 21 }, 'lie-de-vin'],
  ['rev-e09', 'Chute de Robespierre', { year: 1794, month: 7, day: 27 }, 'lie-de-vin'],
  ['rev-e10', 'Coup d’État du 18 Brumaire', { year: 1799, month: 11, day: 9 }, 'encre'],
  ['rev-e11', 'Sacre de Napoléon', { year: 1804, month: 12, day: 2 }, 'encre', PLACEHOLDER_OCRE],
  ['rev-e12', 'Bataille d’Austerlitz', { year: 1805, month: 12, day: 2 }, 'encre'],
  ['rev-e13', 'Campagne de Russie', { year: 1812, month: 6 }, 'encre'],
  ['rev-e14', 'Waterloo', { year: 1815, month: 6, day: 18 }, 'encre'],
  ['rev-e15', 'Les Trois Glorieuses', { year: 1830, month: 7, day: 27 }, 'foret'],
];

const events: EventItem[] = eventSeeds.map(([id, label, date, color, image]) => {
  const event: EventItem = { id, kind: 'event', laneId: LANE, label, color, date };
  if (image !== undefined) event.image = { src: image };
  return event;
});

const periods: PeriodItem[] = [
  {
    id: 'rev-p01', kind: 'period', laneId: LANE, label: 'Monarchie constitutionnelle',
    color: 'ocre', start: { year: 1789, month: 7 }, end: { year: 1792, month: 9 }, shape: 'bar',
  },
  {
    id: 'rev-p02', kind: 'period', laneId: LANE, label: 'Convention',
    color: 'lie-de-vin', start: { year: 1792, month: 9 }, end: { year: 1795, month: 10 }, shape: 'bar',
  },
  {
    id: 'rev-p03', kind: 'period', laneId: LANE, label: 'Directoire',
    color: 'prune', start: { year: 1795, month: 10 }, end: { year: 1799, month: 11 }, shape: 'bar',
  },
  {
    id: 'rev-p04', kind: 'period', laneId: LANE, label: 'Consulat et Empire',
    color: 'encre', start: { year: 1799, month: 11 }, end: { year: 1815, month: 6 }, shape: 'bar',
  },
];

export const revolution: KronoDocument = {
  schema: 'krono/1',
  id: 'fixture-revolution',
  meta: {
    title: 'La Révolution française',
    createdAt: '2026-08-30T09:00:00.000Z',
    modifiedAt: '2026-08-30T09:00:00.000Z',
  },
  axis: {
    start: { year: 1770 },
    end: { year: 1830 },
    segments: [{ until: { year: 1830 }, weight: 1 }],
  },
  themeId: 'manuel-scolaire',
  lanes: [{ id: LANE, name: 'Politique' }],
  items: [...periods, ...events],
  pedagogy: { maskedItems: [] },
};
