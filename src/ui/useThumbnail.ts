import { useEffect, useRef } from 'react';
import type { KronoDocument } from '../core/types';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { saveThumbnail } from '../store/persistence';
import { themeById } from '../themes';
import { canvasMeasurer } from './measureText';

/** Uses the shared renderer; this is a cache, never part of the document transaction. */
export function useThumbnail(doc: KronoDocument, ready: boolean, revision: number): void {
  const previous = useRef({ id: '', time: 0 });
  useEffect(() => {
    if (!ready) return;
    const delay = previous.current.id === doc.id ? Math.max(500, 30_000 - (Date.now() - previous.current.time)) : 500;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
      const { renderToSvgString } = await import('../renderer/renderToSvgString');
      if (cancelled) return;
      previous.current = { id: doc.id, time: Date.now() };
      const scene = layout(doc, makeScale(doc.axis, 400), { measurer: canvasMeasurer, height: 250 });
      const svg = renderToSvgString({ scene, title: doc.meta.title, theme: themeById(doc.themeId) });
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        if (cancelled) return;
        const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = scene.height;
        canvas.getContext('2d')?.drawImage(image, 0, 0);
        canvas.toBlob((blob) => { if (blob) void saveThumbnail(doc.id, blob).catch(() => {}); }, 'image/png');
      };
      image.onerror = () => URL.revokeObjectURL(url); image.src = url;
      })().catch(() => {});
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [doc, ready, revision]);
}
