/**
 * Mesureur exact fondé sur le canevas 2D — l'implémentation navigateur de
 * l'interface `layout/measure.ts`. Il vit dans `ui/` parce qu'il touche au
 * DOM, que `layout/` s'interdit (PLAN.md §4.2).
 *
 * **Seule la fonte d'interface passe par le canevas.** Pour les fontes que
 * nous livrons, la table engendrée est relevée dans le fichier même que le
 * navigateur affiche : elle est donc exacte, et s'en servir évite une course —
 * mesurer au canevas avant que la police soit téléchargée aurait figé la
 * largeur du **repli** (Georgia, cursive) dans une mise en page que rien ne
 * recalculait ensuite. La fonte du système, elle, n'a pas de fichier : le
 * canevas reste le seul moyen de la mesurer juste.
 */
import { approximateMeasurer, cachedMeasurer, type Measurer } from '../layout/measure';
import { DEFAULT_FACE, faceById } from '../shared/faces';
import { FONT_UI } from '../renderer/style';

function createCanvasMeasurer(): Measurer {
  const context = document.createElement('canvas').getContext('2d');
  if (context === null) return approximateMeasurer;
  const uiFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim();
  return {
    measure(text, fontSize, weight = 400, face = DEFAULT_FACE) {
      if (faceById(face).table !== undefined) return approximateMeasurer.measure(text, fontSize, weight, face);
      context.font = `${weight} ${fontSize}px ${uiFamily === '' ? FONT_UI : uiFamily}`;
      return context.measureText(text).width;
    },
  };
}

export const canvasMeasurer: Measurer = cachedMeasurer(createCanvasMeasurer());
