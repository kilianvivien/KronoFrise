import { THEME_NAMES } from '../shared/strings';
/**
 * Thèmes — données pures (PLAN.md §3.4). Un thème décrit l'apparence du
 * *document*, jamais celle du chrome. Les valeurs sont des références aux
 * jetons de `ui/tokens.css` : aucun hexadécimal ici (DESIGN.md §1.2), et le
 * papier reste clair même quand l'interface passe en sombre (DESIGN.md §1.8).
 */

export interface Theme {
  id: string;
  /** nom affiché dans le sélecteur de thème */
  name: string;
  /** fond du canevas */
  paper: string;
  /** séparateurs de bandes, repères au repos */
  paperLine: string;
  /** ligne de base et graduations majeures */
  axisInk: string;
  /** libellés de la règle */
  rulerInk: string;
  /** graduations mineures */
  rulerInkMinor: string;
  /** nom des bandes */
  laneInk: string;
}

export const MANUEL_SCOLAIRE: Theme = {
  id: 'manuel-scolaire',
  name: THEME_NAMES.manuel,
  paper: 'var(--paper)',
  paperLine: 'var(--paper-line)',
  axisInk: 'var(--text-primary)',
  rulerInk: 'var(--text-secondary)',
  rulerInkMinor: 'var(--text-tertiary)',
  laneInk: 'var(--text-tertiary)',
};

export const CRAIE: Theme = { ...MANUEL_SCOLAIRE, id: 'craie', name: THEME_NAMES.craie, paper: 'var(--chalk-paper)', paperLine: 'var(--chalk-line)', axisInk: 'var(--chalk-ink)', rulerInk: 'var(--chalk-ink)', rulerInkMinor: 'var(--chalk-muted)', laneInk: 'var(--chalk-muted)' };
export const PARCHEMIN: Theme = { ...MANUEL_SCOLAIRE, id: 'parchemin', name: THEME_NAMES.parchemin, paper: 'var(--parchment-paper)', paperLine: 'var(--parchment-line)', axisInk: 'var(--parchment-ink)', rulerInk: 'var(--parchment-ink)', rulerInkMinor: 'var(--parchment-muted)', laneInk: 'var(--parchment-muted)' };
export const JOURNAL: Theme = { ...MANUEL_SCOLAIRE, id: 'journal', name: THEME_NAMES.journal, paper: 'var(--journal-paper)', paperLine: 'var(--journal-line)', axisInk: 'var(--journal-ink)', rulerInk: 'var(--journal-ink)', rulerInkMinor: 'var(--journal-ink)', laneInk: 'var(--journal-ink)' };
/**
 * SPEC? PLAN.md §3.4 nomme cinq thèmes et en demande « 6 à 8 ».
 * « Frise officielle » est spécifié ; « Tableau blanc » complète la série au
 * bas de la fourchette — voir docs/spec-gaps.md §13.5.
 */
export const OFFICIELLE: Theme = { ...MANUEL_SCOLAIRE, id: 'officielle', name: THEME_NAMES.officielle, paper: 'var(--officielle-paper)', paperLine: 'var(--officielle-line)', axisInk: 'var(--officielle-ink)', rulerInk: 'var(--officielle-ink)', rulerInkMinor: 'var(--officielle-muted)', laneInk: 'var(--officielle-muted)' };
export const TABLEAU_BLANC: Theme = { ...MANUEL_SCOLAIRE, id: 'tableau', name: THEME_NAMES.tableau, paper: 'var(--whiteboard-paper)', paperLine: 'var(--whiteboard-line)', axisInk: 'var(--whiteboard-ink)', rulerInk: 'var(--whiteboard-muted)', rulerInkMinor: 'var(--whiteboard-muted)', laneInk: 'var(--whiteboard-muted)' };

export const THEMES: readonly Theme[] = [MANUEL_SCOLAIRE, OFFICIELLE, CRAIE, PARCHEMIN, TABLEAU_BLANC, JOURNAL];

export function themeById(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? MANUEL_SCOLAIRE;
}
