/**
 * La mesure décide de la largeur des puces : si elle sous-estime, le texte
 * déborde de sa boîte — le défaut signalé sur la page exportée du 31 août.
 * Les largeurs de référence ont été relevées dans le navigateur (canvas 2D,
 * police d'interface réelle) sur des libellés des fixtures.
 */
import { describe, expect, it } from 'vitest';
import { approximateMeasurer, cachedMeasurer } from './measure';

/** [texte, largeur réelle en px] à 13 px, graisse 500. */
const LABELS_13_500: [string, number][] = [
  ['Monarchie constitutionnelle', 171.78],
  ['Convention', 70.2],
  ['Consulat et Empire', 117.21],
  ['Avènement de Louis XVI', 149.36],
  ['Ouverture des États généraux', 184.43],
  ['Déclaration des droits de l’homme', 211.84],
  ['Naissance de l’écriture', 141.02],
  ['Chute de l’Empire romain d’Occident', 227.31],
  ['Couronnement de Charlemagne', 196.64],
  ['Époque contemporaine', 143.27],
  ['Moyen Âge', 68.54],
  ['Pax Romana', 75.67],
  ['Waterloo', 55.49],
  ['Rome', 35.1],
];

/** À 11 px, graisse 400 — les dates sous une puce. */
const CAPTIONS_11_400: [string, number][] = [
  ['14 juillet 1789', 72.26],
  ['3300 av. J.-C. – 476', 107.44],
  ['2 000 000 av. J.-C.', 101.33],
  ['XVIIᵉ siècle', 58.89],
];

describe('mesure approchée', () => {
  it('ne sous-estime jamais la largeur réelle', () => {
    for (const [text, real] of LABELS_13_500) {
      expect(approximateMeasurer.measure(text, 13, 500)).toBeGreaterThanOrEqual(real);
    }
    for (const [text, real] of CAPTIONS_11_400) {
      expect(approximateMeasurer.measure(text, 11, 400)).toBeGreaterThanOrEqual(real);
    }
  });

  it('reste à moins de 4 % au-dessus : la puce ne se met pas à flotter', () => {
    for (const [text, real] of LABELS_13_500) {
      expect(approximateMeasurer.measure(text, 13, 500) / real).toBeLessThan(1.04);
    }
    for (const [text, real] of CAPTIONS_11_400) {
      expect(approximateMeasurer.measure(text, 11, 400) / real).toBeLessThan(1.04);
    }
  });

  it('suit la taille et la graisse', () => {
    const at13 = approximateMeasurer.measure('Antiquité', 13, 500);
    expect(approximateMeasurer.measure('Antiquité', 26, 500)).toBeCloseTo(at13 * 2, 6);
    expect(approximateMeasurer.measure('Antiquité', 13, 600)).toBeGreaterThan(at13);
    expect(approximateMeasurer.measure('Antiquité', 13, 400)).toBeLessThan(at13);
  });

  it('donne une largeur plausible à un caractère inconnu', () => {
    const known = approximateMeasurer.measure('e', 13, 500);
    const unknown = approximateMeasurer.measure('Ж', 13, 500);
    expect(unknown).toBeGreaterThan(known * 0.5);
    expect(unknown).toBeLessThan(known * 2);
  });

  it('mémoïse sans changer le résultat', () => {
    const cached = cachedMeasurer(approximateMeasurer);
    expect(cached.measure('Waterloo', 13, 500)).toBe(approximateMeasurer.measure('Waterloo', 13, 500));
    expect(cached.measure('Waterloo', 13, 500)).toBe(approximateMeasurer.measure('Waterloo', 13, 500));
  });
});
