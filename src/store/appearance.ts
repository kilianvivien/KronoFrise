import { createStore } from 'zustand/vanilla';

export type Appearance = 'terracotta' | 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';
const STORAGE_KEY = 'kronofrise:appearance';
const isAppearance = (value: unknown): value is Appearance => ['terracotta', 'light', 'dark', 'system'].includes(String(value));
/**
 * Le tutoriel d'accueil est terminé ou passé (PLAN.md M4, ajout 1). L'état
 * vit ici, **par appareil** : ce n'est pas une donnée du document, il ne part
 * donc pas dans le `.krono` et ne salit pas l'historique d'annulation.
 */
const TUTORIAL_KEY = 'kronofrise:tutorial';

export const appearanceStore = createStore<{ preference: Appearance; scheme: ColorScheme; saved: boolean; tutorialDone: boolean }>(() => ({ preference: 'terracotta', scheme: 'light', saved: true, tutorialDone: true }));

export function setTutorialDone(done: boolean): void {
  appearanceStore.setState({ tutorialDone: done });
  try { window.localStorage.setItem(TUTORIAL_KEY, done ? 'done' : 'pending'); }
  catch { /* Un stockage restreint ne doit pas empêcher de refermer le tutoriel. */ }
}

function apply(preference: Appearance): void {
  const scheme = preference === 'dark' || (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.dataset.uiTheme = preference;
  document.documentElement.dataset.uiScheme = scheme;
  appearanceStore.setState({ preference, scheme });
}
export function chooseAppearance(preference: Appearance): void {
  apply(preference);
  try { window.localStorage.setItem(STORAGE_KEY, preference); appearanceStore.setState({ saved: true }); }
  catch { appearanceStore.setState({ saved: false }); }
}
/** App preference, deliberately separate from document data and undo history. */
export function startAppearance(): () => void {
  let preference: Appearance = 'terracotta';
  try { const saved = window.localStorage.getItem(STORAGE_KEY); if (isAppearance(saved)) preference = saved; }
  catch { /* Restricted storage must never prevent the editor from opening. */ }
  apply(preference);
  // Absence de clé = première visite : le tutoriel s'ouvre. Un stockage
  // indisponible ne le fait pas surgir à chaque session, ce qui serait pire.
  let tutorialDone = true;
  try { tutorialDone = window.localStorage.getItem(TUTORIAL_KEY) !== null; }
  catch { /* stockage restreint : on n'insiste pas */ }
  appearanceStore.setState({ tutorialDone });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const systemChanged = () => apply(appearanceStore.getState().preference);
  const storageChanged = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      apply(isAppearance(event.newValue) ? event.newValue : 'terracotta');
      appearanceStore.setState({ saved: true });
    }
  };
  media.addEventListener('change', systemChanged);
  window.addEventListener('storage', storageChanged);
  return () => { media.removeEventListener('change', systemChanged); window.removeEventListener('storage', storageChanged); };
}
