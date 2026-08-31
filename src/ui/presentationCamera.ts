/**
 * Caméra du mode présentation — PLAN.md §3.5 : « chaque événement mis en
 * valeur et zoomé par un mouvement de caméra fluide ».
 *
 * Pure : elle ne connaît que l'axe, la largeur et l'élément visé, et rend un
 * couple `{ zoom, pan }` que la vue interpole. Aucun DOM ici, donc testable.
 */
import { toFractionalYear } from '../core/dates';
import { itemEnd, itemStart } from '../core/document';
import type { Item, KronoDocument } from '../core/types';
import { makeScale, type ScaleInsets } from '../layout/scale';
import { clampPan } from './camera';

export interface Camera {
  zoom: number;
  pan: number;
}

export const OVERVIEW: Camera = { zoom: 1, pan: 0 };

/** Une période occupe au plus cette part de la vue : elle garde son contexte. */
const SPAN_SHARE = 0.62;
/**
 * Un événement ponctuel n'a pas de largeur : on montre cette part de l'axe.
 * Assez serré pour le mettre en valeur, assez large pour garder des repères —
 * un zoom plus fort donnait un texte démesuré sur les segments comprimés.
 */
const EVENT_SHARE = 0.3;
/** Au-delà, le texte reste net mais la frise n'a plus de repères. */
const MAX_ZOOM = 60;

/** Zoom et décalage qui centrent `item` dans une vue de `width` pixels. */
export function focusCamera(
  doc: KronoDocument,
  item: Item,
  width: number,
  insets: ScaleInsets,
): Camera {
  const base = makeScale(doc.axis, width, 0, 1, insets);
  const from = toFractionalYear(itemStart(item));
  const to = toFractionalYear(itemEnd(item));
  const span = Math.max(base.timeToX(to, 'left') - base.timeToX(from), 0);
  // Fenêtre voulue, exprimée dans les pixels de la vue ajustée (zoom 1).
  const window = Math.max(span / SPAN_SHARE, width * EVENT_SHARE);
  const zoom = Math.min(MAX_ZOOM, Math.max(1, width / Math.max(window, 1)));
  const scale = makeScale(doc.axis, width, 0, zoom, insets);
  const centre = (scale.timeToX(from) + scale.timeToX(to, 'left')) / 2;
  return { zoom, pan: clampPan(scale, centre - width / 2) };
}

/** Courbe de DESIGN.md §8 — `cubic-bezier(0.2, 0, 0, 1)`, résolue en x. */
export function easeCamera(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  // Newton sur x(u) ; la courbe est monotone, trois passes suffisent.
  let u = clamped;
  for (let i = 0; i < 4; i++) {
    const x = 3 * (1 - u) * (1 - u) * u * 0.2 + 3 * (1 - u) * u * u * 0 + u * u * u;
    const dx = 3 * (1 - u) * (1 - u) * 0.2 + 6 * (1 - u) * u * (0 - 0.2) + 3 * u * u * (1 - 0);
    if (Math.abs(dx) < 1e-6) break;
    u -= (x - clamped) / dx;
    u = Math.max(0, Math.min(1, u));
  }
  return 3 * (1 - u) * (1 - u) * u * 0 + 3 * (1 - u) * u * u * 1 + u * u * u;
}

export function interpolate(from: Camera, to: Camera, progress: number): Camera {
  const eased = easeCamera(progress);
  return {
    // Le zoom s'interpole géométriquement : la vitesse apparente reste égale.
    zoom: from.zoom * Math.pow(to.zoom / from.zoom, eased),
    pan: from.pan + (to.pan - from.pan) * eased,
  };
}
