import type { KronoDocument } from '../core/types';
import { layout } from './layout';
import { approximateMeasurer, forFace, type Measurer } from './measure';
import { themeById } from '../themes';
import { makeScale, type ScaleInsets } from './scale';

/** Fit label footprints, not just dates. Insets are camera geometry, never data. */
export function fitInsets(doc: KronoDocument, width: number, raw: Measurer = approximateMeasurer): ScaleInsets {
  // Même fonte que `layout()`, sans quoi les marges réservées ne
  // correspondraient pas aux libellés réellement dessinés.
  const measurer = forFace(raw, themeById(doc.themeId).face);
  const insets = { left: 16, right: 16 };
  for (let pass = 0; pass < 16; pass++) {
    const scale = makeScale(doc.axis, width, 0, 1, insets), scene = layout(doc, scale, { measurer: raw });
    let left = 8, right = width - 8;
    for (const event of scene.events) {
      left = Math.min(left, event.chip.x); right = Math.max(right, event.chip.x + event.chip.width);
    }
    for (const period of scene.periods) {
      const labelWidth = measurer.measure(period.label, 13, 600);
      const labelLeft = period.shape === 'bracket' ? (period.x0 + period.x1 - labelWidth) / 2 : period.labelInside ? period.labelX - labelWidth / 2 : period.labelX;
      left = Math.min(left, period.x0, labelLeft); right = Math.max(right, period.x1, labelLeft + labelWidth);
    }
    const addLeft = Math.max(0, 8 - left), addRight = Math.max(0, right - width + 8);
    if (addLeft + addRight < .1) break;
    insets.left += addLeft; insets.right += addRight;
    // A label wider than the viewport cannot fit without wrapping or shrinking.
    if (insets.left + insets.right > width - 64) {
      const ratio = Math.max(0, width - 64) / (insets.left + insets.right);
      insets.left *= ratio; insets.right *= ratio; break;
    }
  }
  return insets;
}
