import { describe, expect, it } from 'vitest';
import { createDocument, linearAxis } from './document';
import { KronoParseError, parseDocument, safeParseDocument } from './schema';
import type { KronoDocument } from './types';

function valid(): KronoDocument {
  const doc = createDocument({ axis: linearAxis({ year: -800 }, { year: 500 }) });
  return {
    ...doc,
    items: [
      {
        id: 'e1', kind: 'event', laneId: doc.lanes[0]!.id, label: 'Fondation de Rome',
        color: 'ocre', date: { year: -752, circa: true },
      },
    ],
  };
}

/** Un aller-retour JSON, comme à l'ouverture d'un fichier. */
function reparse(doc: unknown): KronoDocument {
  return parseDocument(JSON.parse(JSON.stringify(doc)));
}

describe('parseDocument', () => {
  it('accepte un document neuf', () => {
    expect(reparse(createDocument())).toBeTruthy();
  });

  it('conserve le document à l’identique', () => {
    const doc = valid();
    expect(reparse(doc)).toEqual(doc);
  });

  it('refuse ce qui n’est pas une frise', () => {
    expect(() => parseDocument(null)).toThrow(KronoParseError);
    expect(() => parseDocument([])).toThrow(/n’est pas une frise/);
    expect(() => parseDocument({ hello: 'world' })).toThrow(/n’est pas une frise/);
  });

  it('nomme la mise à jour pour un schéma inconnu', () => {
    expect(() => parseDocument({ schema: 'krono/9' })).toThrow(/version plus récente/);
  });

  it('refuse un axe dont la fin précède le début', () => {
    const doc = { ...valid(), axis: { start: { year: 1900 }, end: { year: 1800 }, segments: [{ until: { year: 1800 }, weight: 1 }] } };
    expect(() => reparse(doc)).toThrow(/postérieure/);
  });

  it('refuse des segments non ordonnés', () => {
    const doc = valid();
    doc.axis = {
      start: { year: 0 }, end: { year: 100 },
      segments: [{ until: { year: 60 }, weight: 1 }, { until: { year: 30 }, weight: 1 }, { until: { year: 100 }, weight: 1 }],
    };
    expect(() => reparse(doc)).toThrow(/classés par date croissante/);
  });

  it('exige que le dernier segment finisse à la fin de l’axe', () => {
    const doc = valid();
    doc.axis = { start: { year: 0 }, end: { year: 100 }, segments: [{ until: { year: 60 }, weight: 1 }] };
    expect(() => reparse(doc)).toThrow(/dernier segment/);
  });

  it('refuse un poids nul ou négatif', () => {
    const doc = valid();
    doc.axis = { start: { year: 0 }, end: { year: 100 }, segments: [{ until: { year: 100 }, weight: 0 }] };
    expect(() => reparse(doc)).toThrow(/strictement positive/);
  });

  it('refuse plus de 8 segments', () => {
    const doc = valid();
    doc.axis = {
      start: { year: 0 }, end: { year: 900 },
      segments: Array.from({ length: 9 }, (_, i) => ({ until: { year: (i + 1) * 100 }, weight: 1 })),
    };
    expect(() => reparse(doc)).toThrow(/8 segments/);
  });

  it('exige au moins une bande', () => {
    expect(() => reparse({ ...valid(), lanes: [], items: [] })).toThrow(/au moins une bande/);
  });

  it('refuse un élément rattaché à une bande inexistante', () => {
    const doc = valid();
    doc.items[0]!.laneId = 'inconnue';
    expect(() => reparse(doc)).toThrow(/bande inexistante/);
  });

  it('refuse une période qui se termine avant son début', () => {
    const doc = valid();
    doc.items.push({
      id: 'p1', kind: 'period', laneId: doc.lanes[0]!.id, label: 'À l’envers',
      color: 'brique', start: { year: 500 }, end: { year: 400 }, shape: 'bar',
    });
    expect(() => reparse(doc)).toThrow(/se terminer après son début/);
  });

  it('refuse un jour sans mois et un jour impossible', () => {
    const doc = valid();
    doc.items[0] = { ...doc.items[0]!, kind: 'event', date: { year: 1789, day: 14 } };
    expect(() => reparse(doc)).toThrow();
    const other = valid();
    other.items[0] = { ...other.items[0]!, kind: 'event', date: { year: 1789, month: 2, day: 30 } };
    expect(() => reparse(other)).toThrow();
  });

  it('garde les éléments hors de l’axe (jamais rognés, format.md §4)', () => {
    const doc = valid();
    doc.items[0] = { ...doc.items[0]!, kind: 'event', date: { year: 1789 } };
    expect(reparse(doc).items).toHaveLength(1);
  });

  it('safeParseDocument ne lève pas', () => {
    const result = safeParseDocument({ schema: 'krono/1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.issues.length).toBeGreaterThan(0);
  });
});
