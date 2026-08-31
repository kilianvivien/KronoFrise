/**
 * Export « page web interactive » — un fichier `.html` autonome.
 *
 * Même chaîne que les autres exports (docs/format.md §9) : la frise est le SVG
 * du rendu partagé, figé. La page n'ajoute qu'une fenêtre de vue déplaçable et
 * une fiche d'élément ; elle ne recalcule aucune géométrie, donc ce que l'on
 * voit dans le navigateur est bien ce que l'on voyait dans l'éditeur.
 *
 * Autonome au sens strict : aucune requête réseau, aucune police externe, les
 * images sont déjà des data URL dans le document.
 */
import { chronological, itemEnd, itemStart } from '../core/document';
import { formatDate } from '../core/dates';
import type { Item, KronoDocument } from '../core/types';
import type { SceneGraph } from '../layout/scene';
import { EDITOR, VIEWER } from '../ui/strings';
import { resolveToken } from '../ui/tokenValues';
import type { IconName } from '../ui/icons';
import { exportScene, exportSvg, type SceneOptions } from './render';

export interface HtmlOptions extends SceneOptions {
  /** fiche élève : la page exportée porte les mêmes masques */
  worksheet?: boolean;
}

/**
 * Largeur de mise en page de la page exportée. Elle décide de la taille
 * apparente du texte : la vue d'ensemble montre toute cette largeur, donc plus
 * elle est grande, plus les libellés sont petits à l'écran. 1200 px place un
 * libellé de 13 px à environ 12 px dans une fenêtre d'ordinateur portable.
 * La hauteur reste naturelle : gonfler la scène ne ferait que pousser les
 * éléments au bas d'une bande vide.
 */
export const VIEWER_WIDTH = 1200;

interface ViewerItem {
  id: string;
  label: string;
  dates: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Échappe le texte destiné au HTML : un libellé n'est jamais du balisage. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** JSON sûr dans un `<script>` : `</script>` ne peut pas s'en échapper. */
export function escapeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function itemDates(item: Item): string {
  return item.kind === 'event'
    ? formatDate(item.date, { monthStyle: 'long' })
    : EDITOR.range(formatDate(itemStart(item)), formatDate(itemEnd(item)));
}

/** Les éléments de la page, dans l'ordre chronologique du parcours. */
export function viewerItems(doc: KronoDocument, scene: SceneGraph, masked: boolean): ViewerItem[] {
  const boxes = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const event of scene.events) boxes.set(event.itemId, { ...event.chip });
  for (const period of scene.periods) {
    boxes.set(period.itemId, { x: period.x0, y: period.y, width: Math.max(period.x1 - period.x0, 2), height: period.height });
  }
  return chronological(doc.items).flatMap((item) => {
    const box = boxes.get(item.id);
    if (box === undefined) return [];
    // En fiche élève, la page ne souffle pas davantage que la frise imprimée.
    const hidden = masked ? maskOfItem(doc, item.id) : undefined;
    return [{
      id: item.id,
      label: hidden === 'label' || hidden === 'both' ? '' : item.label,
      dates: hidden === 'date' || hidden === 'both' ? '' : itemDates(item),
      description: hidden === undefined ? item.description ?? '' : '',
      ...box,
    }];
  });
}

function maskOfItem(doc: KronoDocument, itemId: string): 'label' | 'date' | 'both' | undefined {
  return doc.pedagogy.maskedItems.find((mask) => mask.itemId === itemId)?.hide;
}

