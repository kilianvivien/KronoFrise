import { describe, expect, it } from 'vitest';
import { splitAxis, removeAxisBreak, redistributeAxis, moveAxisBreak, setAxisBounds } from './axis';
import { createDocument, linearAxis } from './document';
import { apply, invert, type Command } from './commands';
import { greatPeriodsPreset } from './presets';
import { parseDocument } from './schema';
import { makeScale } from '../layout/scale';

const axis = linearAxis({ year: -1000 }, { year: 2000 });
describe('elastic editing', () => {
  it('splits without changing date positions, merges losslessly and undoes exactly', () => {
    const split = splitAxis(axis, { year: 1492 });
    for (const time of [-1000, 0, 476, 1492, 1789, 2000]) expect(makeScale(split, 900).timeToX(time)).toBeCloseTo(makeScale(axis, 900).timeToX(time), 7);
    expect(removeAxisBreak(split, 0)).toEqual(axis);
    const doc = createDocument({ axis }), command: Command = { name: 'setAxis', axis: split };
    expect(apply(apply(doc, command), invert(doc, command))).toEqual(doc);
  });
  it('preserves dates and total weight while redistributing adjacent widths', () => {
    const split = splitAxis(splitAxis(axis, { year: 476 }), { year: 1492 });
    for (const share of [-10, 0, .02, .25, .7, 1, 10]) {
      const next = redistributeAxis(split, 0, share);
      expect(next.segments.map((s) => s.until)).toEqual(split.segments.map((s) => s.until));
      expect(next.segments.reduce((n, s) => n + s.weight, 0)).toBeCloseTo(1);
      expect(next.segments[2]).toEqual(split.segments[2]);
      expect(next.segments.every((s) => s.weight > 0)).toBe(true);
    }
  });
  it('rejects outside/duplicate boundaries, inversions, nonfinite weights and more than 8 segments', () => {
    expect(() => splitAxis(axis, axis.start)).toThrow();
    const split = splitAxis(axis, { year: 1492 });
    expect(() => splitAxis(split, { year: 1492 })).toThrow();
    expect(() => moveAxisBreak(split, 0, { year: 2100 })).toThrow();
    expect(() => redistributeAxis(split, 0, NaN)).toThrow();
    expect(() => setAxisBounds(split, { year: 1600 }, { year: 2000 })).toThrow();
    let many = axis; for (let year = 0; year < 7; year++) many = splitAxis(many, { year });
    expect(() => splitAxis(many, { year: 8 })).toThrow();
  });
  it('inserts five contiguous school periods without losing existing content and reverses in one step', () => {
    const doc = createDocument({ axis });
    doc.items.push({ id: 'existing', kind: 'event', date: { year: 1789 }, laneId: doc.lanes[0]!.id, label: 'Bastille', color: 'brique' });
    const command = greatPeriodsPreset(doc, 2026), next = apply(doc, command);
    expect(parseDocument(next).items).toHaveLength(6);
    expect(next.items[0]).toEqual(doc.items[0]);
    expect(next.axis.segments).toHaveLength(4);
    expect(new Set(next.items.map((item) => item.id)).size).toBe(6);
    expect(apply(next, invert(doc, command))).toEqual(doc);
  });
  it('restores optional lane color, author and lane order exactly', () => {
    const doc = createDocument(); doc.lanes.push({ id: 'second', name: 'Second' });
    const command: Command = { name: 'batch', label: 'structure', commands: [
      { name: 'updateLane', laneId: doc.lanes[0]!.id, patch: { color: 'olive', collapsed: true } },
      { name: 'reorderLanes', ids: [...doc.lanes.map((l) => l.id)].reverse() }, { name: 'setAuthor', author: 'Auteur' },
    ] };
    const next = apply(doc, command);
    expect(parseDocument(next).lanes[1]!.color).toBe('olive');
    expect(apply(next, invert(doc, command))).toEqual(doc);
    expect(apply(doc, { name: 'reorderLanes', ids: ['second'] })).toEqual(doc);
  });
});
