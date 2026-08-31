import { describe, expect, it } from 'vitest';
import { linearAxis } from '../core/document';
import { grandesPeriodes } from '../core/fixtures/index';
import type { Axis } from '../core/types';
import { makeScale } from './scale';
import { MAX_MINOR_PER_MAJOR, MIN_MAJOR_STEP_PX } from './metrics';
import { approximateMeasurer } from './measure';
import { chooseStep, levelOfStep, separateLabels, tickLabelBox, type Tick } from './ticks';

const WIDTH = 1200;

function ticksFor(axis: Axis, pan = 0, zoom = 1): Tick[] {
  return makeScale(axis, WIDTH, pan, zoom).visibleTicks();
}

const labelled = (ticks: Tick[]): Tick[] => ticks.filter((t) => t.label !== undefined);

describe('choix du niveau de graduation', () => {
  it('nomme le niveau à partir du pas', () => {
    expect(levelOfStep(1 / 12)).toBe('month');
    expect(levelOfStep(1)).toBe('year');
    expect(levelOfStep(10)).toBe('decade');
    expect(levelOfStep(100)).toBe('century');
    expect(levelOfStep(1000)).toBe('millennium');
  });

  it('prend le pas le plus fin qui laisse la place au libellé', () => {
    expect(chooseStep(20) * 20).toBeGreaterThanOrEqual(MIN_MAJOR_STEP_PX);
    expect(chooseStep(1.2)).toBe(100);
    expect(chooseStep(0.0001)).toBeGreaterThanOrEqual(1_000_000);
  });
});

describe('graduations adaptatives (DESIGN.md §4)', () => {
  it('passe de l’année au siècle en dézoomant', () => {
    const decades = ticksFor(linearAxis({ year: 1770 }, { year: 1830 }));
    expect(decades.every((t) => t.level === 'year' || t.level === 'decade')).toBe(true);

    const centuries = ticksFor(linearAxis({ year: 1000 }, { year: 2000 }));
    expect(centuries.some((t) => t.level === 'century')).toBe(true);
    expect(labelled(centuries).map((t) => t.label)).toContain('XVIIᵉ siècle');
  });

  it('descend au mois en zoomant fortement', () => {
    const months = ticksFor(linearAxis({ year: 1789 }, { year: 1790 }));
    expect(months.some((t) => t.level === 'month')).toBe(true);
    expect(labelled(months).some((t) => t.label?.includes('juil.') === true)).toBe(true);
  });

  it('écrit les années avant J.-C. avec leur suffixe', () => {
    const ticks = labelled(ticksFor(linearAxis({ year: -800 }, { year: 500 })));
    expect(ticks.some((t) => t.label?.endsWith('av. J.-C.') === true)).toBe(true);
    expect(ticks.some((t) => t.label === '0')).toBe(false); // l'an 0 s'affiche « 1 av. J.-C. »
  });

  it('aligne les siècles sur leur première année', () => {
    const centuries = labelled(ticksFor(linearAxis({ year: 1000 }, { year: 2000 })));
    for (const tick of centuries) {
      expect(Math.abs(tick.t % 100)).toBeCloseTo(1, 6);
    }
  });
});

