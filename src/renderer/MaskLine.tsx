/**
 * Ligne à compléter d'un élément masqué — DESIGN.md §5 : « texte remplacé par
 * une ligne vide (1 px `--text-tertiary`, largeur du texte d'origine, 48 px
 * minimum) ». La largeur vient de la scène : la mise en page a déjà mesuré le
 * texte réel, si bien que le corrigé et la fiche ont la même géométrie.
 */
import type { JSX } from 'react';
import { MASK_BASELINE_DROP as BASELINE_DROP } from './shapes';

export function MaskLine({ x, y, width }: { x: number; y: number; width: number }): JSX.Element {
  return (
    <line
      x1={x}
      x2={x + width}
      y1={y + BASELINE_DROP}
      y2={y + BASELINE_DROP}
      stroke="var(--text-tertiary)"
      strokeWidth={1}
    />
  );
}
