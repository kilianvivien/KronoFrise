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

/**
 * `fontFace` porte la règle `@font-face` de la fonte du thème, en data URL.
 *
 * Elle est **passée**, pas calculée ici : les fichiers de police pèsent un
 * demi-mégaoctet une fois en base64, et les importer depuis le rendu les
 * aurait fait charger dès la première vignette de la bibliothèque. Seuls les
 * exports en ont besoin — à l'écran, la police est déjà là. C'est aussi le bon
 * sens de dépendance : `renderer/` ne remonte pas vers `export/`.
 */
export function renderToSvgString(props: FriseProps, fontFace = ''): string {
  const markup = renderToStaticMarkup(createElement(Frise, props));
  const style = `<style>${fontFace}${tokensCss}</style>`;
  return markup.replace(/^(<svg[^>]*>)/, `$1${style}`);
}

/** Raccourci : scène + titre, thème par défaut. */
export function sceneToSvg(scene: SceneGraph, title: string): string {
  return renderToSvgString({ scene, title });
}
