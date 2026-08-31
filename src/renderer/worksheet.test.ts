/**
 * Fiche élève — docs/format.md §5 : masquer est un drapeau de rendu, et le
 * corrigé est le même document rendu sans masques.
 */
import { describe, expect, it } from 'vitest';
import { apply } from '../core/commands';
import { revolution } from '../core/fixtures/index';
import { maskAll, setMask } from '../core/pedagogy';
import { MASK_LINE_MIN_WIDTH } from '../layout/metrics';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { renderToSvgString } from './renderToSvgString';

const WIDTH = 1200;
const scale = makeScale(revolution.axis, WIDTH);

describe('rendu de la fiche élève', () => {
  it('ne masque rien tant que le mode fiche n’est pas demandé', () => {
    const masked = apply(revolution, maskAll(revolution, 'both'));
    const scene = layout(masked, scale);
    expect(scene.events.some((event) => event.maskLabel)).toBe(false);
    expect(layout(masked, scale)).toEqual(layout(revolution, scale));
  });

  it('remplace les textes masqués par des lignes à compléter', () => {
    const masked = apply(revolution, maskAll(revolution, 'both'));
    const scene = layout(masked, scale, { worksheet: true });
    expect(scene.events.every((event) => event.maskLabel && event.maskDate)).toBe(true);
    expect(scene.periods.every((period) => period.maskLabel)).toBe(true);

    const svg = renderToSvgString({ scene, title: masked.meta.title });
    for (const item of revolution.items) expect(svg).not.toContain(item.label);
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('le corrigé est la même scène sans le drapeau', () => {
    const masked = apply(revolution, maskAll(revolution, 'label'));
    const key = renderToSvgString({ scene: layout(masked, scale), title: masked.meta.title });
    expect(key).toContain(revolution.items[0]!.label);
  });

  it('masque un seul champ à la fois', () => {
    const item = revolution.items.find((item) => item.kind === 'event')!;
    const scene = layout(apply(revolution, setMask(item.id, 'date')), scale, { worksheet: true });
    const event = scene.events.find((event) => event.itemId === item.id)!;
    expect(event.maskLabel).toBeUndefined();
    expect(event.maskDate).toBe(true);
  });

  it('réserve au moins 48 px pour écrire, même pour un libellé court', () => {
    const short = structuredClone(revolution);
    short.items[0]!.label = 'Va';
    const plain = layout(short, scale);
    const worksheet = layout(apply(short, setMask(short.items[0]!.id, 'label')), scale, { worksheet: true });
    const before = [...plain.events, ...plain.periods].find((node) => node.itemId === short.items[0]!.id)!;
    const after = [...worksheet.events, ...worksheet.periods].find((node) => node.itemId === short.items[0]!.id)!;
    expect(before.labelWidth).toBeLessThan(MASK_LINE_MIN_WIDTH);
    expect(after.labelWidth).toBe(MASK_LINE_MIN_WIDTH);
  });
});
