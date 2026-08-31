import { describe, expect, it } from 'vitest';
import fontkit from '@pdf-lib/fontkit';
import { formatDate } from '../core/dates';
import { antiquite, grandesPeriodes, revolution, stress } from '../core/fixtures/index';
import { approximateMeasurer } from '../layout/measure';
import { EMBEDDED_FONTS } from './fonts';

interface Face {
  unitsPerEm: number;
  layout(text: string): { advanceWidth: number };
  hasGlyphForCodePoint(code: number): boolean;
}
const face = (bytes: Uint8Array): Face => fontkit.create(Buffer.from(bytes));
const width = (font: Face, text: string, size: number): number =>
  font.layout(text).advanceWidth / font.unitsPerEm * size;

const FACES = [
  ['normale', face(EMBEDDED_FONTS.regular()), 400],
  ['demi-grasse', face(EMBEDDED_FONTS.semibold()), 600],
] as const;

/** Tout ce que l'application peut écrire sur une frise. */
const TEXTS = new Set<string>(['XVIIᵉ siècle', 'Iᵉʳ siècle av. J.-C.', '12 000 av. J.-C.']);
for (const doc of [antiquite, grandesPeriodes, revolution, stress]) {
  for (const item of doc.items) {
    TEXTS.add(item.label);
    TEXTS.add(formatDate(item.kind === 'event' ? item.date : item.start));
  }
}

describe('polices incorporées', () => {
  it('sont de vraies TrueType, pas un fichier manqué', () => {
    for (const load of [EMBEDDED_FONTS.regular, EMBEDDED_FONTS.semibold]) {
      const bytes = load();
      expect(bytes.length).toBeGreaterThan(10_000);
      // En-tête TrueType : 0x00010000 (« sfnt »).
      expect([...bytes.slice(0, 4)]).toEqual([0, 1, 0, 0]);
    }
  });

  it('portent l’exposant ordinal, la raison même de leur présence', () => {
    // U+1D49 « ᵉ » et U+02B3 « ʳ » manquent aux 14 polices standard du PDF
    // *et* aux sous-ensembles « latin » servis par défaut (docs/spec-gaps.md §8).
    for (const [name, font] of FACES) {
      for (const char of ['ᵉ', 'ʳ']) {
        expect(`${name} ${char} ${font.hasGlyphForCodePoint(char.codePointAt(0)!)}`).toBe(`${name} ${char} true`);
      }
    }
  });

  it('couvrent toute la typographie française employée', () => {
    for (const [name, font] of FACES) {
      for (const char of 'àâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ’–—…«»° ') {
        expect(`${name} ${char} ${font.hasGlyphForCodePoint(char.codePointAt(0)!)}`).toBe(`${name} ${char} true`);
      }
    }
  });

  it('tiennent dans les boîtes mesurées avec les métriques de SF Pro', () => {
    // La mise en page est calculée avec `layout/measure.ts`, dont la table est
    // relevée sur SF Pro Text — la police de l'écran. Si la police du PDF est
    // plus large, le texte déborde **au seul endroit qu'on ne regarde pas** :
    // le papier. C'est ce qui a dicté le choix d'Inter plutôt qu'une autre.
    for (const [name, font, weight] of FACES) {
      let worst = { text: '', ratio: 0 };
      for (const text of TEXTS) {
        for (const size of [13, 11]) {
          const ratio = width(font, text, size) / approximateMeasurer.measure(text, size, weight);
          if (ratio > worst.ratio) worst = { text: `${text} @${size}px`, ratio };
        }
      }
      // 3 % de tolérance : la puce réserve 8 px de rembourrage de chaque côté,
      // qui absorbent l'écart. Au-delà, un libellé finirait par sortir.
      expect(`${name} ${worst.ratio < 1.03} (${worst.ratio.toFixed(3)} — ${worst.text})`)
        .toBe(`${name} true (${worst.ratio.toFixed(3)} — ${worst.text})`);
    }
  });
});
