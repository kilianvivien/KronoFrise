import { expect, it } from 'vitest';
import { relativeTime } from './relativeTime';
import { LIBRARY } from './strings';

const now = new Date('2026-08-31T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

it('formule les durées en français, de la minute à l’année', () => {
  expect(relativeTime(ago(30 * 1000), now)).toBe(LIBRARY.justNow);
  expect(relativeTime(ago(5 * 60 * 1000), now)).toMatch(/5/);
  expect(relativeTime(ago(3 * 3600 * 1000), now)).toMatch(/3/);
  // « numeric: auto » préfère « avant-hier » à « il y a 2 j » : c'est voulu.
  expect(relativeTime(ago(2 * 24 * 3600 * 1000), now)).toBe('avant-hier');
  expect(relativeTime(ago(5 * 24 * 3600 * 1000), now)).toMatch(/5/);
  expect(relativeTime(ago(400 * 24 * 3600 * 1000), now)).toMatch(/an/);
});

it('ne casse jamais sur une date absente ou abîmée', () => {
  expect(relativeTime('pas une date', now)).toBe(LIBRARY.justNow);
});
