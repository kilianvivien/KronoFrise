/**
 * Les étapes du tutoriel d'accueil — données pures, donc testables sans DOM.
 *
 * PLAN.md M4 (ajout 1) : « trois ou quatre étapes qui font *faire* la chose ».
 * Une étape ne s'achève donc pas sur un clic « Suivant » mais sur l'état du
 * document ou du mode : tant que l'événement n'existe pas, l'étape reste.
 *
 * Corollaire utile : une étape déjà satisfaite en arrivant est franchie
 * d'elle-même. Créer un événement ouvre déjà le champ du libellé — celui qui
 * le nomme tout de suite ne se voit pas demander de le nommer ensuite.
 */
import { itemStart } from '../core/document';
import { toFractionalYear } from '../core/dates';
import type { KronoDocument } from '../core/types';
import type { Mode } from './mode';
import { TUTORIAL } from './strings';

/** Ce que l'étape observe pour savoir si elle est accomplie. */
export interface TutorialState {
  document: KronoDocument;
  mode: Mode;
  /** libellés par défaut, à ne pas compter comme « nommé » */
  defaultLabels: readonly string[];
}

export interface TutorialStep {
  id: 'place' | 'move' | 'name' | 'present';
  title: string;
  body: string;
  /** sélecteur `data-tour` du contrôle réel auquel la bulle s'accroche */
  anchor: string;
  /** l'étape est-elle accomplie ? */
  done(state: TutorialState, start: TutorialState): boolean;
}

/**
 * Un élément **déjà présent** au début de l'étape a-t-il changé de date ?
 *
 * La condition porte sur les éléments communs aux deux instantanés : créer un
 * élément n'est pas le déplacer, et l'étape « déplacez-le » ne doit pas se
 * franchir toute seule au moment où il apparaît.
 */
function moved(before: KronoDocument, after: KronoDocument): boolean {
  const dates = new Map(before.items.map((item) => [item.id, toFractionalYear(itemStart(item))]));
  return after.items.some((item) => {
    const was = dates.get(item.id);
    return was !== undefined && was !== toFractionalYear(itemStart(item));
  });
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'place',
    title: TUTORIAL.placeTitle,
    body: TUTORIAL.placeBody,
    anchor: 'event-tool',
    done: (state) => state.document.items.length > 0,
  },
  {
    id: 'move',
    title: TUTORIAL.moveTitle,
    body: TUTORIAL.moveBody,
    anchor: 'canvas',
    // Une date qui a changé depuis le début de l'étape : glissement ou flèches,
    // les deux comptent — on apprend le geste, pas l'outil.
    done: (state, start) => moved(start.document, state.document),
  },
  {
    id: 'name',
    title: TUTORIAL.nameTitle,
    body: TUTORIAL.nameBody,
    anchor: 'canvas',
    done: (state) => state.document.items.some((item) => item.label.trim() !== '' && !state.defaultLabels.includes(item.label)),
  },
  {
    id: 'present',
    title: TUTORIAL.presentTitle,
    body: TUTORIAL.presentBody,
    anchor: 'present-mode',
    done: (state) => state.mode === 'present',
  },
];

/**
 * Indice de l'étape courante : la première non accomplie à partir de `from`.
 * Renvoie `TUTORIAL_STEPS.length` quand tout est fait.
 */
export function currentStep(from: number, state: TutorialState, start: TutorialState): number {
  let index = Math.max(0, from);
  while (index < TUTORIAL_STEPS.length && TUTORIAL_STEPS[index]!.done(state, start)) index++;
  return index;
}
