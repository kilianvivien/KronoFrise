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
  name: 'Manuel scolaire',
  paper: 'var(--paper)',
  paperLine: 'var(--paper-line)',
  axisInk: 'var(--text-primary)',
  rulerInk: 'var(--text-secondary)',
  rulerInkMinor: 'var(--text-tertiary)',
  laneInk: 'var(--text-tertiary)',
};

export const THEMES: readonly Theme[] = [MANUEL_SCOLAIRE];

export function themeById(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? MANUEL_SCOLAIRE;
}
