import { describe, expect, it } from 'vitest';
import { MARGIN, OVERLAP, PT_PER_PX, mm, pageDimensions, paginate, sceneHeightFor, sceneWidthFor } from './paper';

const A4_LANDSCAPE = { size: 'a4', orientation: 'landscape', wall: false } as const;

describe('mise en pages du PDF', () => {
  it('donne les formats normalisés, dans les deux sens', () => {
    expect(pageDimensions('a4', 'portrait').width).toBeCloseTo(595.28, 1);
    expect(pageDimensions('a4', 'portrait').height).toBeCloseTo(841.89, 1);
    expect(pageDimensions('a4', 'landscape')).toEqual({ width: pageDimensions('a4', 'portrait').height, height: pageDimensions('a4', 'portrait').width });
    expect(pageDimensions('a3', 'portrait').width).toBeCloseTo(841.89, 1);
    expect(mm(12)).toBeCloseTo(MARGIN, 6);
  });

  it('tient sur une page quand on ne demande pas de frise murale', () => {
    const sheet = paginate(4000, 900, A4_LANDSCAPE);
    expect(sheet.pages).toHaveLength(1);
    expect(sheet.contentWidth).toBeLessThanOrEqual(sheet.printable.width + 1e-9);
    expect(sheet.contentHeight).toBeLessThanOrEqual(sheet.printable.height + 1e-9);
  });

  it('découpe une frise murale en pages qui se recouvrent de 10 mm', () => {
    const sheet = paginate(6000, 700, { ...A4_LANDSCAPE, wall: true });
    expect(sheet.pages.length).toBeGreaterThan(1);
    for (let i = 1; i < sheet.pages.length; i++) {
      const previous = sheet.pages[i - 1]!;
      const current = sheet.pages[i]!;
      expect(current.offsetX - previous.offsetX).toBeCloseTo(sheet.printable.width - OVERLAP, 6);
      expect(current.overlapLeft).toBe(true);
    }
    // Aucune page ne manque : la dernière atteint bien le bout de la scène.
    const last = sheet.pages[sheet.pages.length - 1]!;
    expect(last.offsetX + sheet.printable.width).toBeGreaterThanOrEqual(sheet.contentWidth - 1e-6);
    expect(last.overlapRight).toBe(false);
  });

  it('ne laisse jamais la scène dépasser la hauteur imprimable', () => {
    for (const wall of [false, true]) {
      const sheet = paginate(2000, 5000, { ...A4_LANDSCAPE, wall });
      expect(sheet.contentHeight).toBeLessThanOrEqual(sheet.printable.height + 1e-9);
    }
  });

  it('met en page à la taille d’impression, pas à celle de l’écran', () => {
    const single = sceneWidthFor(A4_LANDSCAPE, 1);
    expect(single * PT_PER_PX).toBeCloseTo(pageDimensions('a4', 'landscape').width - MARGIN * 2, 6);
    const triple = sceneWidthFor(A4_LANDSCAPE, 3);
    expect(triple).toBeGreaterThan(single * 2.5);
    expect(paginate(triple, sceneHeightFor(A4_LANDSCAPE), { ...A4_LANDSCAPE, wall: true }).pages).toHaveLength(3);
  });

  it('l’A3 laisse plus de place que l’A4', () => {
    const a4 = paginate(4000, 800, A4_LANDSCAPE);
    const a3 = paginate(4000, 800, { ...A4_LANDSCAPE, size: 'a3' });
    expect(a3.scale).toBeGreaterThan(a4.scale);
  });
});