describe('anti-chevauchement des libellés', () => {
  const views: [number, number][] = [[0, 1], [0, 2.5], [500, 8], [12_000, 60]];
  const axes: Axis[] = [
    linearAxis({ year: 1770 }, { year: 1830 }),
    linearAxis({ year: -800 }, { year: 500 }),
    linearAxis({ year: -3000 }, { year: 2026 }),
    grandesPeriodes.axis,
  ];

  it.each(axes.flatMap((axis, ai) => views.map((v) => [ai, v[0], v[1], axis] as const)))(
    'axe %i, pan %i, zoom %f : deux libellés voisins ne se touchent jamais',
    (_ai, pan, zoom, axis) => {
      const ticks = labelled(makeScale(axis, WIDTH, pan, zoom).visibleTicks());
      for (let i = 1; i < ticks.length; i++) {
        const previous = ticks[i - 1]!;
        const current = ticks[i]!;
        if (previous.segmentIndex !== current.segmentIndex) continue;
        // Même mesure que celle utilisée pour amincir les libellés.
        const width = (label: string): number => approximateMeasurer.measure(label, 11);
        const half = (width(previous.label ?? '') + width(current.label ?? '')) / 2;
        expect(current.x - previous.x).toBeGreaterThanOrEqual(half);
      }
    },
  );

  // Le défaut trouvé en regardant enfin le PDF : « XXᵉ siècle » et
  // « XXIᵉ siècle » se touchaient au bord droit d'une page A4. Les libellés ne
  // se chevauchaient pas *avant* calage — c'est le calage qui les rapprochait.
  it.each([420, 620, 842, 1200, 1600])(
    'largeur %i : deux libellés dessinés ne se recouvrent jamais, calage en bord compris',
    (width) => {
      for (const axis of axes) {
        for (const [pan, zoom] of views) {
          const ticks = labelled(makeScale(axis, width, pan, zoom).visibleTicks());
          const boxes = ticks.map((tick) => tickLabelBox(tick, width, approximateMeasurer));
          for (let i = 1; i < boxes.length; i++) {
            expect(boxes[i]!.left).toBeGreaterThanOrEqual(boxes[i - 1]!.right);
          }
        }
      }
    },
  );

  it('garde le libellé de bord et sacrifie son voisin, jamais l’inverse', () => {
    // Le cas vu sur le PDF : « XXIᵉ siècle », calé contre le bord droit,
    // recouvrait « XXᵉ siècle ». C'est le voisin qui cède, pas la borne.
    const width = 1200;
    const tick = (x: number, label: string): Tick => ({ t: x, x, major: true, level: 'century', label, segmentIndex: 0 });
    const ticks = [tick(1150, 'XXᵉ siècle'), tick(1195, 'XXIᵉ siècle')];
    separateLabels(ticks, width, approximateMeasurer);
    expect(ticks[0]!.label).toBeUndefined();
    expect(ticks[1]!.label).toBe('XXIᵉ siècle');
  });

  it('au milieu du canevas, c’est le second qui s’efface', () => {
    const tick = (x: number, label: string): Tick => ({ t: x, x, major: true, level: 'century', label, segmentIndex: 0 });
    const ticks = [tick(600, 'XVIIᵉ siècle'), tick(620, 'XVIIIᵉ siècle'), tick(900, 'XIXᵉ siècle')];
    separateLabels(ticks, 1200, approximateMeasurer);
    expect(ticks.map((entry) => entry.label)).toEqual(['XVIIᵉ siècle', undefined, 'XIXᵉ siècle']);
  });

  it('ne dessine jamais plus de 10 mineures entre deux majeures', () => {
    for (const zoom of [1, 3, 12, 90]) {
      const ticks = makeScale(grandesPeriodes.axis, WIDTH, 0, zoom).visibleTicks();
      // La règle vaut à l'intérieur d'un segment : chaque segment repart de
      // zéro de l'autre côté d'une coupure.
      let minorsSinceMajor = 0;
      let segmentIndex = -1;
      for (const tick of ticks) {
        if (tick.segmentIndex !== segmentIndex) {
          segmentIndex = tick.segmentIndex;
          minorsSinceMajor = 0;
        }
        if (tick.major) minorsSinceMajor = 0;
        else expect(++minorsSinceMajor).toBeLessThanOrEqual(MAX_MINOR_PER_MAJOR);
      }
    }
  });
});

describe('axe segmenté : chaque segment a sa densité', () => {
  const scale = makeScale(grandesPeriodes.axis, WIDTH);
  const ticks = scale.visibleTicks();

  it('gradue la préhistoire beaucoup plus grossièrement que l’époque contemporaine', () => {
    const inSegment = (index: number): Tick[] => ticks.filter((t) => t.segmentIndex === index && t.major);
    const prehistorySteps = stepOf(inSegment(0));
    const modernSteps = stepOf(inSegment(3));
    expect(prehistorySteps).toBeGreaterThan(modernSteps * 1000);
  });

  it('reste dans les bornes de son segment', () => {
    for (const tick of ticks) {
      const segment = scale.segments[tick.segmentIndex]!;
      expect(tick.t).toBeGreaterThanOrEqual(segment.from - 1e-6);
      expect(tick.t).toBeLessThanOrEqual(segment.to + 1e-6);
    }
  });

  it('ne produit pas de graduations hors de la vue', () => {
    const zoomed = makeScale(grandesPeriodes.axis, WIDTH, 4000, 20).visibleTicks();
    expect(zoomed.length).toBeLessThan(400);
    for (const tick of zoomed) {
      expect(tick.x).toBeGreaterThanOrEqual(-1);
      expect(tick.x).toBeLessThanOrEqual(WIDTH + 1);
    }
  });
});

function stepOf(ticks: Tick[]): number {
  if (ticks.length < 2) return Number.POSITIVE_INFINITY;
  return Math.abs(ticks[1]!.t - ticks[0]!.t);
}
