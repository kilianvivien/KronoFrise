import { describe, expect, it } from 'vitest';
import { grandesPeriodes, revolution } from '../core/fixtures/index';
import type { KronoDocument } from '../core/types';
import { layout } from './layout';
import { makeScale } from './scale';
import type { SceneGraph } from './scene';
import { easeUi, interpolateScene, sameGeometry } from './reflow';

const WIDTH = 1200;
const sceneOf = (doc: KronoDocument): SceneGraph => layout(doc, makeScale(doc.axis, WIDTH));
const eventOf = (scene: SceneGraph, itemId: string) => scene.events.find((event) => event.itemId === itemId)!;

/**
 * Un dépôt qui force un réempilement : trois événements ramenés sur la même
 * décennie, où ils ne tiennent plus dans la même rangée.
 */
function dropped(): { before: SceneGraph; after: SceneGraph } {
  const before = sceneOf(revolution);
  const moved = new Set(revolution.items.filter((item) => item.kind === 'event').slice(0, 3).map((item) => item.id));
  const after = sceneOf({
    ...revolution,
    items: revolution.items.map((item) =>
      moved.has(item.id) && item.kind === 'event' ? { ...item, date: { year: 1793, month: 1, day: 21 } } : item,
    ),
  });
  return { before, after };
}

