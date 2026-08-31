import { describe, expect, it } from 'vitest';
import { createDocument } from '../core/document';
import { newId } from '../core/ids';
import type { KronoDocument } from '../core/types';
import { EDITOR } from './strings';
import { currentStep, TUTORIAL_STEPS } from './tutorialSteps';
import type { TutorialState } from './tutorialSteps';

const DEFAULTS = [EDITOR.event, EDITOR.period] as const;
const stateOf = (document: KronoDocument, mode: TutorialState['mode'] = 'edit'): TutorialState =>
  ({ document, mode, defaultLabels: DEFAULTS });

function withEvent(label: string, year: number): KronoDocument {
  const document = createDocument();
  document.items = [{ id: newId(), kind: 'event', laneId: document.lanes[0]!.id, label, color: 'brique', date: { year } }];
  return document;
}

describe('tutoriel d’accueil', () => {
  it('reste sur la première étape tant qu’aucun événement n’existe', () => {
    const empty = stateOf(createDocument());
    expect(currentStep(0, empty, empty)).toBe(0);
    expect(TUTORIAL_STEPS[0]!.id).toBe('place');
  });

  it('franchit « placer » dès qu’un élément existe, sans bouton « suivant »', () => {
    const start = stateOf(createDocument());
    expect(currentStep(0, stateOf(withEvent(EDITOR.event, 1789)), start)).toBe(1);
  });

  it('n’accepte « déplacer » que si une date a réellement changé', () => {
    const placed = withEvent(EDITOR.event, 1789);
    const start = stateOf(placed);
    // Même document : rien n'a bougé, l'étape tient.
    expect(currentStep(1, stateOf(placed), start)).toBe(1);
    const moved = structuredClone(placed);
    (moved.items[0] as { date: { year: number } }).date.year = 1799;
    expect(currentStep(1, stateOf(moved), start)).toBe(2);
  });

  it('ne compte pas le libellé par défaut comme un nom donné', () => {
    const moved = withEvent(EDITOR.event, 1789);
    const start = stateOf(withEvent(EDITOR.event, 1780));
    expect(currentStep(2, stateOf(moved), start)).toBe(2);
    expect(currentStep(2, stateOf(withEvent('Prise de la Bastille', 1789)), start)).toBe(3);
  });

  it('ne compte pas la création d’un élément comme un déplacement', () => {
    // Sinon « déplacez-le » se franchirait au moment même où l'élément
    // apparaît, et l'on n'aurait jamais appris le geste.
    const start = stateOf(createDocument());
    expect(currentStep(1, stateOf(withEvent(EDITOR.event, 1789)), start)).toBe(1);
  });

  it('franchit d’un coup les étapes déjà satisfaites', () => {
    // Créer un événement ouvre déjà le champ du libellé : celui qui le nomme
    // tout de suite ne doit pas se voir redemander de le nommer ensuite.
    const placed = withEvent(EDITOR.event, 1804);
    const start = stateOf(placed);
    const after = structuredClone(placed);
    after.items[0]!.label = 'Sacre de Napoléon';
    (after.items[0] as { date: { year: number } }).date.year = 1805;
    expect(currentStep(1, stateOf(after), start)).toBe(3);
  });

  it('s’achève en passant en mode présentation', () => {
    const named = withEvent('Sacre de Napoléon', 1804);
    const start = stateOf(createDocument());
    expect(currentStep(3, stateOf(named, 'present'), start)).toBe(TUTORIAL_STEPS.length);
  });

  it('accroche chaque étape à un contrôle réel et porte un texte non vide', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.anchor).toMatch(/^[a-z-]+$/);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
    expect(TUTORIAL_STEPS.map((step) => step.id)).toEqual(['place', 'move', 'name', 'present']);
  });
});
