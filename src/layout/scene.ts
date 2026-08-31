/**
 * SceneGraph — le résultat de `layout(document)`, seule source du rendu.
 *
 * Règle de fidélité (docs/format.md §9) : l'écran, le SVG, le PNG et le PDF
 * dessinent **ce graphe** et rien d'autre. Toute géométrie est déjà résolue
 * ici ; le rendu n'ajoute que les couleurs (palette) et le style.
 */
import type { FillStyle } from '../core/types';
import type { Tick } from './ticks';

export interface SceneLane {
  id: string;
  name: string;
  color?: string;
  y: number;
  height: number;
  /** ligne d'ancrage des événements : le bas de la bande */
  anchorY: number;
  /** nombre de rangées d'empilement occupées */
  rows: number;
  /** bandes alternées (DESIGN.md §4) */
  striped: boolean;
}

export interface SceneChip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneEvent {
  itemId: string;
  laneId: string;
  label: string;
  /** date déjà formatée en français */
  dateLabel: string;
  /** identifiant de palette ou hex — résolu par le rendu */
  color: string;
  fillStyle?: FillStyle;
  circa: boolean;
  /** abscisse de la pastille d'ancrage */
  x: number;
  /** ordonnée de la pastille (ligne d'ancrage de la bande) */
  dotY: number;
  chip: SceneChip;
  row: number;
  imageSrc?: string;
  /** la date tient sur une deuxième ligne (masquée quand on dézoome) */
  showDate: boolean;
  /** largeur du texte, pour tracer la ligne à compléter (DESIGN.md §5) */
  labelWidth: number;
  dateWidth: number;
  /** fiche élève : le libellé est remplacé par une ligne vide */
  maskLabel?: boolean;
  maskDate?: boolean;
}

export interface ScenePeriod {
  itemId: string;
  laneId: string;
  label: string;
  datesLabel: string;
  color: string;
  fillStyle?: FillStyle;
  shape: 'bar' | 'bracket' | 'arrow';
  x0: number;
  x1: number;
  y: number;
  height: number;
  row: number;
  /** le libellé tient dans la barre ; sinon il se pose à droite */
  labelInside: boolean;
  labelX: number;
  /** la barre est assez large pour afficher « 1804 – 1814 » */
  showDates: boolean;
  fuzzyStart: boolean;
  fuzzyEnd: boolean;
  labelWidth: number;
  datesWidth: number;
  maskLabel?: boolean;
  maskDate?: boolean;
}

export interface SceneCoupure {
  x: number;
  width: number;
  top: number;
  bottom: number;
}

export interface SceneAxisSegment {
  index: number;
  x0: number;
  x1: number;
}

export interface SceneGraph {
  width: number;
  height: number;
  /** ordonnée de la ligne de base de l'axe */
  baselineY: number;
  lanes: SceneLane[];
  events: SceneEvent[];
  periods: ScenePeriod[];
  ticks: Tick[];
  coupures: SceneCoupure[];
  /** morceaux de la ligne de base, interrompue par les coupures */
  axisSegments: SceneAxisSegment[];
}

/** Fenêtre visible, en pixels de scène (déjà des pixels d'écran : `pan` est appliqué). */
export interface SceneViewport {
  x0: number;
  x1: number;
}

/**
 * Élagage par fenêtre — optimisation de **l'éditeur seul**.
 *
 * À 40 000 % de zoom, 8 éléments sur 500 sont à l'écran : les 492 autres
 * coûtaient un nœud SVG et une réconciliation à chaque image de glissement.
 * Cette fonction ne touche à aucune coordonnée : elle retire seulement ce
 * qui ne peint rien. La scène élaguée est donc un sous-ensemble exact de la
 * scène complète, jamais une géométrie différente (docs/format.md §9).
 *
 * Les exports ne l'appellent pas : un élément placé hors de l'axe est
 * extrapolé, pas rogné (layout/scale.ts), et doit rester dans le fichier.
 */
export function visibleScene(scene: SceneGraph, viewport: SceneViewport): SceneGraph {
  const { x0, x1 } = viewport;
  const events = scene.events.filter((event) => {
    // La pastille peut être visible alors que la puce ne l'est pas, et
    // inversement : on garde l'union des deux, connecteur compris.
    const left = Math.min(event.x, event.chip.x);
    const right = Math.max(event.x, event.chip.x + event.chip.width);
    return right >= x0 && left <= x1;
  });
  const periods = scene.periods.filter((period) => {
    // Un libellé posé à droite d'une barre étroite déborde de la barre.
    const right = period.labelInside ? period.x1 : Math.max(period.x1, period.labelX + period.labelWidth);
    return right >= x0 && period.x0 <= x1;
  });
  if (events.length === scene.events.length && periods.length === scene.periods.length) return scene;
  return { ...scene, events, periods };
}