export async function exportHtml(doc: KronoDocument, options: HtmlOptions): Promise<string> {
  const { VIEWER_SCRIPT } = await import('./viewerScript');
  // Les icônes de la page exportée sont **les mêmes** que celles de
  // l'application : elles sont rendues ici en balisage, jamais redessinées.
  const icons = await iconMarkup(['back', 'chevronRight', 'zoomOut', 'zoomIn', 'fit', 'present']);
  const page = { ...options, width: options.width };
  const scene = exportScene(doc, page);
  const svg = await exportSvg(doc, page);
  const data = {
    width: scene.width,
    height: scene.height,
    // Le visionneur garde la ligne du temps dans le cadre : sans elle, un zoom
    // sur un élément ne dit plus à quelle époque on se trouve.
    baseline: scene.baselineY,
    items: viewerItems(doc, scene, page.worksheet === true),
    strings: {
      overview: VIEWER.overview,
      position: VIEWER.position(0, 0).replace('0 / 0', '{index} / {total}'),
    },
  };
  const title = escapeHtml(doc.meta.title);
  // Le SVG exporté embarque déjà les jetons ; ces valeurs de repli viennent du
  // même fichier `tokens.css`, jamais d'hexadécimaux recopiés (DESIGN.md §1.2).
  const token = (name: string): string => resolveToken(`var(${name})`);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 13px; color: var(--text-primary, ${token('--text-primary')}); background: var(--paper, ${token('--paper')});
  }
  #frise { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; }
  #frise.krono-dragging { cursor: grabbing; }
  #frise svg { width: 100%; height: 100%; }
  #frise [data-item-id] { cursor: pointer; }
  .krono-highlight { fill: none; stroke: var(--accent, ${token('--accent')}); stroke-width: 2.5px; pointer-events: none; }
  #krono-card {
    position: fixed; left: 24px; bottom: 64px; max-width: min(380px, calc(100vw - 48px)); padding: 16px;
    background: var(--field-bg, ${token('--field-bg')}); border: 1px solid var(--hairline, ${token('--hairline')});
    border-radius: 10px; box-shadow: 0 4px 16px rgba(44, 41, 37, .14);
  }
  #krono-card h2 { margin: 0 0 4px; font-size: 20px; }
  #krono-card p { margin: 0 0 8px; color: var(--text-secondary, ${token('--text-secondary')}); }
  #krono-card img { display: block; width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-top: 12px; }
  footer {
    display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px;
    background: var(--chrome-bg, ${token('--chrome-bg')}); border-top: 1px solid var(--hairline, ${token('--hairline')});
  }
  footer button {
    display: inline-flex; align-items: center; gap: 6px;
    min-width: 28px; height: 28px; padding: 0 10px; font: inherit; color: inherit; cursor: pointer;
    background: var(--field-bg, ${token('--field-bg')}); border: 1px solid var(--hairline, ${token('--hairline')}); border-radius: 6px;
  }
  footer button.icon { padding: 0; justify-content: center; }
  footer button:disabled { opacity: .4; pointer-events: none; }
  footer svg { flex: 0 0 16px; }
  footer button:hover { background: var(--chrome-bg-inset, ${token('--chrome-bg-inset')}); }
  #krono-counter { min-width: 110px; text-align: center; color: var(--text-secondary, ${token('--text-secondary')}); font-variant-numeric: tabular-nums; }
  .krono-help {
    flex: 1; min-width: 0; color: var(--text-tertiary, ${token('--text-tertiary')}); font-size: 11px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .krono-made { color: var(--text-tertiary, ${token('--text-tertiary')}); font-size: 11px; }
  @media print {
    footer, #krono-card { display: none; }
    #frise { overflow: visible; }
  }
</style>
</head>
<body>
<main id="frise">${svg}</main>
<aside id="krono-card" hidden>
  <h2></h2>
  <p class="krono-dates" hidden></p>
  <p class="krono-description"></p>
  <img alt="" hidden>
</aside>
<footer>
  <button id="krono-prev" class="icon" type="button" aria-label="${escapeHtml(VIEWER.previous)}" title="${escapeHtml(VIEWER.previous)}">${icons.back}</button>
  <span id="krono-counter" role="status"></span>
  <button id="krono-next" class="icon" type="button" aria-label="${escapeHtml(VIEWER.next)}" title="${escapeHtml(VIEWER.next)}">${icons.chevronRight}</button>
  <button id="krono-fit" type="button">${icons.fit}${escapeHtml(VIEWER.fit)}</button>
  <button id="krono-out" class="icon" type="button" aria-label="${escapeHtml(VIEWER.zoomOut)}" title="${escapeHtml(VIEWER.zoomOut)}">${icons.zoomOut}</button>
  <button id="krono-in" class="icon" type="button" aria-label="${escapeHtml(VIEWER.zoomIn)}" title="${escapeHtml(VIEWER.zoomIn)}">${icons.zoomIn}</button>
  <button id="krono-full" type="button">${icons.present}${escapeHtml(VIEWER.fullscreen)}</button>
  <span class="krono-help">${escapeHtml(VIEWER.help)}</span>
  <span class="krono-made">${escapeHtml(VIEWER.madeWith)}</span>
</footer>
<script>window.__KRONO__ = ${escapeJson(data)};</script>
<script>${VIEWER_SCRIPT}</script>
</body>
</html>
`;
}

/** Rend des icônes de `ui/icons.tsx` en balisage SVG pour la page exportée. */
async function iconMarkup<T extends IconName>(names: readonly T[]): Promise<Record<T, string>> {
  const [{ createElement }, { renderToStaticMarkup }, { Icon }] = await Promise.all([
    import('react'), import('react-dom/server'), import('../ui/icons'),
  ]);
  const markup = {} as Record<T, string>;
  for (const name of names) markup[name] = renderToStaticMarkup(createElement(Icon, { name }));
  return markup;
}
