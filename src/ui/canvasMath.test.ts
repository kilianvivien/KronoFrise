import { describe, expect, it } from 'vitest';
import { apply } from '../core/commands';
import { createDocument, linearAxis } from '../core/document';
import { toFractionalYear } from '../core/dates';
import { newId } from '../core/ids';
import { makeScale } from '../layout/scale';
import { dateAtTime, moveSelection, snapDate } from './canvasMath';

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
