/**
 * Période — DESIGN.md §4 : barre pleine, accolade ou flèche ; libellé dedans
 * si la largeur le permet, sinon à droite ; bords flous en dégradé.
 */
import type { JSX } from 'react';
import type { ScenePeriod } from '../layout/scene';
import { ink, resolveBase, tint } from '../ui/palette';
import { periodDatesStyle, periodLabelStyle } from './style';

const BAR_RADIUS = 4;
/** Longueur du fondu d'un bord flou (DESIGN.md §4). */
const FUZZY_LENGTH = 24;
/** Retour vers le bas aux extrémités d'une accolade. */
const BRACKET_DROP = 6;
/** Pointe d'une période « flèche ». */
const ARROW_HEAD = 10;
const LABEL_PADDING = 8;

export function PeriodNode({ period }: { period: ScenePeriod }): JSX.Element {
  const base = resolveBase(period.color);
  const label = `Période : ${period.label}, ${period.datesLabel}`;
  return (
    <g role="button" aria-label={label} tabIndex={0}>
      {period.shape === 'bracket' ? (
        <Bracket period={period} base={base} />
      ) : (
        <Bar period={period} base={base} />
      )}
      <Labels period={period} base={base} />
    </g>
  );
}

function Bar({ period, base }: { period: ScenePeriod; base: string }): JSX.Element {
  const width = Math.max(period.x1 - period.x0, 1);
  const maskId = `fuzzy-${period.itemId}`;
  const needsMask = period.fuzzyStart || period.fuzzyEnd;
  const shape =
    period.shape === 'arrow' ? (
      <path
        d={arrowPath(period.x0, period.y, width, period.height)}
        fill={tint(base)}
        stroke={base}
        strokeWidth={1}
        {...(needsMask ? { mask: `url(#${maskId})` } : {})}
      />
    ) : (
      <rect
        x={period.x0}
        y={period.y}
        width={width}
        height={period.height}
        rx={BAR_RADIUS}
        fill={tint(base)}
        stroke={base}
        strokeWidth={1}
        {...(needsMask ? { mask: `url(#${maskId})` } : {})}
      />
    );

  return (
    <>
      {needsMask && (
        <defs>
          <linearGradient id={`${maskId}-grad`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="white" stopOpacity={period.fuzzyStart ? 0 : 1} />
            <stop
              offset={Math.min(FUZZY_LENGTH / width, 0.45)}
              stopColor="white"
              stopOpacity={1}
            />
            <stop
              offset={1 - Math.min(FUZZY_LENGTH / width, 0.45)}
              stopColor="white"
              stopOpacity={1}
            />
            <stop offset="1" stopColor="white" stopOpacity={period.fuzzyEnd ? 0 : 1} />
          </linearGradient>
          <mask id={maskId}>
            <rect
              x={period.x0}
              y={period.y}
              width={width}
              height={period.height}
              fill={`url(#${maskId}-grad)`}
            />
          </mask>
        </defs>
      )}
      {shape}
    </>
  );
}

/** Accolade : un trait le long du haut, retourné vers le bas aux extrémités. */
function Bracket({ period, base }: { period: ScenePeriod; base: string }): JSX.Element {
  const top = period.y;
  return (
    <path
      d={`M ${period.x0} ${top + BRACKET_DROP} V ${top} H ${period.x1} V ${top + BRACKET_DROP}`}
      fill="none"
      stroke={base}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  );
}

function Labels({ period, base }: { period: ScenePeriod; base: string }): JSX.Element {
  const text = ink(base);
  const centerY = period.y + period.height / 2 + 4;
  if (period.shape === 'bracket') {
    return (
      <text x={(period.x0 + period.x1) / 2} y={period.y - 4} style={periodLabelStyle(text)}>
        {period.label}
      </text>
    );
  }
  return (
    <>
      <text
        x={period.labelX}
        y={centerY}
        style={{
          ...periodLabelStyle(text),
          ...(period.labelInside ? {} : { textAnchor: 'start' as const }),
        }}
      >
        {period.label}
      </text>
      {period.labelInside && period.showDates && (
        <text x={period.x1 - LABEL_PADDING} y={centerY} style={periodDatesStyle(text)}>
          {period.datesLabel}
        </text>
      )}
    </>
  );
}

function arrowPath(x: number, y: number, width: number, height: number): string {
  const body = Math.max(width - ARROW_HEAD, 1);
  return `M ${x} ${y} H ${x + body} L ${x + width} ${y + height / 2} L ${x + body} ${y + height} H ${x} Z`;
}
