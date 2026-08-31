import { describe, expect, it } from 'vitest';
import { apply } from '../core/commands';
import { createDocument, linearAxis } from '../core/document';
import { toFractionalYear } from '../core/dates';
import { newId } from '../core/ids';
import { makeScale } from '../layout/scale';
import { dateAtTime, datePrecision, moveSelection, nudgeStep, snapDate } from './canvasMath';

describe('canvas date manipulation', () => {
  it('snaps near ticks and Alt bypasses snap at the active precision', () => {
    const scale = makeScale(linearAxis({ year: 1700 }, { year: 1800 }), 1000);
    const x = scale.timeToX(1750) + 3;
    expect(snapDate(scale, x, false, 'month').date).toEqual({ year: 1750, month: 1 });
    expect(snapDate(scale, x, true, 'month')).toEqual({ date: { year: 1750, month: 5 }, guide: null });
  });
  it('roundtrips day placement for leap dates and BC dates', () => {
    for (const date of [{ year: 1789, month: 7, day: 14 }, { year: 0, month: 2, day: 29 }, { year: -51, month: 3, day: 15 }]) {
      expect(dateAtTime(toFractionalYear(date), 'day')).toEqual(date);
    }
  });
  it('moves a selection across BC/AD with relative spacing and precise dates intact', () => {
    const doc = createDocument(); const laneId = doc.lanes[0]!.id;
    doc.items = [
      { id: newId(), laneId, kind: 'event', label: 'A', color: 'brique', date: { year: -1, month: 7, day: 14, circa: true } },
      { id: newId(), laneId, kind: 'period', label: 'B', color: 'brique', start: { year: -2 }, end: { year: 5 }, shape: 'bar' },
    ];
    const moved = apply(doc, moveSelection(doc, doc.items.map((item) => item.id), 3, 'year'));
    expect(moved.items[0]).toMatchObject({ date: { year: 2, month: 7, day: 14, circa: true } });
    expect(moved.items[1]).toMatchObject({ start: { year: 1 }, end: { year: 8 } });
  });
});

describe('keyboard nudging', () => {
  it('steps by one displayed tick and never refines the date precision', () => {
    const scale = makeScale(linearAxis({ year: 1700 }, { year: 1800 }), 1000);
    const step = nudgeStep(scale, { year: 1750 });
    // À cette densité la règle gradue à l'année : un pas vaut une année pleine.
    expect(step).toBe(Math.round(step));
    expect(step).toBeGreaterThanOrEqual(1);

    const doc = createDocument(); const laneId = doc.lanes[0]!.id;
    doc.items = [{ id: newId(), laneId, kind: 'event', label: 'A', color: 'brique', date: { year: 1750 } }];
    const moved = apply(doc, moveSelection(doc, [doc.items[0]!.id], step, datePrecision({ year: 1750 })));
    expect(moved.items[0]).toMatchObject({ date: { year: 1750 + step } });
    expect((moved.items[0] as { date: { month?: number } }).date.month).toBeUndefined();
  });
  it('coarsens the step when the axis is zoomed out over millennia', () => {
    const wide = makeScale(linearAxis({ year: -3000 }, { year: 2000 }), 900);
    const near = makeScale(linearAxis({ year: 1700 }, { year: 1800 }), 900);
    expect(nudgeStep(wide, { year: 0 })).toBeGreaterThan(nudgeStep(near, { year: 1750 }));
  });
  it('reads the step from the segment under the item, not from the whole axis', () => {
    // Axe élastique : préhistoire comprimée, époque contemporaine dilatée.
    const axis = { start: { year: -3000 }, end: { year: 2000 }, segments: [{ until: { year: 1900 }, weight: 1 }, { until: { year: 2000 }, weight: 4 }] };
    const scale = makeScale(axis, 1200);
    expect(nudgeStep(scale, { year: 1950 })).toBeLessThan(nudgeStep(scale, { year: -1000 }));
  });
});
