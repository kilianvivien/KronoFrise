/**
 * Le rendu de la frise : `SceneGraph → SVG`.
 *
 * C'est le seul dessin de l'application (docs/format.md §9) : l'écran, le SVG
 * exporté, le PNG et le PDF passent tous par ce composant, ce qui garantit
 * que l'on imprime exactement ce que l'on voit.
 */
import type { JSX } from 'react';
import type { SceneGraph } from '../layout/scene';
import { MANUEL_SCOLAIRE, type Theme } from '../themes/index';
import { EventNode } from './EventNode';
import { Lanes } from './Lanes';
import { PeriodNode } from './PeriodNode';
import { Ruler } from './Ruler';

export interface FriseProps {
  scene: SceneGraph;
  theme?: Theme;
  /** titre accessible du document */
  title: string;
}

export function Frise({ scene, theme = MANUEL_SCOLAIRE, title }: FriseProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={scene.width}
      height={scene.height}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role="img"
      aria-label={title}
      style={{ display: 'block', background: theme.paper }}
    >
      <title>{title}</title>
      <rect x={0} y={0} width={scene.width} height={scene.height} fill={theme.paper} />
      <Lanes scene={scene} theme={theme} />
      {scene.periods.map((period) => (
        <PeriodNode key={period.itemId} period={period} />
      ))}
      {scene.events.map((event) => (
        <EventNode key={event.itemId} event={event} />
      ))}
      <Ruler scene={scene} />
    </svg>
  );
}
