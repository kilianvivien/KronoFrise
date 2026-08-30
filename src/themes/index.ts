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
export const THEMES: readonly Theme[] = [MANUEL_SCOLAIRE, CRAIE, PARCHEMIN, JOURNAL];

export function themeById(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? MANUEL_SCOLAIRE;
}
