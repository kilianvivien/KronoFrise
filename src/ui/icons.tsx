/**
 * Jeu d'icônes — DESIGN.md §3.
 *
 * Décision de Kilian (31 août 2026) : les glyphes génériques viennent de
 * **Lucide** (`lucide-react`, licence ISC), les glyphes du métier restent
 * dessinés ici — aucun paquet ne connaît l'événement posé sur la ligne du
 * temps, la période, l'accolade, la coupure ou la ligne à compléter.
 *
 * Pour que les deux familles se ressemblent, **tout est dessiné sur la grille
 * de Lucide** : `viewBox 0 0 24 24`, trait de 2, bouts et jonctions arrondis,
 * aucun remplissage. Rendues à 16 px, les deux donnent le même trait de
 * 1,33 px. Une icône n'est jamais seule : le bouton qui la porte a toujours un
 * `aria-label` et une infobulle (DESIGN.md §7).
 */
import { createElement, type JSX } from 'react';
import {
  ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, FileImage,
  CircleQuestionMark, FileText, FolderOpen, Frame, Globe, Image, LayoutGrid, Minus, MonitorPlay, MousePointer2,
  PanelLeft, PanelRight, Pencil, Pin, Plus, Redo2, Save, Scissors, Search, SkipBack,
  Spline, Trash2, Undo2, Upload, X, type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'sidebar' | 'inspector'
  | 'undo' | 'redo'
  | 'navigate' | 'event' | 'period'
  | 'zoomOut' | 'zoomIn'
  | 'edit' | 'present' | 'worksheet'
  | 'library' | 'open' | 'save' | 'export'
  | 'duplicate' | 'trash'
  | 'search' | 'plus' | 'chevronDown' | 'chevronRight' | 'arrowUp' | 'arrowDown'
  | 'bar' | 'bracket' | 'arrow' | 'image' | 'pin' | 'lane' | 'preset' | 'check'
  | 'close' | 'first' | 'last' | 'mask' | 'back'
  | 'pdf' | 'web' | 'vector' | 'raster' | 'wall' | 'scissors' | 'fit' | 'help';

/** Glyphes génériques : Lucide, tel quel. */
const LUCIDE: Partial<Record<IconName, LucideIcon>> = {
  sidebar: PanelLeft, inspector: PanelRight,
  undo: Undo2, redo: Redo2, help: CircleQuestionMark,
  navigate: MousePointer2,
  zoomOut: Minus, zoomIn: Plus,
  edit: Pencil, present: MonitorPlay,
  library: LayoutGrid, open: FolderOpen, save: Save, export: Upload,
  duplicate: Copy, trash: Trash2,
  search: Search, plus: Plus,
  chevronDown: ChevronDown, chevronRight: ChevronRight, back: ChevronLeft,
  arrowUp: ArrowUp, arrowDown: ArrowDown,
  image: Image, pin: Pin, check: Check, close: X,
  first: SkipBack, last: ChevronRight, fit: Frame,
  pdf: FileText, web: Globe, vector: Spline, raster: FileImage, scissors: Scissors,
};

interface Glyph {
  /** traits pleins, sur la grille 24 de Lucide */
  d: string;
  /** traits en pointillés — les blancs d'une fiche à compléter */
  dashed?: string;
  circle?: { cx: number; cy: number; r: number };
}

/**
 * Glyphes du métier. Ils partagent le vocabulaire de la frise : la ligne du
 * temps en bas, l'élément posé dessus.
 */
const DRAWN: Partial<Record<IconName, Glyph>> = {
  // Un événement : une pastille reliée à la ligne du temps.
  event: { d: 'M3 19h18 M12 19v-4', circle: { cx: 12, cy: 9, r: 3.5 } },
  // Une période : une barre posée sur la ligne du temps.
  period: { d: 'M3 19h18 M5 8h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z' },
  // Les trois formes d'une période (DESIGN.md §4).
  bar: { d: 'M5 9h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z' },
  bracket: { d: 'M3 16V9h18v7' },
  arrow: { d: 'M3 8h12l6 4-6 4H3z' },
  // La frise murale : des feuilles à assembler côte à côte.
  wall: { d: 'M3 6h5v12H3z M9.5 6h5v12h-5z M16 6h5v12h-5z' },
  // Les bandes de la frise, empilées.
  lane: { d: 'M3 6h18 M3 18h18 M7 12h10' },
  // Le préréglage des grandes périodes : des blocs qui se suivent.
  preset: { d: 'M3 7h7v4H3z M14 7h7v4h-7z M3 15h12v4H3z' },
  // La fiche élève : des lignes à compléter au-dessus de la ligne du temps.
  worksheet: { d: 'M6 3h12v18H6z', dashed: 'M9 9h6 M9 14h4' },
  mask: { d: 'M4 18h16', dashed: 'M4 7h16 M4 12h9' },
};

export function Icon({ name }: { name: IconName }): JSX.Element {
  const lucide = LUCIDE[name];
  if (lucide !== undefined) {
    return createElement(lucide, { width: 16, height: 16, 'aria-hidden': true, focusable: false });
  }
  const glyph = DRAWN[name] as Glyph;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={glyph.d} />
      {glyph.dashed !== undefined && <path d={glyph.dashed} strokeDasharray="3 3" />}
      {glyph.circle !== undefined && <circle cx={glyph.circle.cx} cy={glyph.circle.cy} r={glyph.circle.r} />}
    </svg>
  );
}
