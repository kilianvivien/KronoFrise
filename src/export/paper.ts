/**
 * Géométrie de page pour l'export PDF — docs/format.md §9.
 *
 * Pure et testable : elle ne connaît que des points PostScript. La règle de
 * fidélité impose que le PDF dessine la **même** scène que l'écran ; ce module
 * dit seulement où cette scène tombe sur les pages, y compris quand elle
 * s'étale sur plusieurs feuilles à assembler (« frise murale »).
 */

/** 1 pt = 1/72 pouce ; 1 mm = 72/25,4 pt. */
export function mm(value: number): number {
  return (value / 25.4) * 72;
}

/**
 * Un pixel CSS vaut 1/96 de pouce : c'est ce qui donne au texte de 13 px sa
 * taille réelle sur le papier (9,75 pt), exactement comme à l'écran.
 */
export const PT_PER_PX = 72 / 96;

export const PAGE_SIZES = {
  a4: { width: mm(210), height: mm(297) },
  a3: { width: mm(297), height: mm(420) },
} as const;

export type PageSize = keyof typeof PAGE_SIZES;
export type Orientation = 'portrait' | 'landscape';

/** Marges de 12 mm et recouvrement d'assemblage de 10 mm (docs/format.md §9). */
export const MARGIN = mm(12);
export const OVERLAP = mm(10);

export interface PaperOptions {
  size: PageSize;
  orientation: Orientation;
  /** frise murale : la scène s'étale sur plusieurs pages au lieu de rétrécir */
  wall: boolean;
}

export interface Page {
  index: number;
  /** décalage de la scène (en points) à appliquer sur cette page */
  offsetX: number;
  /** largeur utile réellement occupée sur cette page */
  usedWidth: number;
  /** un trait d'assemblage est dessiné sur ce bord */
  overlapLeft: boolean;
  overlapRight: boolean;
}

export interface Sheet {
  width: number;
  height: number;
  printable: { width: number; height: number };
  /** facteur px → pt appliqué à la scène */
  scale: number;
  contentWidth: number;
  contentHeight: number;
  pages: Page[];
}

export function pageDimensions(size: PageSize, orientation: Orientation): { width: number; height: number } {
  const { width, height } = PAGE_SIZES[size];
  return orientation === 'landscape' ? { width: height, height: width } : { width, height };
}

/**
 * Place une scène de `sceneWidth × sceneHeight` pixels sur des pages.
 *
 * Sans frise murale, la scène est réduite pour tenir sur une seule page. En
 * frise murale, elle garde sa taille d'impression naturelle (PT_PER_PX) — le
 * texte fait alors la même taille qu'à l'écran — et se découpe en pages qui se
 * recouvrent de 10 mm.
 */
export function paginate(sceneWidth: number, sceneHeight: number, options: PaperOptions): Sheet {
  const page = pageDimensions(options.size, options.orientation);
  const printable = { width: page.width - MARGIN * 2, height: page.height - MARGIN * 2 };
  const safeWidth = Math.max(sceneWidth, 1);
  const safeHeight = Math.max(sceneHeight, 1);

  const natural = options.wall ? PT_PER_PX : Math.min(printable.width / safeWidth, printable.height / safeHeight);
  // Même en frise murale, la hauteur ne peut pas dépasser la page.
  const scale = Math.min(natural, printable.height / safeHeight);
  const contentWidth = safeWidth * scale;
  const contentHeight = safeHeight * scale;

  const step = Math.max(printable.width - OVERLAP, 1);
  const count = contentWidth <= printable.width
    ? 1
    : Math.ceil((contentWidth - printable.width) / step) + 1;

  const pages: Page[] = [];
  for (let index = 0; index < count; index++) {
    const offsetX = index * step;
    pages.push({
      index,
      offsetX,
      usedWidth: Math.min(printable.width, contentWidth - offsetX),
      overlapLeft: index > 0,
      overlapRight: index < count - 1,
    });
  }
  return { ...page, printable, scale, contentWidth, contentHeight, pages };
}

/**
 * Largeur de scène, en pixels, à demander à la mise en page pour remplir ces
 * pages : on met en page à la taille d'impression, jamais à celle de l'écran,
 * sinon les libellés changeraient de densité entre l'écran et le papier.
 */
export function sceneWidthFor(options: PaperOptions, pageCount: number): number {
  const page = pageDimensions(options.size, options.orientation);
  const printable = page.width - MARGIN * 2;
  const total = printable + Math.max(0, pageCount - 1) * (printable - OVERLAP);
  return total / PT_PER_PX;
}

/** Hauteur de scène utile pour une page, en pixels. */
export function sceneHeightFor(options: PaperOptions): number {
  const page = pageDimensions(options.size, options.orientation);
  return (page.height - MARGIN * 2) / PT_PER_PX;
}
