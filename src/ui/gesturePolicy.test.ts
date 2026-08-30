import { expect, it } from 'vitest';
import { backgroundIntent, createsEvent } from './gesturePolicy';
it('never creates while navigating, including clicks, tiny drags and middle/space drags', () => {
  expect(backgroundIntent('auto', false, false, 0)).toBe('pan');
  for (const tool of ['auto', 'event', 'period'] as const) {
    expect(backgroundIntent(tool, false, true, 0)).toBe('pan');
    expect(backgroundIntent(tool, false, false, 1)).toBe('pan');
    expect(backgroundIntent(tool, true, false, 0)).toBe('marquee');
    expect(createsEvent(tool, true)).toBe(false);
  }
  expect(createsEvent('auto', false)).toBe(false);
});
it('requires an explicitly armed creation tool', () => {
  expect(backgroundIntent('event', false, false, 0)).toBe('create');
  expect(backgroundIntent('period', false, false, 0)).toBe('create');
  expect(createsEvent('event', false)).toBe(true);
});

import { clampPan } from './camera';
import { makeScale } from '../layout/scale';
import { linearAxis } from '../core/document';
it('allows grabbing left and right at 100% without losing the entire document', () => {
  const scale = makeScale(linearAxis({ year: 1788 }, { year: 1804 }), 800);
  expect(clampPan(scale, -150)).toBe(-150);
  expect(clampPan(scale, 150)).toBe(150);
  expect(clampPan(scale, -10000)).toBe(-400);
  expect(clampPan(scale, 10000)).toBe(400);
});
