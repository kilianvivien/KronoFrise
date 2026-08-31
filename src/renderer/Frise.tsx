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
import { EventConnector, EventNode } from './EventNode';
import { Lanes } from './Lanes';
import { PeriodNode } from './PeriodNode';
import { Ruler } from './Ruler';
import { TitleBlock } from './TitleBlock';

export interface FriseProps {
  scene: SceneGraph;
  children?: ReactNode;
  theme?: Theme;
  /** titre accessible du document */
  title: string;
  /**
   * Export PNG à fond transparent (PLAN.md §3.6) : le papier du thème n'est
   * pas peint. Le reste du dessin est strictement identique.
   */
  transparent?: boolean;
}

export function Frise({ scene, theme = MANUEL_SCOLAIRE, title, children, transparent = false }: FriseProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={scene.width}
      height={scene.height}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role={children ? "group" : "img"}
      aria-label={title}
      style={{ display: 'block', ...(transparent ? {} : { background: resolveToken(theme.paper) }), '--paper': resolveToken(theme.paper), '--paper-line': resolveToken(theme.paperLine), '--text-primary': resolveToken(theme.axisInk), '--text-secondary': resolveToken(theme.rulerInk), '--text-tertiary': resolveToken(theme.rulerInkMinor) } as CSSProperties}
    >
      <title>{title}</title>
      {theme.id === 'journal' && <defs><filter id="journal-monochrome"><feColorMatrix type="saturate" values="0" /></filter></defs>}
      {!transparent && <rect x={0} y={0} width={scene.width} height={scene.height} fill={theme.paper} />}
      {scene.title && <TitleBlock title={scene.title} />}
      <Lanes scene={scene} theme={theme} />
      {/* Les connecteurs d'abord : ils passent derrière toutes les puces. */}
      <g aria-hidden="true">
        {scene.events.map((event) => <EventConnector key={event.itemId} event={event} theme={theme} />)}
      </g>
      {[
        ...scene.periods.map((period) => ({ id: period.itemId, x: period.x0, node: <PeriodNode key={period.itemId} period={period} theme={theme} /> })),
        ...scene.events.map((event) => ({ id: event.itemId, x: event.x, node: <EventNode key={event.itemId} event={event} theme={theme} /> })),
      ].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id)).map((item) => item.node)}
      <Ruler scene={scene} />
      {children}
    </svg>
  );
}
