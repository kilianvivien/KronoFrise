/**
 * L'axe — élément de signature nº1 (DESIGN.md §4). Ligne de base, graduations
 * majeures et mineures, libellés français, et glyphe de coupure ⫽ entre deux
 * segments d'échelle différente.
 */
import type { JSX } from 'react';
import {
  TICK_LABEL_GAP,
  TICK_MAJOR_HEIGHT,
  TICK_MINOR_HEIGHT,
} from '../layout/metrics';
import type { SceneGraph } from '../layout/scene';
import { baselineStyle, coupureStyle, tickLabelStyle, tickMajorStyle, tickMinorStyle } from './style';
import { coupureStrokes } from './shapes';
// Le calage en bord de canevas est une décision de mise en page — c'est elle
// qui écarte les libellés qui se recouvreraient une fois calés (layout/ticks).
import { clampTickLabelX, tickAnchor } from '../layout/ticks';

export function Ruler({ scene }: { scene: SceneGraph }): JSX.Element {
  const y = scene.baselineY;
  return (
    <g aria-hidden="true">
      {/* La ligne de base est interrompue à chaque coupure. */}
      {scene.axisSegments.map((segment) => (
        <line
          key={`base-${segment.index}`}
          x1={Math.max(segment.x0, -1)}
          x2={Math.min(segment.x1, scene.width + 1)}
          y1={y}
          y2={y}
          style={baselineStyle}
        />
      ))}

      {scene.ticks.map((tick) => (
        <line
          key={`t-${tick.segmentIndex}-${tick.t}`}
          x1={tick.x}
          x2={tick.x}
          y1={y}
          y2={y + (tick.major ? TICK_MAJOR_HEIGHT : TICK_MINOR_HEIGHT)}
          style={tick.major ? tickMajorStyle : tickMinorStyle}
        />
      ))}

      {scene.ticks
        .filter((tick) => tick.label !== undefined)
        .map((tick) => (
          <text
            key={`l-${tick.segmentIndex}-${tick.t}`}
            x={clampTickLabelX(tick.x, scene.width)}
            y={y + TICK_MAJOR_HEIGHT + TICK_LABEL_GAP}
            dominantBaseline="hanging"
            style={{ ...tickLabelStyle, textAnchor: tickAnchor(tick.x, scene.width) }}
          >
            {tick.label}
          </text>
        ))}

      {scene.coupures.map((coupure) => (
        <Coupure key={`c-${coupure.x}`} x={coupure.x + coupure.width / 2} y={y} />
      ))}
    </g>
  );
}

/** Le glyphe ⫽ : deux traits parallèles inclinés, à cheval sur la ligne. */
function Coupure({ x, y }: { x: number; y: number }): JSX.Element {
  return (
    <g>
      {coupureStrokes(x, y).map((stroke) => (
        <line key={stroke.x1} x1={stroke.x1} y1={stroke.y1} x2={stroke.x2} y2={stroke.y2} style={coupureStyle} />
      ))}
    </g>
  );
}
