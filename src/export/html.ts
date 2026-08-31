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
import { exportScene, exportSvg, type SceneOptions } from './render';

export interface HtmlOptions extends SceneOptions {
  /** fiche élève : la page exportée porte les mêmes masques */
  worksheet?: boolean;
}

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
  const scene = exportScene(doc, options);
  const svg = await exportSvg(doc, options);
  const data = {
    width: scene.width,
    height: scene.height,
    items: viewerItems(doc, scene, options.worksheet === true),
    strings: {
      overview: VIEWER.overview,
      position: VIEWER.position(0, 0).replace('0 / 0', '{index} / {total}'),
    },
  };
  const title = escapeHtml(doc.meta.title);

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
    font-size: 13px; color: var(--text-primary, #2C2925); background: var(--paper, #FBFAF7);
  }
  #frise { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; cursor: grab; }
  #frise.krono-dragging { cursor: grabbing; }
  #frise svg { width: 100%; height: 100%; }
  #frise [data-item-id] { cursor: pointer; }
  .krono-highlight { fill: none; stroke: var(--accent, #B24E33); stroke-width: 2.5px; pointer-events: none; }
  #krono-card {
    position: absolute; left: 24px; bottom: 24px; max-width: 380px; padding: 16px;
    background: var(--field-bg, #FCFBF8); border: 1px solid var(--hairline, #DCD7CE);
    border-radius: 10px; box-shadow: 0 4px 16px rgba(44, 41, 37, .14);
  }
  #krono-card h2 { margin: 0 0 4px; font-size: 20px; }
  #krono-card p { margin: 0 0 8px; color: var(--text-secondary, #6F6A61); }
  #krono-card img { display: block; width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-top: 12px; }
  footer {
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    background: var(--chrome-bg, #F3F0EB); border-top: 1px solid var(--hairline, #DCD7CE);
  }
  footer button {
    min-width: 28px; height: 28px; padding: 0 10px; font: inherit; color: inherit; cursor: pointer;
    background: var(--field-bg, #FCFBF8); border: 1px solid var(--hairline, #DCD7CE); border-radius: 6px;
  }
  footer button:hover { background: var(--chrome-bg-inset, #EAE6DF); }
  #krono-counter { min-width: 110px; text-align: center; color: var(--text-secondary, #6F6A61); font-variant-numeric: tabular-nums; }
  .krono-help { flex: 1; color: var(--text-tertiary, #A09A8F); font-size: 11px; }
  .krono-made { color: var(--text-tertiary, #A09A8F); font-size: 11px; }
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
  <p class="krono-dates"></p>
  <p class="krono-description"></p>
  <img alt="" hidden>
</aside>
<footer>
  <button id="krono-prev" type="button" aria-label="${escapeHtml(VIEWER.previous)}">←</button>
  <span id="krono-counter" role="status"></span>
  <button id="krono-next" type="button" aria-label="${escapeHtml(VIEWER.next)}">→</button>
  <button id="krono-fit" type="button">${escapeHtml(VIEWER.fit)}</button>
  <button id="krono-out" type="button" aria-label="${escapeHtml(VIEWER.zoomOut)}">−</button>
  <button id="krono-in" type="button" aria-label="${escapeHtml(VIEWER.zoomIn)}">+</button>
  <button id="krono-full" type="button">${escapeHtml(VIEWER.fullscreen)}</button>
  <span class="krono-help">${escapeHtml(VIEWER.help)}</span>
  <span class="krono-made">${escapeHtml(VIEWER.madeWith)}</span>
</footer>
<script>window.__KRONO__ = ${escapeJson(data)};</script>
<script>${VIEWER_SCRIPT}</script>
</body>
</html>
`;
}
