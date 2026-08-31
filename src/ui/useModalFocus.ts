/**
 * Piège à focus pour un panneau modal dessiné sans `<dialog>`.
 *
 * `<dialog>.showModal()` fait tout cela nativement ; le navigateur de frises
 * est une grille plein écran, pas une boîte, et se dessine donc en `div
 * role="dialog"`. Sans ce crochet, Tab quittait la modale pour la barre
 * d'outils *derrière* elle — l'un des rares manquements au point « Tab
 * l'atteint, Échap en sort » de la liste DESIGN.md §11.
 *
 * `active` se met à faux quand un vrai `<dialog>` s'ouvre par-dessus : lui
 * rend le reste inerte tout seul, et deux pièges concurrents se disputeraient
 * le focus. Le focus d'origine n'est rendu qu'au démontage, jamais à ce
 * passage-là — sinon la confirmation perdrait le focus en s'ouvrant.
 */
import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null || element === document.activeElement);
}

export function useModalFocus(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (focusable(root)[0] ?? root).focus();
    return () => previous?.focus();
  }, [ref]);

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const items = focusable(root);
      const first = items[0], last = items[items.length - 1];
      if (!first || !last) return;
      // Le focus sorti du panneau (clic dans le fond) revient au premier champ.
      if (!root.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [active, ref]);
}