describe('réorganisation animée (DESIGN.md §8)', () => {
  it('part de la géométrie d’avant et arrive exactement sur celle d’après', () => {
    const { before, after } = dropped();
    for (const event of interpolateScene(before, after, 0).events) {
      const was = eventOf(before, event.itemId);
      expect(event.x).toBeCloseTo(was.x, 10);
      expect(event.dotY).toBeCloseTo(was.dotY, 10);
      expect(event.chip.x).toBeCloseTo(was.chip.x, 10);
      expect(event.chip.y).toBeCloseTo(was.chip.y, 10);
    }
    // À l'arrivée, c'est la scène elle-même : le rendu peut court-circuiter.
    expect(interpolateScene(before, after, 1)).toBe(after);
  });

  it('glisse : une puce qui change de rangée passe par les positions intermédiaires', () => {
    const { before, after } = dropped();
    const restacked = after.events.find((event) => eventOf(before, event.itemId).chip.y !== event.chip.y);
    expect(restacked).toBeDefined();
    const was = eventOf(before, restacked!.itemId);
    const middle = eventOf(interpolateScene(before, after, 0.5), restacked!.itemId);
    expect(middle.chip.y).toBeCloseTo((was.chip.y + restacked!.chip.y) / 2, 6);
    expect(middle.chip.y).toBeGreaterThan(Math.min(was.chip.y, restacked!.chip.y));
    expect(middle.chip.y).toBeLessThan(Math.max(was.chip.y, restacked!.chip.y));
  });

  it('garde l’élément d’un seul tenant : pastille, connecteur et puce font le même chemin', () => {
    const { before, after } = dropped();
    for (const t of [0, 0.25, 0.5, 0.75]) {
      for (const event of interpolateScene(before, after, t).events) {
        const was = eventOf(before, event.itemId);
        const settled = eventOf(after, event.itemId);
        // Le connecteur relie la pastille au bas de la puce : ses deux bouts
        // parcourent la même fraction du chemin, il ne peut donc pas se rompre.
        expect(event.x - event.chip.x).toBeCloseTo(
          (was.x - was.chip.x) * (1 - t) + (settled.x - settled.chip.x) * t,
          6,
        );
        // La puce reste au-dessus de la ligne d'ancrage pendant tout le
        // mouvement : rien ne traverse l'axe en chemin.
        expect(event.chip.y + event.chip.height).toBeLessThanOrEqual(event.dotY);
      }
    }
  });

  it('n’anime que ce que l’empilement décide : graduations et segments d’axe restent en place', () => {
    const { before, after } = dropped();
    const frame = interpolateScene(before, after, 0.5);
    expect(frame.ticks).toEqual(after.ticks);
    expect(frame.axisSegments).toEqual(after.axisSegments);
    expect(frame.width).toBe(after.width);
    expect(frame.baselineY).toBeCloseTo((before.baselineY + after.baselineY) / 2, 6);
    expect(frame.height).toBeCloseTo((before.height + after.height) / 2, 6);
  });

  it('fait descendre la coupure avec la ligne de base, jamais à travers les bandes', () => {
    const before = sceneOf(grandesPeriodes);
    const after = sceneOf({ ...grandesPeriodes, lanes: [...grandesPeriodes.lanes, { id: 'vide', name: 'Arts' }] });
    expect(before.coupures.length).toBeGreaterThan(0);
    const frame = interpolateScene(before, after, 0.5);
    expect(frame.coupures[0]!.x).toBe(after.coupures[0]!.x);
    expect(frame.coupures[0]!.bottom).toBeCloseTo(frame.baselineY, 6);
    expect(frame.coupures[0]!.bottom).toBeLessThan(after.coupures[0]!.bottom);
  });

  it('pose d’emblée un élément qui vient d’apparaître, et oublie celui qui a disparu', () => {
    const before = sceneOf(revolution);
    const disparu = revolution.items[0]!.id;
    const after = sceneOf({
      ...revolution,
      items: [
        ...revolution.items.filter((item) => item.id !== disparu),
        { id: 'nouveau', kind: 'event', date: { year: 1793 }, label: 'Nouveau', color: 'brique', laneId: revolution.lanes[0]!.id },
      ],
    });
    const frame = interpolateScene(before, after, 0.3);
    expect(frame.events.map((event) => event.itemId)).toEqual(after.events.map((event) => event.itemId));
    expect(eventOf(frame, 'nouveau')).toEqual(eventOf(after, 'nouveau'));
  });

  it('porte le contenu de la scène d’arrivée, jamais celui d’avant', () => {
    const before = sceneOf(revolution);
    const renamed = revolution.items.find((item) => item.kind === 'event')!.id;
    const after = sceneOf({
      ...revolution,
      items: revolution.items.map((item) => (item.id === renamed ? { ...item, label: 'Libellé changé' } : item)),
    });
    expect(eventOf(interpolateScene(before, after, 0.5), renamed).label).toBe('Libellé changé');
  });

  it('ne produit ni NaN ni infini, à n’importe quel instant', () => {
    const { before, after } = dropped();
    for (const t of [-1, 0, 0.1, 0.5, 0.9, 1, 2]) {
      const frame = interpolateScene(before, after, t);
      const numbers = [
        frame.height, frame.baselineY,
        ...frame.lanes.flatMap((lane) => [lane.y, lane.height, lane.anchorY]),
        ...frame.events.flatMap((event) => [event.x, event.dotY, event.chip.x, event.chip.y]),
        ...frame.periods.flatMap((period) => [period.x0, period.x1, period.y, period.labelX]),
        ...frame.coupures.flatMap((coupure) => [coupure.x, coupure.top, coupure.bottom]),
      ];
      for (const value of numbers) expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('une modification qui ne déplace rien ne s’anime pas', () => {
  it('reconnaît deux scènes posées au même endroit, calculées deux fois', () => {
    expect(sameGeometry(sceneOf(revolution), sceneOf(revolution))).toBe(true);
  });

  it('laisse passer un changement de couleur, retient un changement de date', () => {
    const before = sceneOf(revolution);
    const event = revolution.items.find((item) => item.kind === 'event')!;
    const recolored = sceneOf({
      ...revolution,
      items: revolution.items.map((item) => (item.id === event.id ? { ...item, color: 'canard' } : item)),
    });
    expect(sameGeometry(before, recolored)).toBe(true);
    const { after } = dropped();
    expect(sameGeometry(before, after)).toBe(false);
  });

  it('voit un élément de plus, même s’il ne bouscule personne', () => {
    const before = sceneOf(revolution);
    const after = sceneOf({
      ...revolution,
      items: [...revolution.items, { id: 'nouveau', kind: 'event', date: { year: 1793 }, label: 'Nouveau', color: 'brique', laneId: revolution.lanes[0]!.id }],
    });
    expect(sameGeometry(before, after)).toBe(false);
  });
});

describe('courbe du mouvement (jeton --ease-ui)', () => {
  it('part de 0, arrive à 1 et ne recule jamais', () => {
    expect(easeUi(0)).toBe(0);
    expect(easeUi(1)).toBe(1);
    let previous = -1;
    for (let step = 0; step <= 100; step++) {
      const value = easeUi(step / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('sort vite et arrive doucement — c’est ce que « ease-out » veut dire', () => {
    expect(easeUi(0.25)).toBeGreaterThan(0.25);
    expect(easeUi(0.5)).toBeGreaterThan(0.5);
    expect(easeUi(0.9)).toBeGreaterThan(0.9);
    // cubic-bezier(0, 0, 0.58, 1) au milieu du parcours : deux tiers du
    // chemin sont déjà faits à la moitié du temps.
    expect(easeUi(0.5)).toBeCloseTo(0.685, 3);
  });

  it('borne ce qu’on lui donne, comme le fait le navigateur', () => {
    expect(easeUi(-2)).toBe(0);
    expect(easeUi(4)).toBe(1);
  });
});
