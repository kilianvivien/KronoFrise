/**
 * Export PDF — la règle de fidélité (docs/format.md §9) : le PDF sort de la
 * même scène que l'écran, avec du vrai texte et zéro capture d'image.
 */
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { apply } from '../core/commands';
import { antiquite, grandesPeriodes, revolution } from '../core/fixtures/index';
import { maskAll } from '../core/pedagogy';
import { exportPdf } from './pdf';
import { roundedRectPath, toWinAnsi, translatePath } from './pdfScene';
import { pageDimensions } from './paper';
import { inflateSync } from 'node:zlib';

/**
 * Texte réellement présent dans le PDF. pdf-lib écrit des chaînes hexadécimales
 * encodées en WinAnsi : les caractères typographiques français (’ – œ) y ont
 * un code propre, qu'il faut retraduire pour comparer.
 */
const WIN_ANSI_HIGH: Record<number, string> = {
  0x82: '‚', 0x85: '…', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x96: '–', 0x97: '—', 0x9c: 'œ',
};
function pdfText(bytes: Uint8Array): string[] {
  const raw = Buffer.from(bytes).toString('latin1');
  let content = '';
  const streams = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streams.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const chunk = Buffer.from(raw.slice(start, raw.indexOf('endstream', start)), 'latin1');
    try { content += inflateSync(chunk).toString('latin1'); } catch { /* flux non compressé ou image */ }
  }
  return [...content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map(([, hex]) =>
    [...Buffer.from(hex as string, 'hex')].map((code) => WIN_ANSI_HIGH[code] ?? String.fromCharCode(code)).join(''));
}

const A4 = { size: 'a4', orientation: 'landscape', wall: false } as const;

async function pagesOf(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages();
}

describe('export PDF', () => {
  it('produit une page A4 paysage pour chaque fixture', async () => {
    for (const doc of [revolution, antiquite, grandesPeriodes]) {
      const pages = await pagesOf(await exportPdf(doc, A4));
      expect(pages).toHaveLength(1);
      const { width, height } = pageDimensions('a4', 'landscape');
      expect(pages[0]!.getWidth()).toBeCloseTo(width, 1);
      expect(pages[0]!.getHeight()).toBeCloseTo(height, 1);
    }
  }, 20_000);

  it('écrit du vrai texte, pas des contours', async () => {
    const pdf = await PDFDocument.load(await exportPdf(revolution, A4));
    const objects = pdf.context.enumerateIndirectObjects().map(([, object]) => String(object));
    // Les libellés passent par une police incorporée : ils restent du texte
    // sélectionnable, jamais des tracés (docs/format.md §9).
    expect(objects.some((object) => object.includes('Helvetica'))).toBe(true);
    // Les seules images du PDF sont celles des événements : la frise elle-même
    // n'est jamais une capture d'écran.
    const images = objects.filter((object) => object.includes('/Subtype /Image')).length;
    expect(images).toBe(revolution.items.filter((item) => item.image !== undefined).length);
    const withoutImages = await PDFDocument.load(await exportPdf(antiquite, A4));
    expect(withoutImages.context.enumerateIndirectObjects()
      .some(([, object]) => String(object).includes('/Subtype /Image'))).toBe(false);
  });

  it('écrit chaque libellé du document, accents et apostrophes compris', async () => {
    const strings = pdfText(await exportPdf(revolution, A4));
    for (const item of revolution.items) {
      expect(strings.some((value) => value.includes(item.label))).toBe(true);
    }
    expect(strings.some((value) => value.includes('’'))).toBe(true);
  });

  it('découpe une frise murale en pages numérotées', async () => {
    const bytes = await exportPdf(revolution, { ...A4, wall: true, pages: 4 });
    const pages = await pagesOf(bytes);
    expect(pages).toHaveLength(4);
  }, 20_000);

  it('conserve le titre et l’auteur du document', async () => {
    const doc = { ...revolution, meta: { ...revolution.meta, author: 'Kilian' } };
    const pdf = await PDFDocument.load(await exportPdf(doc, A4));
    expect(pdf.getTitle()).toBe(revolution.meta.title);
    expect(pdf.getAuthor()).toBe('Kilian');
  });

  it('exporte la fiche élève masquée, et le corrigé sans masques', async () => {
    const masked = apply(revolution, maskAll(revolution, 'both'));
    const worksheet = await exportPdf(masked, { ...A4, worksheet: true });
    const key = await exportPdf(masked, A4);
    expect(worksheet.byteLength).toBeGreaterThan(0);
    // Le corrigé porte tous les libellés : il est plus lourd en texte.
    expect(key.byteLength).toBeGreaterThan(worksheet.byteLength);
  }, 20_000);

  it('replie les exposants absents des polices standard', () => {
    expect(toWinAnsi('XVIIᵉ siècle')).toBe('XVIIe siècle');
    expect(toWinAnsi('1ᵉʳ janvier')).toBe('1er janvier');
  });

  it('décale une tuile de motif sans la déformer', () => {
    expect(translatePath('M0 4H8', 10, 20)).toBe('M 10 24H 18');
    expect(roundedRectPath(0, 0, 10, 10, 0)).toContain('M 0 0');
    expect(roundedRectPath(0, 0, 10, 10, 4)).toContain('A 4 4');
  });
});

describe('fiche élève imprimée', () => {
  it('ajoute le corrigé à la suite, dans le même fichier', async () => {
    const masked = apply(revolution, maskAll(revolution, 'label'));
    const plain = await PDFDocument.load(await exportPdf(masked, { ...A4, worksheet: true }));
    const withKey = await PDFDocument.load(await exportPdf(masked, { ...A4, worksheet: true, answerKey: true }));
    expect(withKey.getPageCount()).toBe(plain.getPageCount() * 2);
  }, 20_000);

  it('n’ajoute pas de corrigé hors du mode fiche élève', async () => {
    const pdf = await PDFDocument.load(await exportPdf(revolution, { ...A4, answerKey: true }));
    expect(pdf.getPageCount()).toBe(1);
  });
});
