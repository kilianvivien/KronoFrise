import { expect, it } from 'vitest';
import { antiquite } from '../core/fixtures';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { THEMES, JOURNAL, CRAIE } from '../themes';
import { renderToSvgString } from './renderToSvgString';
import { themeColors } from './themeColors';
import { resolveToken } from '../ui/tokenValues';

it.each(THEMES)('$name produces a standalone SVG with the same geometry', (theme) => {
  const scene = layout(antiquite, makeScale(antiquite.axis, 1200));
  const svg = renderToSvgString({ scene, theme, title: antiquite.meta.title });
  expect(svg).toContain(resolveToken(theme.paper));
  expect(svg).toContain('Pax Romana');
  expect(svg).not.toMatch(/NaN|Infinity|undefined/);
});
it('Journal removes palette hues, Craie uses light ink on a dark board', () => {
  expect(themeColors('brique', JOURNAL)).toEqual(themeColors('canard', JOURNAL));
  expect(themeColors('brique', CRAIE).text).toBe(resolveToken(CRAIE.axisInk));
});
it('collapsed lanes hide their items and reserve only a compact header', () => {
  const doc = structuredClone(antiquite); doc.lanes[0]!.collapsed = true;
  const scene = layout(doc, makeScale(doc.axis, 1000), { height: 900 });
  expect(scene.lanes[0]!.height).toBe(32);
  expect([...scene.events, ...scene.periods].some((item) => item.laneId === doc.lanes[0]!.id)).toBe(false);
});
