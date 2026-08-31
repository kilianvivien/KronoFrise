import { describe, expect, it } from 'vitest';
import { cssMilliseconds, resolveToken, TOKENS } from './tokenValues';

describe('durées lues dans les jetons', () => {
  it('lit les deux écritures d’une même durée : celle de la source et celle du minificateur', () => {
    // `tokens.css` écrit « 140ms » ; la construction de production publie
    // « .14s ». Les deux doivent donner la même animation.
    expect(cssMilliseconds('140ms')).toBe(140);
    expect(cssMilliseconds('.14s')).toBe(140);
    expect(cssMilliseconds('0.24s')).toBe(240);
    expect(cssMilliseconds('600ms')).toBe(600);
  });

  it('suit un renvoi vers un autre jeton, comme pour les couleurs', () => {
    expect(cssMilliseconds('var(--motion-ui)')).toBe(140);
  });

  it('rend zéro plutôt qu’un NaN quand la valeur n’est pas une durée', () => {
    expect(cssMilliseconds('')).toBe(0);
    expect(cssMilliseconds('ease-out')).toBe(0);
    expect(cssMilliseconds('var(--inconnu)')).toBe(0);
  });

  it('donne aux trois durées de DESIGN.md §8 leur valeur écrite', () => {
    expect(cssMilliseconds(TOKENS['--motion-ui'] ?? '')).toBe(140);
    expect(cssMilliseconds(TOKENS['--motion-camera'] ?? '')).toBe(240);
    expect(cssMilliseconds(TOKENS['--motion-step'] ?? '')).toBe(600);
    expect(resolveToken('var(--ease-ui)')).toBe('ease-out');
  });
});
