/**
 * Export PDF vectoriel — le produit phare de M3 (PLAN.md §3.6).
 *
 * La chaîne est celle de l'écran : `layout(document)` → `SceneGraph` → dessin.
 * Aucune capture d'image, aucun dessin propre à l'export ; le texte reste du
 * texte. Une frise plus large que la page se découpe en feuilles qui se
 * recouvrent de 10 mm, avec repères de coupe et numéro de page
 * (docs/format.md §9).
 */
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { EMBEDDED_FONTS } from './fonts';
import { layout } from '../layout/layout';
import { fitInsets } from '../layout/fit';
import { makeScale } from '../layout/scale';
import type { Measurer } from '../layout/measure';
import type { KronoDocument } from '../core/types';
import { themeById } from '../themes';
import { FS_CAPTION } from '../renderer/style';
import { toRgb01 } from '../ui/tokenValues';
import { EXPORT } from '../ui/strings';
import { drawScene, toPdfText, type PdfContext } from './pdfScene';
import { MARGIN, OVERLAP, paginate, sceneHeightFor, sceneWidthFor, type PaperOptions } from './paper';

export interface PdfOptions extends PaperOptions {
  /** fiche élève : les masques deviennent des lignes à compléter */
  worksheet?: boolean;
  /** ajoute le corrigé (la même frise sans masques) à la suite */
  answerKey?: boolean;
  measurer?: Measurer;
  /** nombre de pages visé en frise murale */
  pages?: number;
}

/** Repères d'assemblage : ciseaux et pointillés dans la zone de recouvrement. */
const CUT_DASH = [3, 3];

export async function exportPdf(doc: KronoDocument, options: PdfOptions): Promise<Uint8Array> {
  const theme = themeById(doc.themeId);
  const wanted = options.wall ? Math.max(1, Math.round(options.pages ?? 2)) : 1;
  const sceneWidth = sceneWidthFor(options, wanted);
  const sceneHeight = sceneHeightFor(options);

  const insets = fitInsets(doc, sceneWidth, options.measurer);
  const scale = makeScale(doc.axis, sceneWidth, 0, 1, insets);
  const build = (worksheet: boolean) => layout(doc, scale, {
    ...(options.measurer ? { measurer: options.measurer } : {}),
    height: sceneHeight,
    ...(worksheet ? { worksheet: true } : {}),
  });
  const scene = build(options.worksheet === true);
  // Le corrigé, c'est la même scène sans masques (docs/format.md §5) : il suit
  // la fiche dans le même fichier, prêt à imprimer en recto/verso.
  const answerKey = options.answerKey === true && options.worksheet === true ? build(false) : undefined;

  const sheet = paginate(scene.width, scene.height, options);
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.meta.title);
  if (doc.meta.author !== undefined) pdf.setAuthor(doc.meta.author);
  pdf.setCreator('KronoFrise');
  // Police réellement incorporée : les 14 polices standard sont en WinAnsi et
  // n'ont pas « ᵉ » (docs/spec-gaps.md §8). `subset` ne garde que les glyphes
  // employés, si bien qu'une frise n'emporte que quelques kilo-octets.
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(EMBEDDED_FONTS.regular(), { subset: true });
  const bold = await pdf.embedFont(EMBEDDED_FONTS.semibold(), { subset: true });
  const images = await embedImages(pdf, scene.events.flatMap((event) => event.imageSrc === undefined ? [] : [event.imageSrc]));

  const scenes: { scene: typeof scene; caption?: string }[] = [
    { scene },
    ...(answerKey === undefined ? [] : [{ scene: answerKey, caption: EXPORT.answerKeyPage }]),
  ];
  for (const { scene: current, caption } of scenes) for (const sheetPage of sheet.pages) {
    const page = pdf.addPage([sheet.width, sheet.height]);
    // Le papier du thème couvre toute la page : ce que l'on voyait, imprimé.
    const paper = toRgb01(theme.paper);
    page.drawRectangle({ x: 0, y: 0, width: sheet.width, height: sheet.height, color: rgb(paper.r, paper.g, paper.b) });

    const context: PdfContext = {
      page,
      frame: {
        originX: MARGIN - sheetPage.offsetX,
        originY: sheet.height - MARGIN,
        scale: sheet.scale,
      },
      font, bold, theme, images,
    };
    drawScene(context, current);
    coverMargins(page, sheet.width, sheet.height, paper);
    if (caption !== undefined) {
      const ink = toRgb01('var(--text-secondary)');
      page.drawText(toPdfText(caption), {
        x: MARGIN, y: MARGIN / 2, size: FS_CAPTION, font: bold, color: rgb(ink.r, ink.g, ink.b),
      });
    }
    if (sheet.pages.length > 1) drawAssembly(page, sheet.width, sheet.height, sheetPage.overlapLeft, sheetPage.overlapRight);
    if (sheet.pages.length > 1) {
      const label = toPdfText(EXPORT.assembly(sheetPage.index + 1, sheet.pages.length));
      const size = FS_CAPTION;
      const ink = toRgb01('var(--text-tertiary)');
      page.drawText(label, {
        x: sheet.width - MARGIN - font.widthOfTextAtSize(label, size),
        y: MARGIN / 2,
        size, font, color: rgb(ink.r, ink.g, ink.b),
      });
    }
  }
  return pdf.save();
}

