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
  | 'open' | 'save' | 'export'
  | 'duplicate' | 'trash';

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
  open: { d: 'M2.5 12.5v-8h3.6l1.4 1.8h6v6.2z' },
  // La disquette : enregistrer le fichier .krono.
  save: { d: 'M3.5 3.5h7L12.5 5.4v7.1h-9z M6 3.5v3h4v-3 M6 12.5V9.5h4v3' },
  // Exporter : la flèche qui sort du document.
  export: { d: 'M4 9.5v3h8v-3 M8 9.5V2.6 M5.4 5.2 8 2.6l2.6 2.6' },
  duplicate: { d: 'M6 6h8v8H6z M10 6V2H2v8h4' },
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
