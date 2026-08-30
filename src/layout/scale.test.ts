import { describe, expect, it } from 'vitest';
import { toFractionalYear } from '../core/dates';
import { grandesPeriodes, revolution } from '../core/fixtures/index';
import { linearAxis } from '../core/document';
import type { Axis } from '../core/types';
import { COUPURE_GAP } from './metrics';
import { makeScale } from './scale';

const WIDTH = 1200;

/** Cas dégénérés exigés par docs/format.md §3. */
const oneSegment: Axis = linearAxis({ year: 1770 }, { year: 1830 });

const eightSegments: Axis = {
  start: { year: 0 },
  end: { year: 800 },
  segments: Array.from({ length: 8 }, (_, i) => ({ until: { year: (i + 1) * 100 }, weight: i + 1 })),
};

/** Un segment d'un an à côté d'un segment d'un million d'années. */
const extreme: Axis = {
  start: { year: -1_000_000 },
  end: { year: 1 },
  segments: [
    { until: { year: 0 }, weight: 1 },
    { until: { year: 1 }, weight: 1 },
  ],
};

const AXES: [string, Axis][] = [
  ['un segment', oneSegment],
  ['huit segments', eightSegments],
  ['1 an contre 1 million', extreme],
  ['grandes périodes (4 segments)', grandesPeriodes.axis],
  ['antiquité', linearAxis({ year: -800 }, { year: 500 })],
];

const VIEWS: [string, number, number][] = [
  ['vue ajustée', 0, 1],
  ['zoom ×4, panoramique', 800, 4],
  ['zoom ×120, panoramique profond', 15_000, 120],
];

describe.each(AXES)('makeScale — %s', (_name, axis) => {
  describe.each(VIEWS)('%s', (_view, pan, zoom) => {
    const scale = makeScale(axis, WIDTH, pan, zoom);
    const { from, to } = scale.domain;
    const samples = Array.from({ length: 200 }, (_, i) => from + ((to - from) * i) / 199);

    it('est strictement croissante', () => {
      for (let i = 1; i < samples.length; i++) {
        expect(scale.timeToX(samples[i]!)).toBeGreaterThan(scale.timeToX(samples[i - 1]!));
      }
    });

    it('fait l’aller-retour x → t → x', () => {
      for (const t of samples) {
        expect(scale.xToTime(scale.timeToX(t))).toBeCloseTo(t, 6);
      }
    });

    it('fait l’aller-retour t → x → t sur toute la largeur', () => {
      for (let x = 0; x <= WIDTH; x += 7) {
        const t = scale.xToTime(x);
        // Dans le vide d'une coupure, plusieurs x donnent la même date :
        // l'aller-retour n'y est pas exigé.
        const inGap = scale.coupures.some(
          (c) => x + scale.pan >= c.x && x + scale.pan <= c.x + c.width,
        );
        if (!inGap) expect(scale.timeToX(t)).toBeCloseTo(x, 6);
      }
    });

    it('projette les bornes de segment sur des pixels exacts', () => {
      for (const segment of scale.segments) {
        expect(scale.timeToX(segment.from)).toBeCloseTo(segment.x0 - scale.pan, 6);
        expect(scale.timeToX(segment.to, 'left')).toBeCloseTo(segment.x1 - scale.pan, 6);
      }
    });

    it('enchaîne les segments sans trou autre que les coupures', () => {
      for (let i = 1; i < scale.segments.length; i++) {
        const previous = scale.segments[i - 1]!;
        const current = scale.segments[i]!;
        expect(current.from).toBeCloseTo(previous.to, 9);
        const gap = current.x0 - previous.x1;
        expect(gap).toBeCloseTo(current.coupureBefore ? COUPURE_GAP : 0, 6);
      }
    });
  });
});

describe('makeScale — étendue et zoom', () => {
  it('à zoom 1 l’axe occupe exactement la largeur', () => {
    const scale = makeScale(oneSegment, WIDTH);
    expect(scale.timeToX(scale.domain.from)).toBeCloseTo(0, 9);
    expect(scale.timeToX(scale.domain.to)).toBeCloseTo(WIDTH, 9);
    expect(scale.maxPan()).toBe(0);
  });

  it('respecte les poids des segments', () => {
    const axis: Axis = {
      start: { year: 0 },
      end: { year: 200 },
      segments: [
        { until: { year: 100 }, weight: 3 },
        { until: { year: 200 }, weight: 1 },
      ],
    };
    const scale = makeScale(axis, WIDTH);
    const usable = WIDTH - (scale.coupures.length * COUPURE_GAP);
    expect(scale.segments[0]!.x1 - scale.segments[0]!.x0).toBeCloseTo(usable * 0.75, 6);
    expect(scale.segments[1]!.x1 - scale.segments[1]!.x0).toBeCloseTo(usable * 0.25, 6);
  });

  it('n’affiche une coupure que si les densités diffèrent de plus de 1,25×', () => {
    const equal: Axis = {
      start: { year: 0 }, end: { year: 200 },
      segments: [{ until: { year: 100 }, weight: 1 }, { until: { year: 200 }, weight: 1 }],
    };
    expect(makeScale(equal, WIDTH).coupures).toHaveLength(0);

    const slightly: Axis = {
      start: { year: 0 }, end: { year: 200 },
      segments: [{ until: { year: 100 }, weight: 1.2 }, { until: { year: 200 }, weight: 1 }],
    };
    expect(makeScale(slightly, WIDTH).coupures).toHaveLength(0);

    const clearly: Axis = {
      start: { year: 0 }, end: { year: 200 },
      segments: [{ until: { year: 100 }, weight: 4 }, { until: { year: 200 }, weight: 1 }],
    };
    expect(makeScale(clearly, WIDTH).coupures).toHaveLength(1);
  });

  it('marque trois coupures sur la frise des grandes périodes', () => {
    const scale = makeScale(grandesPeriodes.axis, WIDTH);
    expect(scale.segments).toHaveLength(4);
    expect(scale.coupures.length).toBeGreaterThanOrEqual(2);
    // La préhistoire est massivement comprimée…
    expect(scale.segments[0]!.pxPerYear).toBeLessThan(scale.segments[3]!.pxPerYear / 1000);
    // …mais reste visible et ordonnée.
    expect(scale.segments[0]!.x1).toBeLessThan(scale.segments[1]!.x0);
  });

  it('extrapole les dates hors de l’axe sans les rogner (format.md §4)', () => {
    const scale = makeScale(revolution.axis, WIDTH);
    const before = scale.timeToX(toFractionalYear({ year: 1700 }));
    const after = scale.timeToX(toFractionalYear({ year: 1900 }));
    expect(before).toBeLessThan(0);
    expect(after).toBeGreaterThan(WIDTH);
    expect(scale.xToTime(before)).toBeCloseTo(1700, 6);
    expect(scale.xToTime(after)).toBeCloseTo(1900, 6);
  });

  it('reste défini pour une largeur nulle ou un zoom absurde', () => {
    expect(() => makeScale(oneSegment, 0, 0, 0)).not.toThrow();
    expect(Number.isFinite(makeScale(oneSegment, 0, 0, 0).timeToX(1800))).toBe(true);
  });
});