/**
 * Le dessin déborde des marges quand la scène est découpée : on repeint les
 * marges avec le papier plutôt que de découper, ce qui garde tout vectoriel.
 */
function coverMargins(page: ReturnType<PDFDocument['addPage']>, width: number, height: number, paper: { r: number; g: number; b: number }): void {
  const fill = rgb(paper.r, paper.g, paper.b);
  const bands = [
    { x: 0, y: 0, width, height: MARGIN },
    { x: 0, y: height - MARGIN, width, height: MARGIN },
    { x: 0, y: 0, width: MARGIN, height },
    { x: width - MARGIN, y: 0, width: MARGIN, height },
  ];
  for (const band of bands) page.drawRectangle({ ...band, color: fill });
}

/** Traits de coupe dans la zone de recouvrement, plus une paire de ciseaux. */
function drawAssembly(page: ReturnType<PDFDocument['addPage']>, width: number, height: number, left: boolean, right: boolean): void {
  const ink = toRgb01('var(--text-tertiary)');
  const color = rgb(ink.r, ink.g, ink.b);
  if (left) {
    page.drawLine({ start: { x: MARGIN + OVERLAP, y: MARGIN / 2 }, end: { x: MARGIN + OVERLAP, y: height - MARGIN / 2 }, thickness: 0.5, color, dashArray: CUT_DASH });
    page.drawCircle({ x: MARGIN + OVERLAP, y: height - MARGIN / 2, size: 2, borderColor: color, borderWidth: 0.5 });
  }
  if (right) {
    page.drawLine({ start: { x: width - MARGIN - OVERLAP, y: MARGIN / 2 }, end: { x: width - MARGIN - OVERLAP, y: height - MARGIN / 2 }, thickness: 0.5, color, dashArray: CUT_DASH });
    page.drawCircle({ x: width - MARGIN - OVERLAP, y: height - MARGIN / 2, size: 2, borderColor: color, borderWidth: 0.5 });
  }
}

/** Les images du document sont des data URL ; une image illisible est ignorée. */
async function embedImages(pdf: PDFDocument, sources: readonly string[]): Promise<Map<string, Awaited<ReturnType<PDFDocument['embedJpg']>>>> {
  const images = new Map<string, Awaited<ReturnType<PDFDocument['embedJpg']>>>();
  for (const source of new Set(sources)) {
    try {
      const jpeg = source.startsWith('data:image/jpeg') || source.startsWith('data:image/jpg');
      const png = source.startsWith('data:image/png');
      if (!jpeg && !png) continue;
      images.set(source, jpeg ? await pdf.embedJpg(source) : await pdf.embedPng(source));
    } catch { /* une image abîmée n'empêche pas d'imprimer la frise */ }
  }
  return images;
}
