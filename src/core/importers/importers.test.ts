import { describe, expect, it } from 'vitest';
import micetfExport from '../fixtures/micetf-export.json';
import { revolution } from '../fixtures/index';
import { parseDocument } from '../schema';
import { detectSeparator, importCsv } from './csv';
import { importMicetf, isMicetf } from './micetf';
import { importText } from './index';
import { MICETF_COLORS, paletteFor } from './micetfColors';

describe('import MiCetF', () => {
  it('convertit un export réel de micetf.fr', () => {
    const doc = parseDocument(importMicetf(micetfExport));
    expect(doc.axis.start.year).toBe(400);
    expect(doc.axis.end.year).toBe(1600);
    expect(doc.axis.segments).toHaveLength(1);
    expect(doc.lanes).toHaveLength(1);
    expect(doc.items.filter((item) => item.kind === 'event')).toHaveLength(3);
    expect(doc.items.filter((item) => item.kind === 'period')).toHaveLength(4);
    const clovis = doc.items.find((item) => item.label === 'Mort de Clovis');
    expect(clovis?.kind).toBe('event');
    expect(clovis?.color).toBe('ocre');
    const moyenAge = doc.items.find((item) => item.label === 'Moyen Age');
    expect(moyenAge).toMatchObject({ kind: 'period', color: 'brique', start: { year: 500 }, end: { year: 1500 } });
  });

  it('reprend « frise à compléter » comme masques de fiche élève', () => {
    const doc = importMicetf(micetfExport);
    expect(doc.pedagogy.maskedItems).toHaveLength(doc.items.length);
    expect(doc.pedagogy.maskedItems.every((mask) => mask.hide === 'label')).toBe(true);
    const visible = importMicetf({ ...micetfExport, oubli: false });
    expect(visible.pedagogy.maskedItems).toEqual([]);
  });

  it('ignore les champs inconnus et les entrées incomplètes, sans échouer', () => {
    const doc = importMicetf({
      debut: 0, fin: 100, inconnu: 'peu importe',
      evenements: [{ date: 50, text: 'Bon', couleur: 'inconnue', distance: -20 }, { text: 'Sans date' }, null],
      periodes: [{ debut: 10, fin: 5, text: 'À l’envers' }, { debut: 10, fin: 20, name: 'Ancien champ' }],
    });
    expect(doc.items.map((item) => item.label)).toEqual(['Bon', 'Ancien champ']);
    expect(doc.items[0]!.color).toBe('brique');
  });

  it('refuse ce qui n’est pas une frise MiCetF', () => {
    expect(isMicetf(revolution)).toBe(false);
    expect(() => importMicetf({ debut: 'x', fin: 10 })).toThrow();
    expect(() => importMicetf({ debut: 100, fin: 100, evenements: [] })).toThrow();
  });

  it('ramène les 50 couleurs à la palette des 12', () => {
    expect(Object.keys(MICETF_COLORS)).toHaveLength(50);
    expect(paletteFor('GREEN')).toBe('foret');
    expect(paletteFor(undefined)).toBe('brique');
  });
});

describe('import CSV', () => {
  it('détecte le séparateur et les colonnes, quel que soit l’en-tête', () => {
    expect(detectSeparator('date;libellé;description')).toBe(';');
    expect(detectSeparator('date\tlibellé')).toBe('\t');
    expect(detectSeparator('date,libellé')).toBe(',');
    const { document } = importCsv('DATE;Libellé;Description\n1789;Révolution;Prise de la Bastille');
    expect(document.items[0]).toMatchObject({ kind: 'event', label: 'Révolution', description: 'Prise de la Bastille' });
  });

  it('crée une période quand une fin est donnée', () => {
    const { document } = importCsv('debut;fin;titre\n1799;1815;Empire\n1804;;Sacre');
    expect(document.items[0]).toMatchObject({ kind: 'period', start: { year: 1799 }, end: { year: 1815 } });
    expect(document.items[1]!.kind).toBe('event');
  });

  it('accepte les dates françaises et approximatives', () => {
    const { document } = importCsv('date;nom\nv. 800;Charlemagne\n-52;Alésia\nXVIe siècle;Renaissance\n14/07/1789;Bastille');
    expect(document.items).toHaveLength(4);
    expect(document.items[0]).toMatchObject({ date: { year: 800, circa: true } });
    expect(document.items[1]).toMatchObject({ date: { year: -51 } });
    expect(document.items[3]).toMatchObject({ date: { year: 1789, month: 7, day: 14 } });
  });

  it('signale les lignes ignorées au lieu d’abandonner l’import', () => {
    const { document, skipped } = importCsv('date;nom\n1789;Bastille\nnimporte quoi;Perdu\n;Sans date\n1815;Waterloo');
    expect(document.items).toHaveLength(2);
    expect(skipped).toEqual([2, 3]);
  });

  it('lit un collage sans en-tête, dans l’ordre canonique', () => {
    const { document } = importCsv('1515;Marignan;Victoire de François Ier');
    expect(document.items[0]).toMatchObject({ label: 'Marignan', date: { year: 1515 } });
  });

  it('respecte les guillemets et les couleurs de la palette', () => {
    const { document } = importCsv('date;nom;couleur\n1643;"Louis XIV, roi";Encre');
    expect(document.items[0]!.label).toBe('Louis XIV, roi');
    expect(document.items[0]!.color).toBe('encre');
  });

  it('produit un axe qui contient tous les éléments', () => {
    const { document } = importCsv('date;nom\n-3000;Écriture\n1789;Révolution');
    expect(document.axis.start.year).toBeLessThanOrEqual(-3000);
    expect(document.axis.end.year).toBeGreaterThanOrEqual(1789);
    expect(() => parseDocument(document)).not.toThrow();
  });
});

describe('choix de l’importateur', () => {
  it('reconnaît une frise .krono, un export MiCetF et un tableau', () => {
    expect(importText(JSON.stringify(revolution)).source).toBe('krono');
    expect(importText(JSON.stringify(micetfExport)).source).toBe('micetf');
    expect(importText('date;nom\n1789;Bastille').source).toBe('csv');
  });

  it('nomme le correctif quand le fichier n’est ni l’un ni l’autre', () => {
    expect(() => importText('')).toThrow();
    expect(() => importText('{"quelque": "chose"}')).toThrow(/KronoFrise/);
  });
});
