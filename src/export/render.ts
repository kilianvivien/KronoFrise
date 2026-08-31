/**
 * Point d'entrée des exports — docs/format.md §9.
 *
 * Un seul chemin : `layout(document)` → `SceneGraph` → rendu. Le SVG est le
 * rendu de l'écran sérialisé ; le PNG est ce SVG matricé ; le PDF dessine la
 * même scène en vectoriel. Rien n'est dessiné deux fois.
 */
import { fitInsets } from '../layout/fit';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import type { Measurer } from '../layout/measure';
import type { SceneGraph } from '../layout/scene';
import type { KronoDocument } from '../core/types';
import { themeById } from '../themes';

export interface SceneOptions {
  /** largeur de la scène, en pixels CSS */
  width: number;
  height?: number;
  worksheet?: boolean;
  measurer?: Measurer;
}

/** La scène telle qu'elle sera exportée, à la largeur demandée. */
export function exportScene(doc: KronoDocument, options: SceneOptions): SceneGraph {
  const insets = fitInsets(doc, options.width, options.measurer);
  const scale = makeScale(doc.axis, options.width, 0, 1, insets);
  return layout(doc, scale, {
    ...(options.measurer ? { measurer: options.measurer } : {}),
    ...(options.height === undefined ? {} : { height: options.height }),
    ...(options.worksheet === true ? { worksheet: true } : {}),
  });
}

/** SVG autonome : le fichier s'ouvre correctement hors de l'application. */
export async function exportSvg(doc: KronoDocument, options: SceneOptions): Promise<string> {
  const { renderToSvgString } = await import('../renderer/renderToSvgString');
  return renderToSvgString({
    scene: exportScene(doc, options),
    title: doc.meta.title,
    theme: themeById(doc.themeId),
  });
}

export interface PngOptions extends SceneOptions {
  /** 1×, 2× ou 3× (DESIGN.md §3.6) */
  ratio: number;
  transparent?: boolean;
}

/**
 * PNG : le SVG exporté, matricé hors écran. Ce n'est pas une capture de la
 * page — c'est le même fichier vectoriel, rendu par le navigateur.
 */
export async function exportPng(doc: KronoDocument, options: PngOptions): Promise<Blob> {
  const svg = await exportSvg(doc, options);
  const scene = exportScene(doc, options);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(scene.width * options.ratio);
    canvas.height = Math.round(scene.height * options.ratio);
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('canvas');
    if (options.transparent !== true) {
      // Le papier du thème est déjà peint par le rendu ; on ne le double pas.
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('png')); }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('svg'));
    image.src = url;
  });
}

/** Nom de fichier sûr, dérivé du titre du document. */
export function exportFilename(doc: KronoDocument, extension: string, fallback: string): string {
  const base = doc.meta.title.replace(/[<>:"/\\|?*]/g, '_').trim();
  return `${base === '' ? fallback : base}.${extension}`;
}
