/**
 * Bandes — DESIGN.md §4 : fonds alternés, nom en capitales discrètes en haut
 * à gauche, séparateur 1 px. Les coupures y creusent le même vide que dans la
 * ligne de base.
 */
import { themeColors } from './themeColors';
import type { JSX } from 'react';
import { CANVAS_PADDING } from '../layout/metrics';
import type { SceneGraph, SceneLane } from '../layout/scene';
import type { Theme } from '../themes/index';
import { laneBoundaryStyle, laneNameStyle } from './style';

const STRIPE_OPACITY = 0.35;
const LANE_NAME_BASELINE = 12;

export function Lanes({ scene, theme }: { scene: SceneGraph; theme: Theme }): JSX.Element {
  return (
    <g aria-hidden="true">
      {scene.lanes.map((lane) => (
        <LaneBand key={lane.id} lane={lane} scene={scene} theme={theme} />
      ))}
    </g>
  );
}

function LaneBand({
  lane,
  scene,
  theme,
}: {
  lane: SceneLane;
  scene: SceneGraph;
  theme: Theme;
}): JSX.Element {
  return (
    <g>
      {(lane.striped || lane.color) &&
        scene.axisSegments.map((segment) => (
          <rect
            key={`s-${segment.index}`}
            x={segment.x0}
            y={lane.y}
            width={Math.max(segment.x1 - segment.x0, 0)}
            height={lane.height}
            fill={lane.color ? themeColors(lane.color, theme).base : theme.paperLine}
            opacity={lane.color ? (theme.id === 'journal' ? 0 : .07) : STRIPE_OPACITY}
          />
        ))}

      {scene.axisSegments.map((segment) => (
        <line
          key={`b-${segment.index}`}
          x1={segment.x0}
          x2={segment.x1}
          y1={lane.y + lane.height}
          y2={lane.y + lane.height}
          style={laneBoundaryStyle}
        />
      ))}

      {lane.name !== '' && (
        <text x={CANVAS_PADDING} y={lane.y + LANE_NAME_BASELINE} style={laneNameStyle}>
          {lane.name}
        </text>
      )}
    </g>
  );
}
