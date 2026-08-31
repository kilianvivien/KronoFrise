import { describe, expect, it } from 'vitest';
import {
  contrastRatio, contrastText, GREAT_PERIOD_COLORS, ink, mix, PALETTE, tint,
} from './palette';

/** Seuil WCAG AA pour du texte courant (DESIGN.md §7). */
const AA = 4.5;

describe('accessibilité de la palette', () => {
  it('rend chaque libellé lisible sur son propre remplissage', () => {
    for (const entry of PALETTE) {
      const ratio = contrastRatio(ink(entry.base), tint(entry.base));
      expect(`${entry.name} ${ratio.toFixed(2)}`).toBe(`${entry.name} ${Math.max(ratio, AA).toFixed(2)}`);
    }
  });
  it('garde les couleurs des grandes périodes lisibles elles aussi', () => {
    for (const [name, base] of Object.entries(GREAT_PERIOD_COLORS)) {
      expect(`${name} ${(contrastRatio(ink(base), tint(base)) >= AA)}`).toBe(`${name} true`);
    }
  });
  it('choisit le noir ou le blanc qui contraste le mieux sur un fond plein', () => {
    for (const entry of PALETTE) {
      const chosen = contrastText(entry.base);
      const other = chosen === '#FFFFFF' ? '#000000' : '#FFFFFF';
      expect(contrastRatio(chosen, entry.base)).toBeGreaterThanOrEqual(contrastRatio(other, entry.base));
      expect(contrastRatio(chosen, entry.base)).toBeGreaterThanOrEqual(AA);
    }
  });
  it('mesure le contraste selon WCAG : blanc sur noir vaut 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#B24E33', '#B24E33')).toBeCloseTo(1, 5);
    expect(mix('#000000', '#FFFFFF', .5)).toBe('#808080');
  });
});
