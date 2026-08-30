import { expect, it } from 'vitest';
import { createDocument, linearAxis } from '../core/document';
import { antiquite, revolution } from '../core/fixtures';
import { fitInsets } from './fit';
import { layout } from './layout';
import { makeScale } from './scale';

it.each([antiquite, revolution].map((doc) => ({ title: doc.meta.title, doc })))('fits visible label footprints at 100%: $title', ({ doc }) => {
  const width = 655, insets = fitInsets(doc, width);
  const scene = layout(doc, makeScale(doc.axis, width, 0, 1, insets));
  for (const event of scene.events) { expect(event.chip.x).toBeGreaterThanOrEqual(7.8); expect(event.chip.x + event.chip.width).toBeLessThanOrEqual(width - 7.8); }
});
it('reserves room for an image at the first date and a long label at the last date', () => {
  const doc = createDocument({ axis: linearAxis({ year: 1789 }, { year: 1804 }) });
  doc.items = [
    { kind: 'event', id: 'first', laneId: doc.lanes[0]!.id, label: 'Prise de la Bastille', color: 'brique', date: { year: 1789 }, image: { src: 'data:image/png;base64,a' } },
    { kind: 'event', id: 'last', laneId: doc.lanes[0]!.id, label: 'Napoléon devient empereur', color: 'brique', date: { year: 1804 } },
  ];
  const scale = makeScale(doc.axis, 655, 0, 1, fitInsets(doc, 655));
  for (const event of layout(doc, scale).events) { expect(event.chip.x).toBeGreaterThanOrEqual(8); expect(event.chip.x + event.chip.width).toBeLessThanOrEqual(647); }
  for (const time of [1789, 1792, 1804]) expect(scale.xToTime(scale.timeToX(time))).toBeCloseTo(time, 7);
});
