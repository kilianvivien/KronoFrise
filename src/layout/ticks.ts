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
import { approximateMeasurer, type Measurer } from './measure';
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

/** Taille des libellés de la règle (DESIGN.md §2 : --fs-caption). */
const CAPTION_FONT_SIZE = 11;
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

/* ---- calage des libellés en bord de canevas ---- */

/**
 * Un libellé posé en bord de canevas se cale contre le bord au lieu d'être
 * coupé en deux : sans cela, la date de début d'un segment très comprimé
 * (« 3 000 000 av. J.-C. ») serait invisible.
 *
 * Ces trois fonctions décident d'une **position**, pas d'un style : elles
 * vivent donc ici, avec la mise en page qui doit en tenir compte pour écarter
 * les libellés qui se recouvriraient une fois calés. Le rendu SVG et
 * l'exporteur PDF les appellent tous les deux, sans rien recalculer.
 */
export const EDGE_ZONE = 48;

export function tickAnchor(x: number, width: number): 'start' | 'middle' | 'end' {
  if (x < EDGE_ZONE) return 'start';
  if (x > width - EDGE_ZONE) return 'end';
  return 'middle';
}

export function clampTickLabelX(x: number, width: number): number {
  if (x < EDGE_ZONE) return Math.max(x, 2);
  if (x > width - EDGE_ZONE) return Math.min(x, width - 2);
  return x;
}

/** La boîte réellement occupée par un libellé, calage compris. */
export function tickLabelBox(tick: Tick, width: number, measurer: Measurer): { left: number; right: number } {
  const size = measurer.measure(tick.label ?? '', CAPTION_FONT_SIZE);
  const x = clampTickLabelX(tick.x, width);
  const anchor = tickAnchor(tick.x, width);
  const left = anchor === 'start' ? x : anchor === 'end' ? x - size : x - size / 2;
  return { left, right: left + size };
}

/**
 * Dernière passe, sur les positions **réellement dessinées**.
 *
 * `thinLabels` compare des abscisses de graduation, avant calage : un libellé
 * ramené contre le bord droit recouvrait donc son voisin, et deux libellés de
 * part et d'autre d'une coupure, amincis chacun de son côté, pouvaient se
 * toucher. On les confronte ici tels qu'ils seront dessinés.
 *
 * SPEC? Quand deux libellés se recouvrent, DESIGN.md §4 ne dit pas lequel
 * disparaît. Retenu : **celui de bord l'emporte**, c'est lui qui porte la date
 * de début ou de fin de la frise — la perdre laisserait l'axe sans borne.
 */
export function separateLabels(ticks: Tick[], width: number, measurer: Measurer): void {
  const kept: { right: number; tick: Tick; pinned: boolean }[] = [];
  for (const tick of ticks) {
    if (tick.label === undefined) continue;
    const box = tickLabelBox(tick, width, measurer);
    const pinned = tickAnchor(tick.x, width) !== 'middle';
    let last = kept[kept.length - 1];
    while (last !== undefined && box.left < last.right + EDGE_LABEL_GAP) {
      if (!pinned || last.pinned) { tick.label = undefined; break; }
      // Le voisin cède la place au libellé de bord.
      last.tick.label = undefined;
      kept.pop();
      last = kept[kept.length - 1];
    }
    if (tick.label !== undefined) kept.push({ right: box.right, tick, pinned });
  }
}

/** Écart minimal entre deux libellés dessinés : moins, ils se touchent. */
const EDGE_LABEL_GAP = 2;

export function buildTicks(
  scale: Scale,
  level?: TickLevel,
  measurer: Measurer = approximateMeasurer,
): Tick[] {
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
    const minorStep = chooseMinorStep(step, segment.pxPerYear);
    const toX = (t: number): number =>
      segment.x0 + (t - segment.from) * segment.pxPerYear - scale.pan;

    const majors: Tick[] = [];
    const seen = new Set<number>();

    for (const range of gridRanges(from, to, tickLevel)) {
      const rangeMajors: Tick[] = [];
      for (const t of gridPoints(range.from, range.to, step, range.offset)) {
        if (seen.has(t)) continue;
        seen.add(t);
        rangeMajors.push({
          t,
          // Position calculée dans le segment courant : une graduation posée
          // sur une borne reste de son côté de la coupure.
          x: toX(t),
          major: true,
          level: tickLevel,
          label: labelFor(t, tickLevel),
          segmentIndex: segment.index,
        });
      }
      thinLabels(rangeMajors, step, range.offset, step * segment.pxPerYear, measurer);
      majors.push(...rangeMajors);

      if (minorStep === null) continue;
      for (const t of gridPoints(range.from, range.to, minorStep, range.offset)) {
        // Une mineure ne double jamais une majeure (l'égalité exacte des
        // flottants ne suffit pas pour les pas fractionnaires du niveau mois).
        if (seen.has(t) || isMultipleOf(t - range.offset, step)) continue;
        seen.add(t);
        ticks.push({
          t,
          x: toX(t),
          major: false,
          level: tickLevel,
          segmentIndex: segment.index,
        });
      }
    }

    if (majors.length === 0) {
      // Un segment trop court pour porter une graduation garde tout de même
      // un repère : sans lui, la préhistoire n'afficherait aucune date.
      majors.push({
        t: segment.from,
        x: toX(segment.from),
        major: true,
        level: tickLevel,
        label: labelFor(segment.from, tickLevel),
        segmentIndex: segment.index,
      });
    }
    ensureOneLabel(majors, tickLevel);
    ticks.push(...majors);
  }

  ticks.sort((a, b) => a.x - b.x);
  separateLabels(ticks, scale.width, measurer);
  return ticks;
}

interface GridRange {
  from: number;
  to: number;
  /** décalage de la grille, en années */
  offset: number;
}

/**
 * Les années avant J.-C. se comptent à l'envers : une graduation « ronde » y
 * tombe sur l'année astronomique 1 − k·pas (500 av. J.-C. = -499). La grille
 * est donc décalée d'un an avant l'an 1 — comme pour les siècles, qui
 * commencent en 1601 et non en 1600.
 */
function gridRanges(from: number, to: number, level: TickLevel): GridRange[] {
  if (level === 'century') return [{ from, to, offset: 1 }];
  if (from < 1 && to > 1) {
    return [
      { from, to: 1, offset: 1 },
      { from: 1, to, offset: 0 },
    ];
  }
  return [{ from, to, offset: to <= 1 ? 1 : 0 }];
}

function isMultipleOf(value: number, step: number): boolean {
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

function gridPoints(from: number, to: number, step: number, offset: number): number[] {
  const first = Math.ceil((from - offset) / step - 1e-9);
  const last = Math.floor((to - offset) / step + 1e-9);
  const points: number[] = [];
  for (let i = first; i <= last; i++) points.push(i * step + offset);
  return points;
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
function thinLabels(
  majors: Tick[],
  step: number,
  offset: number,
  stepPx: number,
  measurer: Measurer,
): void {
  if (majors.length === 0) return;
  const widest = majors.reduce(
    (max, tick) => Math.max(max, measurer.measure(tick.label ?? '', CAPTION_FONT_SIZE)),
    0,
  );
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

/**
 * L'amincissement ne doit jamais vider un segment de tout repère : si toutes
 * les majeures ont perdu leur libellé, on en rend un au milieu.
 */
function ensureOneLabel(majors: Tick[], level: TickLevel): void {
  if (majors.length === 0 || majors.some((tick) => tick.label !== undefined)) return;
  const middle = majors[Math.floor(majors.length / 2)];
  if (middle !== undefined) middle.label = labelFor(middle.t, level);
}

