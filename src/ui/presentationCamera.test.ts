import { describe, expect, it } from 'vitest';
import { chronological } from '../core/document';
import { antiquite, grandesPeriodes, revolution } from '../core/fixtures/index';
import { makeScale } from '../layout/scale';
import { toFractionalYear } from '../core/dates';
import { itemEnd, itemStart } from '../core/document';
import { easeCamera, focusCamera, interpolate, OVERVIEW } from './presentationCamera';

const WIDTH = 1200;
const INSETS = { left: 16, right: 16 };

describe('caméra de présentation', () => {
  it('centre l’élément visé, quel que soit le document', () => {
    for (const doc of [revolution, antiquite, grandesPeriodes]) {
      for (const item of chronological(doc.items)) {
        const camera = focusCamera(doc, item, WIDTH, INSETS);
        const scale = makeScale(doc.axis, WIDTH, camera.pan, camera.zoom, INSETS);
        const centre = (scale.timeToX(toFractionalYear(itemStart(item))) + scale.timeToX(toFractionalYear(itemEnd(item)), 'left')) / 2;
        // Le recentrage est exact tant que le décalage n'est pas borné en bout d'axe.
        expect(centre).toBeGreaterThan(-WIDTH);
        expect(centre).toBeLessThan(WIDTH * 2);
        expect(camera.zoom).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('zoome plus sur un événement que sur une longue période', () => {
    const event = revolution.items.find((item) => item.kind === 'event')!;
    const period = revolution.items
      .filter((item) => item.kind === 'period')
      .sort((a, b) => (toFractionalYear(itemEnd(b)) - toFractionalYear(itemStart(b))) - (toFractionalYear(itemEnd(a)) - toFractionalYear(itemStart(a))))[0]!;
    expect(focusCamera(revolution, event, WIDTH, INSETS).zoom)
      .toBeGreaterThan(focusCamera(revolution, period, WIDTH, INSETS).zoom);
  });

  it('ne dézoome jamais sous la vue d’ensemble', () => {
    for (const item of grandesPeriodes.items) {
      expect(focusCamera(grandesPeriodes, item, WIDTH, INSETS).zoom).toBeGreaterThanOrEqual(OVERVIEW.zoom);
    }
  });

  it('interpole du début à la fin, sans dépassement', () => {
    const from = { zoom: 1, pan: 0 };
    const to = { zoom: 8, pan: 400 };
    expect(interpolate(from, to, 0)).toEqual(from);
    const end = interpolate(from, to, 1);
    expect(end.zoom).toBeCloseTo(to.zoom, 6);
    expect(end.pan).toBeCloseTo(to.pan, 6);
    let previous = -1;
    for (let step = 0; step <= 20; step++) {
      const value = interpolate(from, to, step / 20).pan;
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(to.pan + 1e-6);
      previous = value;
    }
  });

  it('démarre vite et finit doux (courbe de DESIGN.md §8)', () => {
    expect(easeCamera(0)).toBeCloseTo(0, 6);
    expect(easeCamera(1)).toBeCloseTo(1, 6);
    expect(easeCamera(0.5)).toBeGreaterThan(0.5);
    expect(easeCamera(-1)).toBe(0);
    expect(easeCamera(2)).toBe(1);
  });
});
