/**
 * Dessin d'un `SceneGraph` sur une page PDF — docs/format.md §9.
 *
 * Le PDF n'a pas sa propre géométrie : il appelle les mêmes fonctions de
 * `renderer/shapes.ts` et les mêmes couleurs que l'écran, sur la scène déjà
 * calculée. Le texte reste du vrai texte (sélectionnable, cherchable), jamais
 * des contours vectorisés.
 *
 * SPEC? Les polices standard PDF sont encodées en WinAnsi : « XVIIᵉ » est
 * replié en « XVIIe » à l'export (docs/spec-gaps.md §8).
 */
import { degrees, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import {
  TICK_LABEL_GAP, TICK_MAJOR_HEIGHT, TICK_MINOR_HEIGHT,
  BASELINE_WIDTH, CANVAS_PADDING, EVENT_DOT_SIZE, EVENT_IMAGE_SIZE, ROW_GAP,
  TITLE_FONT_SIZE, TITLE_META_SIZE, TITLE_SUBTITLE_SIZE,
} from '../layout/metrics';
import type { SceneEvent, SceneGraph, ScenePeriod, SceneTitle } from '../layout/scene';
import { fillPaint, gradientPaint } from '../renderer/FillPattern';
import {
  arrowPath, BAR_RADIUS, bracketPath, CARD_RADIUS, CHIP_PADDING_X, CHIP_RADIUS,
  chipDateBaseline, chipLabelBaseline, clampTickLabelX, CONNECTOR_OPACITY, coupureStrokes,
  ARROW_HEAD, gradientLayers, LANE_COLOR_OPACITY, LANE_NAME_BASELINE, leftRoundedPath, MASK_BASELINE_DROP, patternTile,
  PERIOD_LABEL_PADDING, STRIPE_OPACITY, tickAnchor,
} from '../renderer/shapes';
import { themeColors } from '../renderer/themeColors';
import { FS_CAPTION, FS_UI } from '../renderer/style';
import type { Theme } from '../themes';
import { toRgb01 } from '../ui/tokenValues';
import { mix } from '../shared/palette';

/** Repère : la scène est en pixels, l'origine en haut à gauche ; le PDF non. */
export interface Frame {
  /** abscisse du pixel 0 de la scène, en points */
  originX: number;
  /** ordonnée du pixel 0 de la scène, en points (bord haut) */
  originY: number;
  scale: number;
}

export interface PdfContext {
  page: PDFPage;
  frame: Frame;
  font: PDFFont;
  bold: PDFFont;
  theme: Theme;
  /** images déjà incorporées, par source */
  images: Map<string, PDFImage>;
}

const x = (frame: Frame, value: number): number => frame.originX + value * frame.scale;
const y = (frame: Frame, value: number): number => frame.originY - value * frame.scale;
const color = (value: string) => {
  const { r, g, b } = toRgb01(value);
  return rgb(r, g, b);
};

/**
 * Texte prêt pour le PDF.
 *
 * Depuis l'incorporation d'Inter (M4, ajout 2), « XVIIᵉ » s'imprime tel quel :
 * il n'y a plus de repli sur « XVIIe ». Seule reste l'espace fine insécable
 * (U+202F), absente du sous-ensemble, ramenée sur l'espace insécable — ce que
 * l'œil ne distingue pas à 11 px et que la typographie française admet.
 */
export function toPdfText(text: string): string {
  return text.replace(/\u202F/g, '\u00A0');
}

interface TextOptions {
  size: number;
  color: string;
  bold?: boolean;
  /** ancrage horizontal, comme `text-anchor` en SVG */
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
}

function drawText(context: PdfContext, text: string, px: number, py: number, options: TextOptions): void {
  const { frame } = context;
  const font = options.bold === true ? context.bold : context.font;
  const size = options.size * frame.scale;
  const safe = toPdfText(text);
  const width = font.widthOfTextAtSize(safe, size);
  const offset = options.anchor === 'middle' ? width / 2 : options.anchor === 'end' ? width : 0;
  context.page.drawText(safe, {
    x: x(frame, px) - offset,
    // Une ligne de base SVG est une ligne de base PDF : même point.
    y: y(frame, py),
    size,
    font,
    color: color(options.color),
    ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
  });
}

interface ShapeOptions {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  dash?: number[];
  opacity?: number;
  radius?: number;
}

function drawRect(context: PdfContext, px: number, py: number, width: number, height: number, options: ShapeOptions): void {
  drawPath(context, roundedRectPath(px, py, width, height, options.radius ?? 0), options);
}

/** Rectangle à coins arrondis, en chemin SVG : pdf-lib dessine le même. */
export function roundedRectPath(px: number, py: number, width: number, height: number, radius: number): string {
  if (radius <= 0) return `M ${px} ${py} h ${width} v ${height} h ${-width} Z`;
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M ${px + r} ${py}`,
    `H ${px + width - r}`,
    `A ${r} ${r} 0 0 1 ${px + width} ${py + r}`,
    `V ${py + height - r}`,
    `A ${r} ${r} 0 0 1 ${px + width - r} ${py + height}`,
    `H ${px + r}`,
    `A ${r} ${r} 0 0 1 ${px} ${py + height - r}`,
    `V ${py + r}`,
    `A ${r} ${r} 0 0 1 ${px + r} ${py}`,
    'Z',
  ].join(' ');
}

function drawPath(context: PdfContext, path: string, options: ShapeOptions): void {
  const { frame } = context;
  context.page.drawSvgPath(path, {
    x: frame.originX,
    y: frame.originY,
    scale: frame.scale,
    ...(options.fill === undefined || options.fill === 'transparent' ? { color: undefined } : { color: color(options.fill) }),
    ...(options.stroke === undefined ? { borderWidth: 0 } : { borderColor: color(options.stroke), borderWidth: (options.lineWidth ?? 1) * frame.scale }),
    ...(options.dash === undefined ? {} : { borderDashArray: options.dash.map((value) => value * frame.scale) }),
    ...(options.opacity === undefined ? {} : { opacity: options.opacity, borderOpacity: options.opacity }),
  });
}

function drawLine(context: PdfContext, x1: number, y1: number, x2: number, y2: number, options: ShapeOptions): void {
  const { frame } = context;
  context.page.drawLine({
    start: { x: x(frame, x1), y: y(frame, y1) },
    end: { x: x(frame, x2), y: y(frame, y2) },
    thickness: (options.lineWidth ?? 1) * frame.scale,
    color: color(options.stroke ?? 'var(--text-primary)'),
    ...(options.dash === undefined ? {} : { dashArray: options.dash.map((value) => value * frame.scale) }),
    ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
  });
}

function drawCircle(context: PdfContext, cx: number, cy: number, radius: number, options: ShapeOptions): void {
  const { frame } = context;
  context.page.drawCircle({
    x: x(frame, cx),
    y: y(frame, cy),
    size: radius * frame.scale,
    ...(options.fill === undefined ? {} : { color: color(options.fill) }),
    ...(options.stroke === undefined ? {} : { borderColor: color(options.stroke), borderWidth: (options.lineWidth ?? 1) * frame.scale }),
  });
}

/**
 * Motif de remplissage : la tuile de `shapes.ts` est répétée sur la boîte de
 * l'élément. Faute de motif natif en PDF, on pave — la géométrie reste
 * vectorielle et identique à celle de l'écran.
 */
function drawPattern(context: PdfContext, box: { x: number; y: number; width: number; height: number }, style: string, base: string): void {
  const tile = patternTile(style as never);
  if (tile === undefined) return;
  const columns = Math.ceil(box.width / tile.size);
  const rows = Math.ceil(box.height / tile.size);
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const tx = box.x + column * tile.size;
      const ty = box.y + row * tile.size;
      // Une tuile qui dépasse est rognée par la découpe de page, pas ici :
      // on la saute quand elle sort de la boîte pour ne pas la déborder.
      if (tx > box.x + box.width || ty > box.y + box.height) continue;
      for (const stroke of tile.strokes) {
        drawPath(context, translatePath(stroke, tx, ty), { stroke: base, lineWidth: 1, opacity: tile.strokeOpacity });
      }
      if (tile.dot) {
        drawCircle(context, tx + tile.dot.cx, ty + tile.dot.cy, tile.dot.r, { fill: base });
      }
    }
  }
}

/**
 * Dégradé approché en bandes — PLAN.md M4 (ajout 3).
 *
 * pdf-lib n'expose pas de nuancier (« shading ») : le dégradé continu du SVG y
 * devient `GRADIENT_BANDS` aplats. On ne peut pas non plus découper sur la
 * forme — `drawSvgPath` referme son propre état graphique et emporte la
 * découpe avec lui. L'approximation est donc un **empilement** : la forme
 * entière dans la teinte la plus soutenue, puis des copies de plus en plus
 * courtes et claires par-dessus (`gradientLayers`). La silhouette vient de la
 * couche du dessous, coins arrondis et pointe de flèche compris.
 *
 * L'écart avec l'écran est une quantification, pas une autre géométrie — et il
 * est annoncé dans la boîte d'export, jamais découvert à l'impression.
 */
function drawGradient(
  context: PdfContext,
  fullPath: string,
  box: { x: number; y: number; width: number; height: number },
  from: string,
  to: string,
  options: { radius: number; inset: number },
): void {
  // Les couches intermédiaires s'arrêtent avant la pointe d'une flèche ou
  // l'arrondi d'une barre : au-delà, un bord franc sortirait de la forme.
  const usable = Math.max(box.width - options.inset, 1);
  for (const layer of gradientLayers()) {
    const shade = mix(from, to, layer.mix);
    if (layer.full) {
      drawPath(context, fullPath, { fill: shade });
      continue;
    }
    const width = usable * layer.width;
    drawPath(context, leftRoundedPath(box.x, box.y, width, box.height, options.radius), { fill: shade });
  }
}

/** Décale un chemin de tuile : les tuiles n'utilisent que M/L/H/V absolus. */
export function translatePath(path: string, dx: number, dy: number): string {
  return path.replace(/([MLHV])\s*(-?[\d.]+)(?:\s+(-?[\d.]+))?/gi, (_match, command: string, a: string, b?: string) => {
    const first = Number(a);
    if (command === 'H') return `H ${first + dx}`;
    if (command === 'V') return `V ${first + dy}`;
    return `${command} ${first + dx} ${Number(b ?? 0) + dy}`;
  });
}

/* ------------------------------------------------------------------ */
/* La scène                                                            */
/* ------------------------------------------------------------------ */

export function drawScene(context: PdfContext, scene: SceneGraph): void {
  if (scene.title) drawTitleBlock(context, scene.title);
  drawLanes(context, scene);
  // Même ordre qu'à l'écran : les connecteurs passent derrière les puces.
  for (const event of scene.events) drawConnector(context, event);
  // Même ordre qu'à l'écran : périodes et événements triés par abscisse.
  const nodes = [
    ...scene.periods.map((period) => ({ id: period.itemId, x: period.x0, draw: () => drawPeriod(context, period) })),
    ...scene.events.map((event) => ({ id: event.itemId, x: event.x, draw: () => drawEvent(context, event) })),
  ].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
  for (const node of nodes) node.draw();
  drawRuler(context, scene);
}

/**
 * Bloc de titre — PLAN.md M4 (ajout 4).
 *
 * Aucune géométrie ici : les lignes de base viennent du `SceneGraph`, comme à
 * l'écran. Le PDF n'a donc pas sa propre idée de l'endroit où poser un titre.
 */
function drawTitleBlock(context: PdfContext, title: SceneTitle): void {
  const anchor = title.anchor === 'middle' ? 'middle' : 'start';
  drawText(context, title.title, title.x, title.titleY, {
    size: TITLE_FONT_SIZE, color: context.theme.axisInk, bold: true, anchor,
  });
  if (title.subtitle !== undefined && title.subtitleY !== undefined) {
    drawText(context, title.subtitle, title.x, title.subtitleY, {
      size: TITLE_SUBTITLE_SIZE, color: context.theme.rulerInk, anchor,
    });
  }
  if (title.meta !== undefined && title.metaY !== undefined) {
    drawText(context, title.meta, title.x, title.metaY, {
      size: TITLE_META_SIZE, color: context.theme.rulerInkMinor, anchor,
    });
  }
}

function drawLanes(context: PdfContext, scene: SceneGraph): void {
  const { theme } = context;
  for (const lane of scene.lanes) {
    for (const segment of scene.axisSegments) {
      const width = Math.max(segment.x1 - segment.x0, 0);
      if (lane.striped || lane.color !== undefined) {
        const fill = lane.color === undefined ? theme.paperLine : themeColors(lane.color, theme).base;
        const opacity = lane.color === undefined ? STRIPE_OPACITY : theme.id === 'journal' ? 0 : LANE_COLOR_OPACITY;
        if (opacity > 0) drawRect(context, segment.x0, lane.y, width, lane.height, { fill, opacity });
      }
      drawLine(context, segment.x0, lane.y + lane.height, segment.x1, lane.y + lane.height, { stroke: theme.paperLine, lineWidth: 1 });
    }
    if (lane.name !== '') {
      drawText(context, lane.name.toLocaleUpperCase('fr'), CANVAS_PADDING, lane.y + LANE_NAME_BASELINE, {
        size: FS_CAPTION, color: theme.laneInk, bold: true,
      });
    }
  }
}

function drawPeriod(context: PdfContext, period: ScenePeriod): void {
  const { theme } = context;
  const paint = fillPaint(period.color, theme, period.fillStyle, 'pdf');
  const masked = period.maskLabel === true || period.maskDate === true;
  const base = paint.base;
  const fill = masked ? theme.paper : paint.fill;
  const text = masked || period.shape === 'bracket' || !period.labelInside
    ? themeColors(period.color, theme).text
    : paint.text;
  const width = Math.max(period.x1 - period.x0, 1);
  const stroke = masked ? 'var(--text-tertiary)' : base;
  const dash = masked ? [3, 3] : undefined;

  if (period.shape === 'bracket') {
    drawPath(context, bracketPath(period.x0, period.x1, period.y), { stroke: base, lineWidth: 1.5 });
  } else {
    const path = period.shape === 'arrow'
      ? arrowPath(period.x0, period.y, width, period.height)
      : roundedRectPath(period.x0, period.y, width, period.height, BAR_RADIUS);
    const patterned = period.fillStyle !== undefined && patternTile(period.fillStyle) !== undefined;
    const gradient = period.fillStyle === 'gradient' && !masked;
    if (gradient) {
      const { from, to } = gradientPaint(period.color, theme);
      drawGradient(context, path, { x: period.x0, y: period.y, width, height: period.height }, from, to, {
        radius: BAR_RADIUS,
        inset: period.shape === 'arrow' ? ARROW_HEAD : BAR_RADIUS,
      });
    }
    drawPath(context, path, {
      ...(gradient ? {} : patterned || fill === 'transparent'
        ? { fill: masked ? theme.paper : themeColors(period.color, theme).fill }
        : { fill }),
      stroke, lineWidth: 1, ...(dash ? { dash } : {}),
    });
    if (patterned && !masked) {
      drawPattern(context, { x: period.x0, y: period.y, width, height: period.height }, period.fillStyle as string, base);
    }
  }

  const centerY = period.y + period.height / 2 + 4;
  if (period.shape === 'bracket') {
    const left = (period.x0 + period.x1 - period.labelWidth) / 2;
    if (period.maskLabel === true) drawMaskLine(context, left, period.y - 4, period.labelWidth);
    else drawText(context, period.label, (period.x0 + period.x1) / 2, period.y - 4, { size: FS_UI, color: text, bold: true, anchor: 'middle' });
    return;
  }
  const labelLeft = period.labelInside ? period.labelX - period.labelWidth / 2 : period.labelX;
  if (period.maskLabel === true) drawMaskLine(context, labelLeft, centerY, period.labelWidth);
  else drawText(context, period.label, period.labelX, centerY, {
    size: FS_UI, color: text, bold: true, anchor: period.labelInside ? 'middle' : 'start',
  });
  if (period.labelInside && period.showDates) {
    if (period.maskDate === true) drawMaskLine(context, period.x1 - PERIOD_LABEL_PADDING - period.datesWidth, centerY, period.datesWidth);
    else drawText(context, period.datesLabel, period.x1 - PERIOD_LABEL_PADDING, centerY, {
      size: FS_CAPTION, color: text, anchor: 'end',
      ...(!masked && period.fillStyle === 'solid' ? {} : { opacity: 0.75 }),
    });
  }
}

function drawEvent(context: PdfContext, event: SceneEvent): void {
  const { theme } = context;
  const paint = fillPaint(event.color, theme, event.fillStyle, 'pdf');
  const masked = event.maskLabel === true || event.maskDate === true;
  const base = paint.base;
  const fill = masked ? theme.paper : paint.fill;
  const text = masked ? themeColors(event.color, theme).text : paint.text;
  const hasImage = event.imageSrc !== undefined;
  const textLeft = event.chip.x + CHIP_PADDING_X + (hasImage ? EVENT_IMAGE_SIZE + ROW_GAP : 0);

  const patterned = event.fillStyle !== undefined && patternTile(event.fillStyle) !== undefined;
  const gradient = event.fillStyle === 'gradient' && !masked;
  const chipRadius = hasImage ? CARD_RADIUS : CHIP_RADIUS;
  if (gradient) {
    const { from, to } = gradientPaint(event.color, theme);
    drawGradient(
      context,
      roundedRectPath(event.chip.x, event.chip.y, event.chip.width, event.chip.height, chipRadius),
      { x: event.chip.x, y: event.chip.y, width: event.chip.width, height: event.chip.height },
      from, to, { radius: chipRadius, inset: chipRadius },
    );
  }
  drawRect(context, event.chip.x, event.chip.y, event.chip.width, event.chip.height, {
    ...(gradient ? {} : patterned || fill === 'transparent'
      ? { fill: masked ? theme.paper : themeColors(event.color, theme).fill }
      : { fill }),
    stroke: masked ? 'var(--text-tertiary)' : base,
    lineWidth: 1,
    radius: chipRadius,
    ...(masked ? { dash: [3, 3] } : {}),
  });
  if (patterned && !masked) {
    drawPattern(context, { x: event.chip.x, y: event.chip.y, width: event.chip.width, height: event.chip.height }, event.fillStyle as string, base);
  }

  const image = event.imageSrc === undefined ? undefined : context.images.get(event.imageSrc);
  if (image !== undefined) {
    const { frame } = context;
    context.page.drawImage(image, {
      x: x(frame, event.chip.x + ROW_GAP),
      y: y(frame, event.chip.y + ROW_GAP + EVENT_IMAGE_SIZE),
      width: EVENT_IMAGE_SIZE * frame.scale,
      height: EVENT_IMAGE_SIZE * frame.scale,
      rotate: degrees(0),
    });
  }

  const labelY = chipLabelBaseline(event.chip.y, event.chip.height, event.showDate);
  if (event.maskLabel === true) drawMaskLine(context, textLeft, labelY, event.labelWidth);
  else drawText(context, event.label, textLeft, labelY, { size: FS_UI, color: text });

  if (event.showDate) {
    const dateY = chipDateBaseline(event.chip.y);
    if (event.maskDate === true) drawMaskLine(context, textLeft, dateY, event.dateWidth);
    else drawText(context, event.dateLabel, textLeft, dateY, {
      size: FS_CAPTION, color: text, ...(!masked && event.fillStyle === 'solid' ? {} : { opacity: 0.7 }),
    });
  }

  drawCircle(context, event.x, event.dotY, EVENT_DOT_SIZE / 2, { fill: base, stroke: theme.paper, lineWidth: 1.5 });
}

function drawConnector(context: PdfContext, event: SceneEvent): void {
  const { base } = themeColors(event.color, context.theme);
  drawLine(context, event.x, event.dotY, event.x, event.chip.y + event.chip.height, {
    stroke: base, lineWidth: 1, opacity: CONNECTOR_OPACITY, ...(event.circa ? { dash: [2, 4] } : {}),
  });
}

function drawMaskLine(context: PdfContext, px: number, py: number, width: number): void {
  drawLine(context, px, py + MASK_BASELINE_DROP, px + width, py + MASK_BASELINE_DROP, {
    stroke: 'var(--text-tertiary)', lineWidth: 1,
  });
}

function drawRuler(context: PdfContext, scene: SceneGraph): void {
  const { theme } = context;
  const baseline = scene.baselineY;
  for (const segment of scene.axisSegments) {
    drawLine(context, Math.max(segment.x0, -1), baseline, Math.min(segment.x1, scene.width + 1), baseline, {
      stroke: theme.axisInk, lineWidth: BASELINE_WIDTH,
    });
  }
  for (const tick of scene.ticks) {
    drawLine(context, tick.x, baseline, tick.x, baseline + (tick.major ? TICK_MAJOR_HEIGHT : TICK_MINOR_HEIGHT), {
      stroke: tick.major ? theme.axisInk : theme.rulerInkMinor, lineWidth: 1,
    });
    if (tick.label === undefined) continue;
    drawText(context, tick.label, clampTickLabelX(tick.x, scene.width), baseline + TICK_MAJOR_HEIGHT + TICK_LABEL_GAP + FS_CAPTION, {
      size: FS_CAPTION, color: theme.rulerInk, anchor: tickAnchor(tick.x, scene.width),
    });
  }
  for (const coupure of scene.coupures) {
    for (const stroke of coupureStrokes(coupure.x + coupure.width / 2, baseline)) {
      drawLine(context, stroke.x1, stroke.y1, stroke.x2, stroke.y2, { stroke: theme.rulerInk, lineWidth: 1.5 });
    }
  }
}
