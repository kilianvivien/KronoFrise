import { expect, it } from 'vitest';
import { CanvasPointers, pinchZoom } from './canvasPointers';

it('tracks a two-finger pinch without allowing a third finger to steal it', () => {
  const pointers = new CanvasPointers();
  expect(pointers.down({ id: 1, type: 'touch', x: 100, y: 80 })).toBe('start');
  expect(pointers.down({ id: 2, type: 'touch', x: 200, y: 80 })).toBe('pinch');
  expect(pointers.down({ id: 3, type: 'touch', x: 400, y: 90 })).toBe('ignore');
  pointers.move({ id: 2, type: 'touch', x: 300, y: 80 });
  expect(pointers.pair()).toEqual({ x: 200, y: 80, distance: 200 });
  expect(pinchZoom(2, 100, pointers.pair()!.distance)).toBe(4);
  pointers.up(1);
  expect(pointers.pair()).toBeNull();
});

it('prioritizes Pencil over an existing finger and ignores palm contacts until the pen lifts', () => {
  const pointers = new CanvasPointers();
  pointers.down({ id: 1, type: 'touch', x: 100, y: 80 });
  expect(pointers.down({ id: 2, type: 'pen', x: 200, y: 80 })).toBe('start');
  expect(pointers.has(1)).toBe(false);
  expect(pointers.down({ id: 3, type: 'touch', x: 300, y: 80 })).toBe('ignore');
  pointers.move({ id: 3, type: 'touch', x: 350, y: 80 });
  expect(pointers.has(2)).toBe(true);
  expect(pointers.pair()).toBeNull();
  pointers.up(3);
  expect(pointers.has(2)).toBe(true);
  pointers.up(2);
  expect(pointers.down({ id: 4, type: 'touch', x: 100, y: 80 })).toBe('start');
});

it('keeps a mouse drag stable and resets cleanly after cancellation', () => {
  const pointers = new CanvasPointers();
  pointers.down({ id: 1, type: 'mouse', x: 100, y: 80 });
  expect(pointers.down({ id: 2, type: 'touch', x: 200, y: 80 })).toBe('ignore');
  pointers.clear();
  expect(pointers.has(1)).toBe(false);
  expect(pointers.down({ id: 2, type: 'touch', x: 200, y: 80 })).toBe('start');
  expect(pinchZoom(1, 100, 10)).toBe(1);
  expect(pinchZoom(4000, 100, 200)).toBe(5000);
});
