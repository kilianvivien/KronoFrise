/**
 * Jeu d'icônes de la barre d'outils — DESIGN.md §3 : 16 px, trait 1,5 px,
 * `currentColor`, jamais de remplissage. Chaque icône est dessinée sur une
 * grille de 16 avec des demi-pixels, pour rester nette sans anticrénelage.
 *
 * Une icône n'est jamais seule : le bouton qui la porte a toujours un
 * `aria-label` et une infobulle (DESIGN.md §7).
 */
import type { JSX } from 'react';

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
  | 'pdf' | 'web' | 'vector' | 'raster' | 'wall' | 'scissors';

interface Glyph {
  /** traits pleins */
  d: string;
  /** traits en pointillés — les blancs d'une fiche, la date approximative */
  dashed?: string;
  circle?: { cx: number; cy: number; r: number };
}

const GLYPHS: Record<IconName, Glyph> = {
  sidebar: { d: 'M2.5 3.5h11v9h-11z M6.25 3.5v9' },
  inspector: { d: 'M2.5 3.5h11v9h-11z M9.75 3.5v9' },
  undo: { d: 'M6 4 3 7l3 3 M3 7h5.5a3.25 3.25 0 0 1 0 6.5H7' },
  redo: { d: 'M10 4l3 3-3 3 M13 7H7.5a3.25 3.25 0 0 0 0 6.5H9' },
  // Le curseur de la souris : naviguer et sélectionner.
  navigate: { d: 'M4.5 2.6 12 7.9l-3.4.7-1 3.4z' },
  // Un événement : une pastille posée sur la ligne du temps.
  event: { d: 'M2.5 12.5h11 M8 12.5V7.6', circle: { cx: 8, cy: 5.4, r: 2.4 } },
  // Une période : une barre posée sur la ligne du temps.
  period: { d: 'M2.5 12.5h11 M4.5 5.5h7a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 8.5v-1a1.5 1.5 0 0 1 1.5-1.5z' },
  zoomOut: { d: 'M3.5 8h9' },
  zoomIn: { d: 'M3.5 8h9 M8 3.5v9' },
  // Le crayon de l'édition.
  edit: { d: 'M3 13l.8-2.6 6.6-6.6 1.8 1.8-6.6 6.6z M9.6 3.4l1.4-1.4 1.8 1.8-1.4 1.4' },
  // L'écran du vidéoprojecteur et son triangle de lecture.
  present: { d: 'M2.5 3h11v8.5h-11z M8 11.5v2 M6 13.5h4 M6.9 5.9l3 1.85-3 1.85z' },
  // La fiche élève : une page et ses lignes à compléter.
  worksheet: { d: 'M4 2.5h8v11H4z', dashed: 'M6 6.5h4 M6 9.5h4' },
  // La bibliothèque : les frises enregistrées sur cet appareil.
  library: { d: 'M2.5 3.5h5v4h-5z M8.5 3.5h5v4h-5z M2.5 8.5h5v4h-5z M8.5 8.5h5v4h-5z' },
  open: { d: 'M2.5 12.5v-8h3.6l1.4 1.8h6v6.2z' },
  // La disquette : enregistrer le fichier .krono.
  save: { d: 'M3.5 3.5h7L12.5 5.4v7.1h-9z M6 3.5v3h4v-3 M6 12.5V9.5h4v3' },
  // Exporter : la flèche qui sort du document.
  export: { d: 'M4 9.5v3h8v-3 M8 9.5V2.6 M5.4 5.2 8 2.6l2.6 2.6' },
  duplicate: { d: 'M6 6h8v8H6z M10 6V2H2v8h4' },
  search: { d: 'M13 13l-3.2-3.2', circle: { cx: 7, cy: 7, r: 4.2 } },
  plus: { d: 'M8 3.5v9 M3.5 8h9' },
  chevronDown: { d: 'M4.5 6.5 8 10l3.5-3.5' },
  chevronRight: { d: 'M6.5 4.5 10 8l-3.5 3.5' },
  arrowUp: { d: 'M8 12.5v-9 M4.5 7 8 3.5 11.5 7' },
  arrowDown: { d: 'M8 3.5v9 M4.5 9 8 12.5 11.5 9' },
  // Les trois formes d'une période (DESIGN.md §4).
  bar: { d: 'M3 5.5h10a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 9V7A1.5 1.5 0 0 1 3 5.5z' },
  bracket: { d: 'M2 10.5V7h12v3.5' },
  arrow: { d: 'M2 5.5h8.5L14 8l-3.5 2.5H2z' },
  image: { d: 'M2.5 3.5h11v9h-11z M2.5 10.5 6 7.5l3 2.5 2-1.5 2.5 2', circle: { cx: 5.5, cy: 6, r: 1 } },
  pin: { d: 'M8 9.5v4 M5 3.5h6l-.8 3.2 1.3 1.3v1.5H4.5V8l1.3-1.3z' },
  lane: { d: 'M2.5 4.5h11 M2.5 11.5h11 M4.5 8h7' },
  preset: { d: 'M2.5 4.5h5v3h-5z M8.5 4.5h5v3h-5z M2.5 8.5h8v3h-8z' },
  check: { d: 'M3.5 8.5 6.5 11.5 12.5 4.5' },
  close: { d: 'M4 4l8 8 M12 4l-8 8' },
  back: { d: 'M9.5 4.5 6 8l3.5 3.5' },
  // Formats d'export.
  pdf: { d: 'M3.5 1.5h6l3 3v10h-9z M9.5 1.5v3h3 M5.5 8.5h5 M5.5 11h3' },
  web: { d: 'M2 3.5h12v9H2z M2 6.5h12', circle: { cx: 4.2, cy: 5, r: .6 } },
  vector: { d: 'M4 4.5 12 11.5 M2.5 2.5h3v3h-3z M10.5 10.5h3v3h-3z' },
  raster: { d: 'M2.5 3.5h11v9h-11z M2.5 10 6 7l3 2.5 2-1.5 2.5 2', circle: { cx: 5.5, cy: 6, r: .9 } },
  wall: { d: 'M1.5 4.5h4v7h-4z M6 4.5h4v7H6z M10.5 4.5h4v7h-4z' },
  scissors: { d: 'M5 5.5 11.5 12 M11.5 4 5 10.5', circle: { cx: 4, cy: 4, r: 1.8 } },
  first: { d: 'M11 4 7 8l4 4 M5 4v8' },
  last: { d: 'M5 4l4 4-4 4 M11 4v8' },
  // Masquer : la ligne à compléter d'une fiche élève.
  mask: { d: 'M3 11.5h10', dashed: 'M3 5.5h10 M3 8.5h6' },
  trash: { d: 'M2.5 4h11 M6 4V2.5h4V4 M4 4l1 9.5h6L12 4 M7 6.5v5 M9 6.5v5' },
};

export function Icon({ name }: { name: IconName }): JSX.Element {
  const glyph = GLYPHS[name];
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={glyph.d} />
      {glyph.dashed !== undefined && <path d={glyph.dashed} strokeDasharray="2 2" />}
      {glyph.circle !== undefined && <circle cx={glyph.circle.cx} cy={glyph.circle.cy} r={glyph.circle.r} />}
    </svg>
  );
}
