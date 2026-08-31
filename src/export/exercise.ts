/**
 * Fiche d'exercice « replace les événements » — PLAN.md §3.5.
 *
 * La frise est celle de la fiche élève (tous les libellés masqués), suivie
 * d'une page d'étiquettes mélangées à découper. La frise passe par la chaîne
 * de rendu partagée ; seule la planche d'étiquettes — qui n'est pas une frise —
 * est dessinée ici.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { chronological } from '../core/document';
import { maskAll } from '../core/pedagogy';
import { apply } from '../core/commands';
import type { KronoDocument } from '../core/types';
import { EXPORT } from '../ui/strings';
import { toRgb01 } from '../ui/tokenValues';
import { exportPdf, type PdfOptions } from './pdf';
import { MARGIN, mm, pageDimensions } from './paper';
import { toWinAnsi } from './pdfScene';

/** Étiquettes : 2 colonnes, hauteur fixe, pointillés de découpe entre elles. */
const LABEL_HEIGHT = mm(14);
const LABEL_GAP = mm(4);
const COLUMNS = 2;
const TITLE_SIZE = 12;
const LABEL_SIZE = 11;

export async function exportExercise(doc: KronoDocument, options: PdfOptions): Promise<Uint8Array> {
  // Tous les libellés masqués : l'élève n'a plus que les dates comme repères.
  const masked = apply(doc, maskAll(doc, 'label'));
  const frise = await exportPdf(masked, { ...options, worksheet: true, answerKey: false });

  const pdf = await PDFDocument.load(frise);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([
    pageDimensions(options.size, options.orientation).width,
    pageDimensions(options.size, options.orientation).height,
  ]);
  const ink = toRgb01('var(--text-primary)');
  const hairline = toRgb01('var(--text-tertiary)');
  const width = page.getWidth() - MARGIN * 2;

  page.drawText(toWinAnsi(EXPORT.exerciseTitle), {
    x: MARGIN, y: page.getHeight() - MARGIN - TITLE_SIZE, size: TITLE_SIZE, font: bold,
    color: rgb(ink.r, ink.g, ink.b),
  });

  // Mélange déterministe : deux exports du même document donnent la même fiche.
  const labels = shuffle(chronological(doc.items).map((item) => item.label), doc.id);
  const columnWidth = (width - LABEL_GAP * (COLUMNS - 1)) / COLUMNS;
  let top = page.getHeight() - MARGIN - TITLE_SIZE - mm(8);

  labels.forEach((label, index) => {
    const column = index % COLUMNS;
    if (column === 0 && index > 0) top -= LABEL_HEIGHT + LABEL_GAP;
    const x = MARGIN + column * (columnWidth + LABEL_GAP);
    const y = top - LABEL_HEIGHT;
    if (y < MARGIN) return; // au-delà, la planche déborde : on s'arrête proprement
    page.drawRectangle({
      x, y, width: columnWidth, height: LABEL_HEIGHT,
      borderColor: rgb(hairline.r, hairline.g, hairline.b), borderWidth: 0.75,
      borderDashArray: [3, 3],
    });
    const text = toWinAnsi(label);
    const size = fitSize(text, columnWidth - mm(6), font);
    page.drawText(text, {
      x: x + mm(3), y: y + LABEL_HEIGHT / 2 - size / 3, size, font,
      color: rgb(ink.r, ink.g, ink.b),
    });
  });

  return pdf.save();
}

/** Réduit la taille du texte jusqu'à ce que l'étiquette le contienne. */
function fitSize(text: string, available: number, font: { widthOfTextAtSize: (t: string, s: number) => number }): number {
  let size = LABEL_SIZE;
  while (size > 6 && font.widthOfTextAtSize(text, size) > available) size -= 0.5;
  return size;
}

/**
 * Mélange reproductible : le générateur dépend de l'identifiant du document,
 * donc la fiche imprimée deux fois est deux fois la même.
 */
export function shuffle<T>(values: readonly T[], seed: string): T[] {
  let state = 0;
  for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  const random = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = result[i] as T;
    result[i] = result[j] as T;
    result[j] = swap;
  }
  return result;
}
