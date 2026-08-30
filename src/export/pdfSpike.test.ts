import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { grandesPeriodes, revolution } from '../core/fixtures/index';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { TOKENS, resolveToken, toRgb01 } from '../ui/tokenValues';
import { rulerToPdf, toWinAnsi } from './pdfSpike';

const OUT_DIR = process.env['KRONO_PDF_OUT'];

describe('jetons de couleur', () => {
  it('lit les valeurs dans tokens.css, sans les recopier', () => {
    expect(TOKENS['--text-primary']).toBe('#2C2925');
    expect(resolveToken('var(--accent)')).toBe('#B24E33');
    expect(toRgb01('var(--on-accent)')).toEqual({ r: 1, g: 1, b: 1 });
  });
});

describe('sonde PDF (PLAN.md §7.6)', () => {
  it('produit un PDF vectoriel de l’axe', async () => {
    const doc = revolution;
    const scene = layout(doc, makeScale(doc.axis, 1200));
    const bytes = await rulerToPdf(scene, doc.meta.title);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    if (OUT_DIR !== undefined) {
      mkdirSync(dirname(join(OUT_DIR, 'x')), { recursive: true });
      writeFileSync(join(OUT_DIR, 'sonde-revolution.pdf'), bytes);
    }
  });

  it('replie les exposants ordinaux absents des polices standard', async () => {
    expect(toWinAnsi('XVIIᵉ siècle')).toBe('XVIIe siècle');
    expect(toWinAnsi('Iᵉʳ siècle')).toBe('Ier siècle');
    // L'espace fine insécable des grands nombres devient une espace insécable
    // ordinaire, présente dans WinAnsi.
    expect(toWinAnsi('3\u202F000 av. J.-C.')).toBe('3\u00A0000 av. J.-C.');

    const scene = layout(grandesPeriodes, makeScale(grandesPeriodes.axis, 1200));
    const bytes = await rulerToPdf(scene, grandesPeriodes.meta.title);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    if (OUT_DIR !== undefined) {
      writeFileSync(join(OUT_DIR, 'sonde-grandes-periodes.pdf'), bytes);
    }
  });
});
