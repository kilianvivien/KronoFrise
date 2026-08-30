/**
 * Événement — DESIGN.md §4 : pastille sur la ligne d'ancrage, connecteur
 * vertical, puce de libellé (ou carte illustrée). Le texte est un vrai nœud
 * SVG `<text>` : sélectionnable, lisible par un lecteur d'écran, jamais
 * vectorisé (DESIGN.md §7).
 */
import { useId, type JSX } from 'react';
import { EDITOR } from '../ui/strings';
import { EVENT_DOT_SIZE, EVENT_IMAGE_SIZE, ROW_GAP } from '../layout/metrics';
import type { SceneEvent } from '../layout/scene';
import { MANUEL_SCOLAIRE, type Theme } from '../themes';
import { fillPaint, FillPattern } from './FillPattern';
import { chipDateStyle, chipTextStyle } from './style';

const CHIP_RADIUS = 5;
const CARD_RADIUS = 8;
const CHIP_PADDING_X = 8;
const CONNECTOR_OPACITY = 0.5;
/** Trait 2-4 pour les dates approximatives (DESIGN.md §4). */
const CIRCA_DASH = '2 4';

export function EventNode({ event, theme = MANUEL_SCOLAIRE }: { event: SceneEvent; theme?: Theme }): JSX.Element {
  const patternId = `event-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { base, fill, text } = fillPaint(event.color, theme, event.fillStyle, patternId);
  const hasImage = event.imageSrc !== undefined;
  const chipBottom = event.chip.y + event.chip.height;
  const textLeft = event.chip.x + CHIP_PADDING_X + (hasImage ? EVENT_IMAGE_SIZE + ROW_GAP : 0);
  const label = EDITOR.eventAccessible(event.label, event.dateLabel);

  return (
    <g data-item-id={event.itemId} role="button" aria-label={label} tabIndex={0}>
      <FillPattern id={patternId} style={event.fillStyle} color={event.color} theme={theme} />
      <line
        x1={event.x}
        x2={event.x}
        y1={event.dotY}
        y2={chipBottom}
        stroke={base}
        strokeWidth={1}
        strokeOpacity={CONNECTOR_OPACITY}
        {...(event.circa ? { strokeDasharray: CIRCA_DASH } : {})}
      />

      <rect
        x={event.chip.x}
        y={event.chip.y}
        width={event.chip.width}
        height={event.chip.height}
        rx={hasImage ? CARD_RADIUS : CHIP_RADIUS}
        fill={fill}
        stroke={base}
        strokeWidth={1}
      />

      {hasImage && (
        <image
          href={event.imageSrc}
          filter={theme.id === 'journal' ? 'url(#journal-monochrome)' : undefined}
          x={event.chip.x + ROW_GAP}
          y={event.chip.y + ROW_GAP}
          width={EVENT_IMAGE_SIZE}
          height={EVENT_IMAGE_SIZE}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`inset(0 round ${CHIP_RADIUS}px)`}
        />
      )}

      <text
        x={textLeft}
        y={event.chip.y + (event.showDate ? 15 : event.chip.height / 2 + 4)}
        style={chipTextStyle(text)}
      >
        {event.label}
      </text>

      {event.showDate && (
        <text x={textLeft} y={event.chip.y + 29} style={{ ...chipDateStyle(text), ...(event.fillStyle === 'solid' ? { opacity: 1 } : {}) }}>
          {event.dateLabel}
        </text>
      )}

      {/* La pastille passe après le connecteur pour le masquer proprement. */}
      <circle
        cx={event.x}
        cy={event.dotY}
        r={EVENT_DOT_SIZE / 2}
        fill={base}
        stroke="var(--paper)"
        strokeWidth={1.5}
      />
    </g>
  );
}
