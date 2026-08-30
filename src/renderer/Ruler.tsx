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

/** Inclinaison du glyphe de coupure : 20° depuis la verticale. */
const COUPURE_SLANT = Math.tan((20 * Math.PI) / 180);
/** Le glyphe déborde de 8 px de part et d'autre de la ligne de base. */
const COUPURE_OVERHANG = 8;
/** Écart entre les deux traits du glyphe. */
const COUPURE_SPACING = 5;

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
            x={clampLabelX(tick.x, scene.width)}
            y={y + TICK_MAJOR_HEIGHT + TICK_LABEL_GAP}
            dominantBaseline="hanging"
            style={{ ...tickLabelStyle, textAnchor: anchorFor(tick.x, scene.width) }}
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

/**
 * Un libellé posé en bord de canevas se cale contre le bord au lieu d'être
 * coupé en deux : sans cela, la date de début d'un segment très comprimé
 * (« 3 000 000 av. J.-C. ») serait invisible.
 */
const EDGE_ZONE = 48;

function anchorFor(x: number, width: number): 'start' | 'middle' | 'end' {
  if (x < EDGE_ZONE) return 'start';
  if (x > width - EDGE_ZONE) return 'end';
  return 'middle';
}

function clampLabelX(x: number, width: number): number {
  if (x < EDGE_ZONE) return Math.max(x, 2);
  if (x > width - EDGE_ZONE) return Math.min(x, width - 2);
  return x;
}

/** Le glyphe ⫽ : deux traits parallèles inclinés, à cheval sur la ligne. */
function Coupure({ x, y }: { x: number; y: number }): JSX.Element {
  const dx = COUPURE_OVERHANG * COUPURE_SLANT;
  return (
    <g>
      {[-COUPURE_SPACING / 2, COUPURE_SPACING / 2].map((offset) => (
        <line
          key={offset}
          x1={x + offset - dx}
          y1={y + COUPURE_OVERHANG}
          x2={x + offset + dx}
          y2={y - COUPURE_OVERHANG}
          style={coupureStyle}
        />
      ))}
    </g>
  );
}
