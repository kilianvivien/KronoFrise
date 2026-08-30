/**
 * SceneGraph — le résultat de `layout(document)`, seule source du rendu.
 *
 * Règle de fidélité (docs/format.md §9) : l'écran, le SVG, le PNG et le PDF
 * dessinent **ce graphe** et rien d'autre. Toute géométrie est déjà résolue
 * ici ; le rendu n'ajoute que les couleurs (palette) et le style.
 */
import type { Tick } from './ticks';

export interface SceneLane {
  id: string;
  name: string;
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
}

export interface ScenePeriod {
  itemId: string;
  laneId: string;
  label: string;
  datesLabel: string;
  color: string;
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
