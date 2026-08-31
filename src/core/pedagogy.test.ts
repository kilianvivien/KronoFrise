import { describe, expect, it } from 'vitest';
import { revolution } from './fixtures/index';
import { apply, invert } from './commands';
import { maskOf } from './document';
import { clearMasks, hides, maskAll, maskRandom, maskedCount, setMask } from './pedagogy';

/** Tirage déterministe : la fiche produite est reproductible dans les tests. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] as number;
}

describe('fiche élève', () => {
  it('masque un élément sans jamais toucher à ses données', () => {
    const item = revolution.items[0]!;
    const masked = apply(revolution, setMask(item.id, 'both'));
    expect(maskOf(masked, item.id)).toBe('both');
    expect(masked.items).toEqual(revolution.items);
  });

  it('masque tous les libellés puis tout affiche, en une étape annulable', () => {
    const command = maskAll(revolution, 'label');
    const inverse = invert(revolution, command);
    const masked = apply(revolution, command);
    expect(maskedCount(masked)).toBe(revolution.items.length);
    expect(masked.pedagogy.maskedItems.every((mask) => mask.hide === 'label')).toBe(true);
    expect(apply(masked, inverse)).toEqual(revolution);

    const cleared = apply(masked, clearMasks());
    expect(maskedCount(cleared)).toBe(0);
    expect(apply(cleared, invert(masked, clearMasks()))).toEqual(masked);
  });

  it('masque la moitié des éléments au hasard, sans doublon', () => {
    const command = maskRandom(revolution, 0.5, 'label', sequence([0.1, 0.9, 0.42, 0.7, 0.3]));
    const masked = apply(revolution, command);
    expect(maskedCount(masked)).toBe(Math.round(revolution.items.length / 2));
    const ids = masked.pedagogy.maskedItems.map((mask) => mask.itemId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => revolution.items.some((item) => item.id === id))).toBe(true);
  });

  it('donne la même fiche pour le même tirage', () => {
    const draw = () => maskRandom(revolution, 0.5, 'both', sequence([0.2, 0.8, 0.55]));
    expect(draw()).toEqual(draw());
  });

  it('borne la part masquée entre rien et tout', () => {
    expect(apply(revolution, maskRandom(revolution, 0, 'label')).pedagogy.maskedItems).toEqual([]);
    expect(maskedCount(apply(revolution, maskRandom(revolution, 3, 'label')))).toBe(revolution.items.length);
  });

  it('sait quel champ un masque cache', () => {
    expect(hides('both', 'label')).toBe(true);
    expect(hides('both', 'date')).toBe(true);
    expect(hides('label', 'date')).toBe(false);
    expect(hides(undefined, 'label')).toBe(false);
  });
});
