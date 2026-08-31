import { expect, it } from 'vitest';
import { antiquite } from '../core/fixtures';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { THEMES, JOURNAL, CRAIE, OFFICIELLE } from '../themes';
import { renderToSvgString } from './renderToSvgString';
import { themeColors } from './themeColors';
import { resolveToken } from '../ui/tokenValues';
import { contrastRatio, PALETTE } from '../shared/palette';

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

it('garde chaque libellé lisible sur son remplissage, dans les six thèmes', () => {
  // Un thème redéfinit `fill` et `text` : le contrôle de contraste de
  // DESIGN.md §7 doit donc valoir thème par thème, pas seulement sur la
  // palette nue. Un thème sombre ou fortement coloré est exactement là où
  // une paire mal choisie passerait inaperçue.
  for (const theme of THEMES) {
    for (const entry of PALETTE) {
      const { fill, text } = themeColors(entry.id, theme);
      const ratio = contrastRatio(text, fill);
      expect(`${theme.id}/${entry.id} ${ratio >= 4.5}`).toBe(`${theme.id}/${entry.id} true`);
    }
  }
});
it('Frise officielle colore franchement la bande, là où le manuel la teinte', () => {
  const officielle = themeColors('ardoise', OFFICIELLE);
  const manuel = themeColors('ardoise', THEMES[0]!);
  // Un remplissage plus saturé est plus éloigné du papier que la teinte légère.
  expect(contrastRatio(officielle.fill, resolveToken(OFFICIELLE.paper)))
    .toBeGreaterThan(contrastRatio(manuel.fill, resolveToken(THEMES[0]!.paper)));
});
it('expose six thèmes, tous nommés et d’identifiant unique (PLAN.md §3.4)', () => {
  expect(THEMES.length).toBeGreaterThanOrEqual(6);
  expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);
  for (const theme of THEMES) expect(theme.name.length).toBeGreaterThan(0);
});
