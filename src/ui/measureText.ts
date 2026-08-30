/**
 * Mesureur exact fondé sur le canevas 2D — l'implémentation navigateur de
 * l'interface `layout/measure.ts`. Il vit dans `ui/` parce qu'il touche au
 * DOM, que `layout/` s'interdit (PLAN.md §4.2).
 */
import { approximateMeasurer, cachedMeasurer, type Measurer } from '../layout/measure';
import { FONT_UI } from '../renderer/style';

function createCanvasMeasurer(): Measurer {
  const context = document.createElement('canvas').getContext('2d');
  if (context === null) return approximateMeasurer;
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim();
  return {
    measure(text, fontSize, weight = 400) {
      context.font = `${weight} ${fontSize}px ${family === '' ? FONT_UI : family}`;
      return context.measureText(text).width;
    },
  };
}

export const canvasMeasurer: Measurer = cachedMeasurer(createCanvasMeasurer());
