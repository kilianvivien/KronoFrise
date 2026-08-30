/**
 * Le rendu de la frise : `SceneGraph → SVG`.
 *
 * C'est le seul dessin de l'application (docs/format.md §9) : l'écran, le SVG
 * exporté, le PNG et le PDF passent tous par ce composant, ce qui garantit
 * que l'on imprime exactement ce que l'on voit.
 */
import type { CSSProperties, JSX, ReactNode } from 'react';
import { resolveToken } from '../ui/tokenValues';
import type { SceneGraph } from '../layout/scene';
import { MANUEL_SCOLAIRE, type Theme } from '../themes/index';
import { EventNode } from './EventNode';
import { Lanes } from './Lanes';
import { PeriodNode } from './PeriodNode';
import { Ruler } from './Ruler';

export interface FriseProps {
  scene: SceneGraph;
  children?: ReactNode;
  theme?: Theme;
  /** titre accessible du document */
  title: string;
}

export function Frise({ scene, theme = MANUEL_SCOLAIRE, title, children }: FriseProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={scene.width}
      height={scene.height}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role={children ? "group" : "img"}
      aria-label={title}
      style={{ display: 'block', background: resolveToken(theme.paper), '--paper': resolveToken(theme.paper), '--paper-line': resolveToken(theme.paperLine), '--text-primary': resolveToken(theme.axisInk), '--text-secondary': resolveToken(theme.rulerInk), '--text-tertiary': resolveToken(theme.rulerInkMinor) } as CSSProperties}
    >
      <title>{title}</title>
      {theme.id === 'journal' && <defs><filter id="journal-monochrome"><feColorMatrix type="saturate" values="0" /></filter></defs>}
      <rect x={0} y={0} width={scene.width} height={scene.height} fill={theme.paper} />
      <Lanes scene={scene} theme={theme} />
      {[
        ...scene.periods.map((period) => ({ id: period.itemId, x: period.x0, node: <PeriodNode key={period.itemId} period={period} theme={theme} /> })),
        ...scene.events.map((event) => ({ id: event.itemId, x: event.x, node: <EventNode key={event.itemId} event={event} theme={theme} /> })),
      ].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id)).map((item) => item.node)}
      <Ruler scene={scene} />
      {children}
    </svg>
  );
}
