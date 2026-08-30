/**
 * Rendu headless : le **même** composant que l'écran, sérialisé en chaîne SVG
 * autonome (docs/format.md §9). Les jetons de `tokens.css` sont incorporés,
 * si bien que le fichier s'ouvre correctement hors de l'application.
 *
 * Interdit : tout code de dessin propre à l'export.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import tokensCss from '../ui/tokens.css?inline';
import type { SceneGraph } from '../layout/scene';
import { Frise, type FriseProps } from './Frise';

export function renderToSvgString(props: FriseProps): string {
  const markup = renderToStaticMarkup(createElement(Frise, props));
  const style = `<style>${tokensCss}</style>`;
  return markup.replace(/^(<svg[^>]*>)/, `$1${style}`);
}

/** Raccourci : scène + titre, thème par défaut. */
export function sceneToSvg(scene: SceneGraph, title: string): string {
  return renderToSvgString({ scene, title });
}
