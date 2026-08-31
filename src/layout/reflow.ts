/**
 * Réorganisation animée — DESIGN.md §8 : « la mise en page qui se réorganise
 * après un dépôt anime les positions sur 140 ms ».
 *
 * Ce que le CSS ne sait pas faire ici : la scène est posée en coordonnées
 * absolues, qu'aucune transition n'interpole (docs/spec-gaps.md §13.10). Plutôt
 * que de repositionner chaque groupe par `transform` — une reprise du rendu,
 * partagé avec les exports, qui laisserait connecteurs et contours de sélection
 * en arrière —, on interpole **la scène elle-même** : une fonction pure de plus
 * sur le `SceneGraph`, comme `visibleScene`. Le rendu reste identique au pixel
 * près, donc l'export aussi.
 *
 * Ce qui glisse est ce que **l'empilement** décide : les bandes, les éléments,
 * la ligne de base, la hauteur totale et l'étendue verticale des coupures. Ce
 * que l'axe ou le document décident — graduations, segments, bloc de titre —
 * ne bouge pas d'un dépôt, et ne doit donc rien à cette fonction.
 */
import type { SceneEvent, SceneGraph, SceneLane, ScenePeriod } from './scene';

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * La courbe du jeton `--ease-ui` (DESIGN.md §8), c'est-à-dire le mot-clé CSS
 * `ease-out` : `cubic-bezier(0, 0, 0.58, 1)`.
 *
 * L'animation est en JavaScript ; la courbe doit donc être la même que celle
 * des transitions voisines, sinon deux mouvements simultanés — le panneau qui
 * se replie, la frise qui se réorganise — n'auraient pas la même allure.
 */
export function easeUi(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0 || t === 1) return t;
  // Bézier cubique de points de contrôle (0,0) et (0.58,1) : on résout d'abord
  // l'abscisse par bissection — la courbe est strictement croissante en x —,
  // puis on lit l'ordonnée au paramètre trouvé.
  const bezier = (a: number, b: number, u: number): number => {
    const v = 1 - u;
    return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u;
  };
  let low = 0;
  let high = 1;
  let u = t;
  for (let step = 0; step < 24; step++) {
    u = (low + high) / 2;
    if (bezier(0, 0.58, u) < t) low = u;
    else high = u;
  }
  return bezier(0, 1, u);
}

function byId<T>(items: T[], id: (item: T) => string): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of items) index.set(id(item), item);
  return index;
}

/**
 * La scène telle qu'elle doit être peinte à l'instant `t` du mouvement, de
 * `from` (t = 0) vers `to` (t = 1).
 *
 * Le contenu — libellés, couleurs, masques, largeurs mesurées — est toujours
 * celui de `to` : seule la **position** est en chemin. Un élément apparu au
 * dépôt n'a pas de position d'origine : il est posé d'emblée à la sienne,
 * plutôt que de venir de nulle part.
 */
export function interpolateScene(from: SceneGraph, to: SceneGraph, t: number): SceneGraph {
  if (t >= 1) return to;
  const lanes = byId(from.lanes, (lane) => lane.id);
  const events = byId(from.events, (event) => event.itemId);
  const periods = byId(from.periods, (period) => period.itemId);
  const baselineY = lerp(from.baselineY, to.baselineY, t);
  return {
    ...to,
    height: lerp(from.height, to.height, t),
    baselineY,
    lanes: to.lanes.map((lane) => {
      const was = lanes.get(lane.id);
      return was === undefined ? lane : moveLane(lane, was, t);
    }),
    events: to.events.map((event) => {
      const was = events.get(event.itemId);
      return was === undefined ? event : moveEvent(event, was, t);
    }),
    periods: to.periods.map((period) => {
      const was = periods.get(period.itemId);
      return was === undefined ? period : movePeriod(period, was, t);
    }),
    // Une coupure garde son abscisse — elle appartient à l'axe — mais elle
    // court du haut des bandes à la ligne de base, qui bougent toutes deux.
    coupures: to.coupures.map((coupure, index) => {
      const was = from.coupures[index];
      return was === undefined ? coupure : { ...coupure, top: lerp(was.top, coupure.top, t), bottom: baselineY };
    }),
  };
}

/**
 * Deux scènes posent-elles tout au même endroit ?
 *
 * Une modification qui ne déplace rien — renommer une bande, changer une
 * couleur, enregistrer le document — ne doit pas déclencher un mouvement de
 * 140 ms pendant lequel il ne se passerait rien.
 */
export function sameGeometry(a: SceneGraph, b: SceneGraph): boolean {
  if (a.baselineY !== b.baselineY || a.height !== b.height) return false;
  if (a.lanes.length !== b.lanes.length || a.events.length !== b.events.length || a.periods.length !== b.periods.length) return false;
  return (
    a.lanes.every((lane, index) => {
      const other = b.lanes[index];
      return other !== undefined && lane.id === other.id && lane.y === other.y && lane.height === other.height;
    }) &&
    a.events.every((event, index) => {
      const other = b.events[index];
      return other !== undefined && event.itemId === other.itemId && event.x === other.x && event.dotY === other.dotY
        && event.chip.x === other.chip.x && event.chip.y === other.chip.y;
    }) &&
    a.periods.every((period, index) => {
      const other = b.periods[index];
      return other !== undefined && period.itemId === other.itemId && period.x0 === other.x0 && period.x1 === other.x1 && period.y === other.y;
    })
  );
}

function moveLane(lane: SceneLane, was: SceneLane, t: number): SceneLane {
  return {
    ...lane,
    y: lerp(was.y, lane.y, t),
    height: lerp(was.height, lane.height, t),
    anchorY: lerp(was.anchorY, lane.anchorY, t),
  };
}

/**
 * La pastille, la puce et le connecteur qui les relie sont posés depuis les
 * mêmes coordonnées : les interpoler ensemble garde l'élément d'un seul tenant
 * pendant tout le mouvement — jamais une puce détachée de son trait.
 */
function moveEvent(event: SceneEvent, was: SceneEvent, t: number): SceneEvent {
  return {
    ...event,
    x: lerp(was.x, event.x, t),
    dotY: lerp(was.dotY, event.dotY, t),
    chip: {
      ...event.chip,
      x: lerp(was.chip.x, event.chip.x, t),
      y: lerp(was.chip.y, event.chip.y, t),
    },
  };
}

function movePeriod(period: ScenePeriod, was: ScenePeriod, t: number): ScenePeriod {
  return {
    ...period,
    x0: lerp(was.x0, period.x0, t),
    x1: lerp(was.x1, period.x1, t),
    y: lerp(was.y, period.y, t),
    labelX: lerp(was.labelX, period.labelX, t),
  };
}
