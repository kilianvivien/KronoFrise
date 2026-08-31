import { describe, expect, it } from 'vitest';
import { antiquite, grandesPeriodes, revolution, stress } from '../core/fixtures/index';
import type { KronoDocument } from '../core/types';
import { layout } from './layout';
import { makeScale } from './scale';
import { visibleScene } from './scene';
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

describe('layout regressions found during M1 browser verification', () => {
  it('reserves vertical space for bracket labels beside event chips', () => {
    const scene = sceneOf(antiquite);
    for (const bracket of scene.periods.filter((period) => period.shape === 'bracket')) {
      const labelTop = bracket.y - 20;
      for (const event of scene.events.filter((event) => event.laneId === bracket.laneId && event.row > bracket.row)) {
        expect(event.chip.y + event.chip.height).toBeLessThanOrEqual(labelTop);
      }
    }
  });
  it('chooses event-date visibility independently for each elastic segment', () => {
    const scene = sceneOf(grandesPeriodes, 0, 20);
    const scale = makeScale(grandesPeriodes.axis, WIDTH, 0, 20);
    for (const event of scene.events) {
      const segment = scale.segments.find((segment) => event.x >= segment.x0 && event.x <= segment.x1);
      if (segment && segment.pxPerYear >= 72) expect(event.showDate).toBe(true);
      if (segment && segment.pxPerYear < 1) expect(event.showDate).toBe(false);
    }
  });
});

describe('élagage par fenêtre (visibleScene)', () => {
  const viewportOf = (scene: ReturnType<typeof sceneOf>) => ({ x0: 0, x1: scene.width });

  it('ne retire rien quand toute la frise tient dans la fenêtre', () => {
    const scene = sceneOf(revolution);
    expect(visibleScene(scene, { x0: -scene.width, x1: scene.width * 2 })).toBe(scene);
  });

  it('retire l’écrasante majorité des éléments à fort zoom', () => {
    const scene = sceneOf(stress, 0, 400);
    const culled = visibleScene(scene, viewportOf(scene));
    expect(scene.events.length + scene.periods.length).toBe(500);
    expect(culled.events.length + culled.periods.length).toBeLessThan(60);
  });

  it('garde tout ce qui touche la fenêtre, et rien qui n’y touche', () => {
    const scene = sceneOf(stress, 0, 400);
    const view = viewportOf(scene);
    const culled = visibleScene(scene, view);
    const touches = (left: number, right: number) => right >= view.x0 && left <= view.x1;

    for (const event of scene.events) {
      const left = Math.min(event.x, event.chip.x);
      const right = Math.max(event.x, event.chip.x + event.chip.width);
      expect(`${event.itemId} ${culled.events.includes(event)}`).toBe(`${event.itemId} ${touches(left, right)}`);
    }
    for (const period of scene.periods) {
      const right = period.labelInside ? period.x1 : Math.max(period.x1, period.labelX + period.labelWidth);
      expect(`${period.itemId} ${culled.periods.includes(period)}`).toBe(`${period.itemId} ${touches(period.x0, right)}`);
    }
  });

  it('ne déplace jamais rien : la scène élaguée est un sous-ensemble exact', () => {
    const scene = sceneOf(stress, 0, 400);
    const culled = visibleScene(scene, viewportOf(scene));
    expect(culled.width).toBe(scene.width);
    expect(culled.height).toBe(scene.height);
    expect(culled.baselineY).toBe(scene.baselineY);
    expect(culled.ticks).toBe(scene.ticks);
    expect(culled.lanes).toBe(scene.lanes);
    for (const event of culled.events) expect(scene.events).toContain(event);
    for (const period of culled.periods) expect(scene.periods).toContain(period);
  });
});
