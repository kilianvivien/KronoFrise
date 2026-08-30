import { describe, expect, it } from 'vitest';
import { compareDates } from '../dates';
import { parseDocument } from '../schema';
import { FIXTURES, grandesPeriodes, revolution, stress } from './index';

describe('fixtures (docs/format.md §10)', () => {
  it.each(FIXTURES)('$file est un document valide après aller-retour JSON', ({ document }) => {
    expect(() => parseDocument(JSON.parse(JSON.stringify(document)))).not.toThrow();
  });

  it('revolution : 15 événements, 4 périodes, 2 images', () => {
    expect(revolution.items.filter((i) => i.kind === 'event')).toHaveLength(15);
    expect(revolution.items.filter((i) => i.kind === 'period')).toHaveLength(4);
    expect(revolution.items.filter((i) => i.image !== undefined)).toHaveLength(2);
    expect(revolution.lanes).toHaveLength(1);
  });

  it('grandes-periodes : 4 segments contigus, 5 périodes, 8 événements', () => {
    expect(grandesPeriodes.axis.segments).toHaveLength(4);
    expect(grandesPeriodes.items.filter((i) => i.kind === 'period')).toHaveLength(5);
    expect(grandesPeriodes.items.filter((i) => i.kind === 'event')).toHaveLength(8);
    const segments = grandesPeriodes.axis.segments;
    for (let i = 1; i < segments.length; i++) {
      expect(compareDates(segments[i]!.until, segments[i - 1]!.until)).toBeGreaterThan(0);
    }
    expect(segments[segments.length - 1]!.until).toEqual(grandesPeriodes.axis.end);
  });

  it('stress : 500 éléments sur 4 bandes, généré de façon déterministe', () => {
    expect(stress.items.length).toBeGreaterThanOrEqual(495);
    expect(stress.lanes).toHaveLength(4);
    expect(new Set(stress.items.map((i) => i.id)).size).toBe(stress.items.length);
  });
});
