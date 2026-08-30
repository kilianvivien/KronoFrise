/**
 * Mesure de texte — PLAN.md §4.2 : `layout/` ne touche pas au DOM, la mesure
 * passe donc par une interface injectable. Le navigateur fournit un
 * mesureur exact (canvas) ; les tests et les exports headless se contentent
 * de l'approximation ci-dessous.
 */

export interface Measurer {
  /** largeur en pixels d'un texte, pour une taille et une graisse données */
  measure(text: string, fontSize: number, weight?: number): number;
}

/**
 * Approximation par largeur moyenne de glyphe, calibrée sur SF Pro Text :
  * ~0,52 em en régulier, un peu plus en demi-gras. Suffisant pour
 * l'empilement (une erreur de quelques pixels ne change pas une rangée).
 */
export const approximateMeasurer: Measurer = {
  measure(text: string, fontSize: number, weight = 400): number {
    const factor = weight >= 600 ? 0.56 : 0.52;
    let units = 0;
    for (const char of text) {
      if (char === ' ') units += 0.42;
      else if ('iljItf.,;:!|\'’'.includes(char)) units += 0.34;
      else if ('mwMW—'.includes(char)) units += 0.92;
      else if (char >= '0' && char <= '9') units += 0.55;
      else units += 1;
    }
    return units * fontSize * factor;
  },
};

/** Mesureur mémoïsé : la mise en page tourne à chaque image de glissement. */
export function cachedMeasurer(inner: Measurer): Measurer {
  const cache = new Map<string, number>();
  return {
    measure(text, fontSize, weight = 400) {
      const key = `${fontSize}|${weight}|${text}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const width = inner.measure(text, fontSize, weight);
      cache.set(key, width);
      return width;
    },
  };
}
