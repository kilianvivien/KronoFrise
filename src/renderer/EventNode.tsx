/**
 * Événement — DESIGN.md §4 : pastille sur la ligne d'ancrage, connecteur
 * vertical, puce de libellé (ou carte illustrée). Le texte est un vrai nœud
 * SVG `<text>` : sélectionnable, lisible par un lecteur d'écran, jamais
 * vectorisé (DESIGN.md §7).
 */
import { useId, type JSX } from 'react';
import { EDITOR, WORKSHEET } from '../ui/strings';
import { EVENT_DOT_SIZE, EVENT_IMAGE_SIZE, ROW_GAP } from '../layout/metrics';
import type { SceneEvent } from '../layout/scene';
import { MANUEL_SCOLAIRE, type Theme } from '../themes';
import { fillPaint, FillPattern } from './FillPattern';
import { themeColors } from './themeColors';
import { MaskLine } from './MaskLine';
import {
  CARD_RADIUS, CHIP_PADDING_X, CHIP_RADIUS, CIRCA_DASH, CONNECTOR_OPACITY,
  chipDateBaseline, chipLabelBaseline,
} from './shapes';
import { chipDateStyle, chipTextStyle, maskedChipStyle } from './style';

export function EventNode({ event, theme = MANUEL_SCOLAIRE }: { event: SceneEvent; theme?: Theme }): JSX.Element {
  const patternId = `event-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const paint = fillPaint(event.color, theme, event.fillStyle, patternId);
  // Fiche élève (DESIGN.md §5) : la puce redevient du papier bordé de tirets,
  // et le texte caché laisse une ligne à compléter.
  const masked = event.maskLabel === true || event.maskDate === true;
  const { base, fill, text } = masked
    ? { base: paint.base, fill: 'var(--paper)', text: themeColors(event.color, theme).text }
    : paint;
  const hasImage = event.imageSrc !== undefined;
  const chipBottom = event.chip.y + event.chip.height;
  const textLeft = event.chip.x + CHIP_PADDING_X + (hasImage ? EVENT_IMAGE_SIZE + ROW_GAP : 0);
  // Le nom accessible suit le masque : la fiche ne souffle pas la réponse.
  const label = EDITOR.eventAccessible(
    event.maskLabel === true ? WORKSHEET.blank : event.label,
    event.maskDate === true ? WORKSHEET.blank : event.dateLabel,
  );

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
        strokeWidth={1}
        {...(masked ? maskedChipStyle : { stroke: base })}
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

      {event.maskLabel === true ? (
        <MaskLine x={textLeft} y={chipLabelBaseline(event.chip.y, event.chip.height, event.showDate)} width={event.labelWidth} />
      ) : (
        <text
          x={textLeft}
          y={chipLabelBaseline(event.chip.y, event.chip.height, event.showDate)}
          style={chipTextStyle(text)}
        >
          {event.label}
        </text>
      )}

      {event.showDate && (event.maskDate === true ? (
        <MaskLine x={textLeft} y={chipDateBaseline(event.chip.y)} width={event.dateWidth} />
      ) : (
        <text x={textLeft} y={chipDateBaseline(event.chip.y)} style={{ ...chipDateStyle(text), ...(!masked && event.fillStyle === 'solid' ? { opacity: 1 } : {}) }}>
          {event.dateLabel}
        </text>
      ))}

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
