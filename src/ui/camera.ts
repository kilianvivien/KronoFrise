import type { Scale } from '../layout/scale';

// SPEC? Half a viewport of space at either end keeps grab-to-pan available
// even at fit zoom, without letting the entire document disappear (§11).
export function panLimits(scale: Pick<Scale, 'width' | 'maxPan'>) {
  return { min: -scale.width / 2, max: scale.maxPan() + scale.width / 2 };
}
export function clampPan(scale: Pick<Scale, 'width' | 'maxPan'>, pan: number): number {
  const { min, max } = panLimits(scale);
  return Math.max(min, Math.min(max, pan));
}
