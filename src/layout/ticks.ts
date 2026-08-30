/**
 * Graduations adaptatives — DESIGN.md §4.
 *
 * Chaque segment choisit **sa propre** densité : sur la frise des grandes
 * périodes, la préhistoire est graduée par centaines de milliers d'années
 * pendant que l'époque contemporaine l'est par décennies. Les libellés ne se
 * chevauchent jamais : quand la place manque, on garde une graduation sur
 * deux, puis sur trois (jamais de texte incliné).
 */
import { formatCentury, formatDate, formatYear, fromFractionalYear } from '../core/dates';
import {
  MAX_MINOR_PER_MAJOR,
  MIN_MAJOR_STEP_PX,
  MIN_MINOR_STEP_PX,
} from './metrics';
import type { Scale } from './scale';

export type TickLevel = 'millennium' | 'century' | 'decade' | 'year' | 'month';

export interface Tick {
  /** année fractionnaire */
  t: number;
  /** abscisse à l'écran, `pan` appliqué */
  x: number;
  major: boolean;
  level: TickLevel;
  /** présent seulement sur les majeures retenues après anti-chevauchement */
  label?: string;
  segmentIndex: number;
}

const MONTH = 1 / 12;

/** Échelle des pas, du mois au million d'années. */
const STEPS: readonly number[] = [
  MONTH, 3 * MONTH, 6 * MONTH,
  1, 2, 5, 10, 20, 25, 50,
  100, 200, 500,
  1_000, 2_000, 5_000,
  10_000, 20_000, 50_000,
  100_000, 200_000, 500_000,
  1_000_000, 2_000_000, 5_000_000,
];

const SUBDIVISIONS: readonly number[] = [10, 5, 4, 2];

/** Largeur approchée d'un caractère de libellé en 11 px (--fs-caption). */
const CHAR_WIDTH = 6.2;
/** Marge minimale entre deux libellés voisins. */
const LABEL_PADDING = 10;

export function levelOfStep(step: number): TickLevel {
  if (step < 1) return 'month';
  if (step < 10) return 'year';
  if (step < 100) return 'decade';
  if (step === 100) return 'century';
  return 'millennium';
}

/** Pas majeur le plus fin qui laisse au moins `MIN_MAJOR_STEP_PX` entre deux graduations. */
export function chooseStep(pxPerYear: number, level?: TickLevel): number {
  const candidates = level === undefined ? STEPS : STEPS.filter((step) => levelOfStep(step) === level);
  for (const step of candidates) {
    if (step * pxPerYear >= MIN_MAJOR_STEP_PX) return step;
  }
  return candidates[candidates.length - 1] ?? STEPS[STEPS.length - 1] ?? 1;
}

export function buildTicks(scale: Scale, level?: TickLevel): Tick[] {
  const ticks: Tick[] = [];
  const visibleLeft = scale.pan;
  const visibleRight = scale.pan + scale.width;

  for (const segment of scale.segments) {
    // Ne graduer que la portion réellement visible : le segment préhistorique
    // couvre trois millions d'années, on n'en dessine jamais la totalité.
    const x0 = Math.max(segment.x0, visibleLeft);
    const x1 = Math.min(segment.x1, visibleRight);
    if (x1 <= x0) continue;

    const from = segment.from + (x0 - segment.x0) / segment.pxPerYear;
    const to = segment.from + (x1 - segment.x0) / segment.pxPerYear;
    const step = chooseStep(segment.pxPerYear, level);
    const tickLevel = levelOfStep(step);
    // Les siècles commencent en 1601, pas en 1600 : la grille est décalée d'un an.
    const offset = tickLevel === 'century' ? 1 : 0;

    const majors: Tick[] = [];
    const firstIndex = Math.ceil((from - offset) / step - 1e-9);
    const lastIndex = Math.floor((to - offset) / step + 1e-9);
    for (let i = firstIndex; i <= lastIndex; i++) {
      const t = i * step + offset;
      majors.push({
        t,
        // Position calculée dans le segment courant : une graduation posée sur
        // une borne reste de son côté de la coupure.
        x: segment.x0 + (t - segment.from) * segment.pxPerYear - scale.pan,
        major: true,
        level: tickLevel,
        label: labelFor(t, tickLevel),
        segmentIndex: segment.index,
      });
    }
    thinLabels(majors, step, offset, step * segment.pxPerYear);
    ticks.push(...majors);

    const minorStep = chooseMinorStep(step, segment.pxPerYear);
    if (minorStep !== null) {
      const firstMinor = Math.ceil((from - offset) / minorStep - 1e-9);
      const lastMinor = Math.floor((to - offset) / minorStep + 1e-9);
      for (let i = firstMinor; i <= lastMinor; i++) {
        if (Number.isInteger((i * minorStep) / step)) continue; // déjà une majeure
        const t = i * minorStep + offset;
        ticks.push({
          t,
          x: segment.x0 + (t - segment.from) * segment.pxPerYear - scale.pan,
          major: false,
          level: tickLevel,
          segmentIndex: segment.index,
        });
      }
    }
  }

  return ticks.sort((a, b) => a.x - b.x);
}

function chooseMinorStep(step: number, pxPerYear: number): number | null {
  for (const divisions of SUBDIVISIONS) {
    if (divisions > MAX_MINOR_PER_MAJOR) continue;
    const minorStep = step / divisions;
    if (minorStep * pxPerYear >= MIN_MINOR_STEP_PX) return minorStep;
  }
  return null;
}

function labelFor(t: number, level: TickLevel): string {
  if (level === 'month') {
    const date = fromFractionalYear(t, 'month');
    return formatDate(date, { monthStyle: 'short' });
  }
  const year = Math.round(t);
  if (level === 'century') return formatCentury(year);
  return formatYear(year);
}

/**
 * Anti-chevauchement (DESIGN.md §4) : on garde un libellé sur deux, puis sur
 * trois, etc., jusqu'à ce que les libellés tiennent. Les graduations, elles,
 * restent toutes dessinées.
 */
function thinLabels(majors: Tick[], step: number, offset: number, stepPx: number): void {
  if (majors.length === 0) return;
  const widest = majors.reduce((max, tick) => Math.max(max, estimateLabelWidth(tick.label ?? '')), 0);
  const needed = widest + LABEL_PADDING;
  const keepEvery = Math.max(1, Math.ceil(needed / Math.max(stepPx, 1)));
  if (keepEvery === 1) return;
  for (const tick of majors) {
    // Ancrage sur l'index absolu de la graduation : les libellés conservés
    // restent les mêmes pendant un défilement, ils ne clignotent pas.
    const absoluteIndex = Math.round((tick.t - offset) / step);
    if (absoluteIndex % keepEvery !== 0) delete tick.label;
  }
}

/** Largeur approchée d'un libellé de graduation, en pixels (11 px, tabular-nums). */
export function estimateLabelWidth(label: string): number {
  return label.length * CHAR_WIDTH;
}
