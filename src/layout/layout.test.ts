import { describe, expect, it } from 'vitest';
import { antiquite, grandesPeriodes, revolution, stress } from '../core/fixtures/index';
import type { KronoDocument } from '../core/types';
import { layout } from './layout';
import { makeScale } from './scale';
import type { SceneGraph } from './scene';

const WIDTH = 1200;

function sceneOf(doc: KronoDocument, pan = 0, zoom = 1): SceneGraph {
  return layout(doc, makeScale(doc.axis, WIDTH, pan, zoom));
}

describe('mise en page', () => {
  it('empile sans chevauchement dans une même rangée', () => {
    for (const doc of [revolution, antiquite, grandesPeriodes]) {
      for (const zoom of [1, 2, 8]) {
        const scene = sceneOf(doc, 0, zoom);
        const boxes = [
          ...scene.events.map((e) => ({ lane: e.laneId, row: e.row, left: e.chip.x, right: e.chip.x + e.chip.width })),
          ...scene.periods.map((p) => ({ lane: p.laneId, row: p.row, left: p.x0, right: p.x1 })),
        ];
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]!;
            const b = boxes[j]!;
            if (a.lane !== b.lane || a.row !== b.row) continue;
            expect(a.left < b.right && b.left < a.right).toBe(false);
          }
        }
      }
    }
  });

  it('est déterministe', () => {
    expect(sceneOf(revolution)).toEqual(sceneOf(revolution));
  });

  it('place la rangée 0 au plus près de l’axe', () => {
    const scene = sceneOf(revolution);
    const rows = new Map<number, number>();
    for (const event of scene.events) rows.set(event.row, event.chip.y);
    expect(rows.get(0)!).toBeGreaterThan(rows.get(1) ?? -Infinity);
  });

  it('respecte une rangée épinglée', () => {
    const pinned: KronoDocument = {
      ...revolution,
      items: revolution.items.map((item) => (item.id === 'rev-e04' ? { ...item, pinnedRow: 5 } : item)),
    };
    const scene = sceneOf(pinned);
    expect(scene.events.find((e) => e.itemId === 'rev-e04')!.row).toBe(5);
  });

  it('empile les bandes de haut en bas et pose l’axe en dessous', () => {
    const scene = sceneOf(antiquite);
    expect(scene.lanes).toHaveLength(2);
    expect(scene.lanes[0]!.y).toBeLessThan(scene.lanes[1]!.y);
    expect(scene.lanes[1]!.anchorY).toBe(scene.baselineY);
    expect(scene.height).toBeGreaterThan(scene.baselineY);
  });

  it('ancre chaque événement sur la ligne de sa bande', () => {
    const scene = sceneOf(antiquite);
    for (const event of scene.events) {
      const lane = scene.lanes.find((l) => l.id === event.laneId)!;
      expect(event.dotY).toBe(lane.anchorY);
      expect(event.chip.y + event.chip.height).toBeLessThanOrEqual(lane.anchorY);
    }
  });

  it('sort le libellé d’une période trop étroite', () => {
    const scene = sceneOf(grandesPeriodes);
    const prehistory = scene.periods.find((p) => p.itemId === 'gp-p1')!;
    const contemporary = scene.periods.find((p) => p.itemId === 'gp-p5')!;
    expect(contemporary.labelInside).toBe(true);
    expect(prehistory.x1).toBeGreaterThan(prehistory.x0);
  });

  it('n’écrit les dates sous les puces que si l’échelle le permet', () => {
    expect(sceneOf(revolution).events[0]!.showDate).toBe(true);
    expect(sceneOf(grandesPeriodes).events[0]!.showDate).toBe(false);
  });

  it('garde les éléments hors de l’axe (jamais rognés)', () => {
    const outside: KronoDocument = {
      ...revolution,
      items: [...revolution.items, {
        id: 'hors-axe', kind: 'event', laneId: revolution.lanes[0]!.id,
        label: 'Hors axe', color: 'pierre', date: { year: 1500 },
      }],
    };
    const scene = sceneOf(outside);
    const item = scene.events.find((e) => e.itemId === 'hors-axe');
    expect(item).toBeDefined();
    expect(item!.x).toBeLessThan(0);
  });
});

describe('performance (docs/format.md §10 : < 5 ms pour 500 éléments)', () => {
  it('dispose la fixture de charge en moins de 5 ms', () => {
    const scale = makeScale(stress.axis, WIDTH);
    layout(stress, scale); // préchauffage
    const runs = 20;
    const start = performance.now();
    for (let i = 0; i < runs; i++) layout(stress, scale);
    const average = (performance.now() - start) / runs;
    expect(stress.items).toHaveLength(500);
    expect(average).toBeLessThan(5);
  });
});
