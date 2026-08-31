import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { revolution } from '../core/fixtures/index';
import { exportExercise, shuffle } from './exercise';

const A4 = { size: 'a4', orientation: 'landscape', wall: false } as const;

describe('fiche d’exercice à découper', () => {
  it('ajoute une planche d’étiquettes après la frise masquée', async () => {
    const pdf = await PDFDocument.load(await exportExercise(revolution, A4));
    expect(pdf.getPageCount()).toBe(2);
  }, 20_000);

  it('mélange les étiquettes, toujours de la même façon', () => {
    const labels = revolution.items.map((item) => item.label);
    const once = shuffle(labels, revolution.id);
    expect(shuffle(labels, revolution.id)).toEqual(once);
    expect(once).not.toEqual(labels);
    expect([...once].sort()).toEqual([...labels].sort());
    expect(shuffle(labels, 'autre-document')).not.toEqual(once);
  });
});
