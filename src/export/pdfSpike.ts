/**
 * Sonde d'export PDF (PLAN.md §7.6) — **prototype**, pas l'exporteur final.
 *
 * But : vérifier avant M3 que pdf-lib sait rendre l'axe en vectoriel avec du
 * texte réel. Elle consomme le `SceneGraph`, jamais le document : la règle de
 * fidélité (docs/format.md §9) reste tenue. L'exporteur de M3 remplacera ce
 * fichier par un émetteur de primitives partagé avec le rendu SVG.
 *
 * Constat de la sonde, à traiter en M3 : les polices standard PDF sont
 * encodées en WinAnsi et ne contiennent pas « ᵉ » (U+1D49) des libellés de
 * siècle. Deux issues : incorporer une vraie police (nécessite
 * @pdf-lib/fontkit, hors de la liste fermée de PLAN.md §8.4 — à valider avec
 * Kilian), ou replier « XVIIᵉ » sur « XVIIe » à l'export.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { TICK_LABEL_GAP, TICK_MAJOR_HEIGHT, TICK_MINOR_HEIGHT } from '../layout/metrics';
import type { SceneGraph } from '../layout/scene';
import { FS_CAPTION } from '../renderer/style';
import { toRgb01 } from '../ui/tokenValues';

/** Format A4 paysage en points PostScript (docs/format.md §9). */
export const A4_LANDSCAPE = { width: 841.89, height: 595.28 };
/** Marges de 12 mm. */
const MARGIN = (12 / 25.4) * 72;

const AXIS_INK = 'var(--text-primary)';
const MINOR_INK = 'var(--text-tertiary)';
const LABEL_INK = 'var(--text-secondary)';

/**
 * Les polices standard n'acceptent que WinAnsi : on replie les exposants
 * ordinaux le temps de la sonde.
 */
export function toWinAnsi(text: string): string {
  // Espace fine insécable → espace insécable, présente en WinAnsi.
  return text.replace(/ᵉʳ/g, 'er').replace(/ᵉ/g, 'e').replace(/\u202F/g, '\u00A0');
}

export async function rulerToPdf(scene: SceneGraph, title: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  const page = pdf.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // Le SceneGraph est en pixels CSS ; on l'ajuste à la largeur imprimable.
  const scale = (A4_LANDSCAPE.width - MARGIN * 2) / scene.width;
  const baseline = A4_LANDSCAPE.height / 2;
  const toPageY = (y: number): number => baseline - (y - scene.baselineY) * scale;
  const toPageX = (x: number): number => MARGIN + x * scale;

  const ink = toRgb01(AXIS_INK);
  const minorInk = toRgb01(MINOR_INK);
  const labelInk = toRgb01(LABEL_INK);

  for (const segment of scene.axisSegments) {
    page.drawLine({
      start: { x: toPageX(Math.max(segment.x0, 0)), y: baseline },
      end: { x: toPageX(Math.min(segment.x1, scene.width)), y: baseline },
      thickness: 1.5 * scale,
      color: rgb(ink.r, ink.g, ink.b),
    });
  }

  for (const tick of scene.ticks) {
    const height = (tick.major ? TICK_MAJOR_HEIGHT : TICK_MINOR_HEIGHT) * scale;
    const color = tick.major ? ink : minorInk;
    page.drawLine({
      start: { x: toPageX(tick.x), y: baseline },
      end: { x: toPageX(tick.x), y: baseline - height },
      thickness: 1 * scale,
      color: rgb(color.r, color.g, color.b),
    });
    if (tick.label === undefined) continue;
    const label = toWinAnsi(tick.label);
    const size = FS_CAPTION * scale;
    page.drawText(label, {
      x: toPageX(tick.x) - font.widthOfTextAtSize(label, size) / 2,
      y: baseline - (TICK_MAJOR_HEIGHT + TICK_LABEL_GAP) * scale - size,
      size,
      font,
      color: rgb(labelInk.r, labelInk.g, labelInk.b),
    });
  }

  for (const period of scene.periods) {
    const width = Math.max((period.x1 - period.x0) * scale, 0.5);
    page.drawRectangle({
      x: toPageX(period.x0),
      y: toPageY(period.y + period.height),
      width,
      height: period.height * scale,
      borderWidth: 1 * scale,
      borderColor: rgb(ink.r, ink.g, ink.b),
      opacity: 0,
    });
  }

  return pdf.save();
}
