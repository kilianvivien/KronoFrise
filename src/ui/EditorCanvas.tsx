import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type JSX } from 'react';
import { useStore } from 'zustand';
import { addItems, setLabel, type Command } from '../core/commands';
import { compareDates, formatDate, parseDateInput, toFractionalYear } from '../core/dates';
import { parseDocument } from '../core/schema';
import { newId } from '../core/ids';
import type { Item, KDate } from '../core/types';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { Frise } from '../renderer/Frise';
import { editorStore } from '../store/editor';
import { themeById } from '../themes';
import { CANVAS, EDITOR } from './strings';
import { TOKENS } from './tokenValues';
import { canvasMeasurer } from './measureText';
import { moveSelection, precisionAt, selectedStart, snapDate } from './canvasMath';
import styles from './Editor.module.css';

export type Tool = 'auto' | 'event' | 'period';
interface Props { tool: Tool; setTool: (tool: Tool) => void; zoom: number; setZoom: (zoom: number) => void; pan: number; setPan: (pan: number) => void }
interface Point { x: number; y: number }
interface Gesture {
  pointerId: number; start: Point; current: Point; moved: boolean;
  kind: 'pan' | 'create' | 'move' | 'resize-start' | 'resize-end' | 'marquee';
  itemId?: string; ids: string[]; date: KDate; laneId: string; pan: number; scroll: number;
  command: Command | null; created?: Item;
}
interface Editing { id: string; value: string; created?: Item }

export function EditorCanvas({ tool, setTool, zoom, setZoom, pan, setPan }: Props): JSX.Element {
  const state = useStore(editorStore);
  const doc = state.preview ?? state.document;
  const host = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [axisEdit, setAxisEdit] = useState<{ edge: 'start' | 'end'; value: string } | null>(null);
  const axisFinishing = useRef(false);
  const axisInput = useRef<HTMLInputElement>(null);
  const [space, setSpace] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [tooltip, setTooltip] = useState<{ point: Point; text: string; guide: number | null } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; end: Point } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const finishingEdit = useRef(false);
  const scale = useMemo(() => makeScale(doc.axis, size.width, pan, zoom), [doc.axis, size.width, pan, zoom]);
  const scene = useMemo(() => layout(doc, scale, { measurer: canvasMeasurer, height: size.height }), [doc, scale, size.height]);
  const sceneBoxes = useMemo(() => [
    ...scene.events.map((event) => ({ id: event.itemId, ...event.chip })),
    ...scene.periods.map((period) => ({ id: period.itemId, x: period.x0, y: period.y, width: period.x1 - period.x0, height: period.height })),
  ], [scene]);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); });
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useEffect(() => { if (editing) { finishingEdit.current = false; input.current?.focus(); input.current?.select(); } }, [editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (axisEdit) { axisFinishing.current = false; axisInput.current?.focus(); axisInput.current?.select(); } }, [axisEdit?.edge]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useCallback(() => {
    gesture.current = null;
    const current = editorStore.getState();
    current.previewCommand(null);
    current.select(current.selection.filter((id) => current.document.items.some((item) => item.id === id))); setDragging(false); setTooltip(null); setMarquee(null); setEditing(null); setAxisEdit(null);
  }, []);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'Space') { event.preventDefault(); setSpace(true); }
      if (event.key === 'Escape') { cancel(); setTool('auto'); }
    };
    const up = (event: KeyboardEvent) => { if (event.code === 'Space') setSpace(false); };
    const blur = () => { setSpace(false); cancel(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [cancel, setTool]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (editing || axisEdit || gesture.current) return;
      if (event.ctrlKey || event.metaKey) {
        const x = event.clientX - element.getBoundingClientRect().left;
        const next = Math.max(1, Math.min(5000, zoom * Math.exp(-event.deltaY / 180)));
        const nextScale = makeScale(doc.axis, size.width, 0, next);
        setPan(Math.max(0, Math.min(nextScale.maxPan(), nextScale.timeToX(scale.xToTime(x)) - x))); setZoom(next);
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey || scene.height <= size.height + 1) {
        setPan(Math.max(0, Math.min(scale.maxPan(), pan + (event.deltaX || event.deltaY))));
      } else element.scrollTop += event.deltaY;
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [doc.axis, editing, axisEdit, pan, scale, scene.height, setPan, setZoom, size, zoom]);

  const point = (event: PointerEvent): Point => {
    const rect = host.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) + (host.current?.scrollTop ?? 0) };
  };
  // SPEC? Linear bounds are edited directly on the ruler, without an inspector form (docs/spec-gaps.md §9).
  const finishAxis = (commit: boolean) => {
    if (!axisEdit || axisFinishing.current) return;
    axisFinishing.current = true;
    if (commit) {
      try {
        const date = parseDateInput(axisEdit.value);
        if (!date) throw new Error(EDITOR.invalidDate);
        const axis = { ...state.document.axis, [axisEdit.edge]: date };
        if (axisEdit.edge === 'end') axis.segments = [{ until: date, weight: 1 }];
        parseDocument({ ...state.document, axis });
        state.dispatch({ name: 'setAxis', axis });
      } catch (cause) { editorStore.setState({ error: cause instanceof Error ? cause.message : EDITOR.invalidDate }); }
    }
    setAxisEdit(null); host.current?.focus();
  };
  const finishEdit = (commit: boolean) => {
    if (!editing || finishingEdit.current) return;
    finishingEdit.current = true;
    if (commit) {
      const label = editing.value.trim() || (editing.created?.kind === 'period' ? EDITOR.period : EDITOR.event);
      if (editing.created) state.dispatch(addItems(state.document, [{ ...editing.created, label }]));
      else if (state.document.items.find((item) => item.id === editing.id)?.label !== label) state.dispatch(setLabel(editing.id, label));
    }
    if (!commit && editing.created) state.select([]);
    state.previewCommand(null); setEditing(null); setTool('auto'); host.current?.focus();
  };
  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    if (editing || axisEdit || (event.button !== 0 && event.button !== 1)) return;
    const target = event.target instanceof Element ? event.target : null;
    const id = target?.closest('[data-item-id]')?.getAttribute('data-item-id') ?? undefined;
    let edge = target?.closest('[data-edge]')?.getAttribute('data-edge');
    const start = point(event);
    const period = scene.periods.find((period) => period.itemId === id);
    if (!edge && period && state.selection.length <= 1) {
      if (Math.abs(start.x - period.x0) <= 8) edge = 'start';
      else if (Math.abs(start.x - period.x1) <= 8) edge = 'end';
    }
    const laneId = scene.lanes.find((lane) => start.y >= lane.y && start.y <= lane.anchorY)?.id ?? doc.lanes[0]?.id;
    if (!laneId) return;
    let ids = state.selection;
    let kind: Gesture['kind'] = 'create';
    if (space || event.button === 1) kind = 'pan';
    else if (id) {
      ids = event.shiftKey ? (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]) : ids.includes(id) ? ids : [id];
      state.select(ids);
      kind = edge === 'start' ? 'resize-start' : edge === 'end' ? 'resize-end' : 'move';
    } else if (event.shiftKey) kind = 'marquee';
    else state.select([]);
    const date = snapDate(scale, start.x, event.altKey).date;
    gesture.current = { pointerId: event.pointerId, start, current: start, kind, itemId: id, ids, date, laneId, pan, scroll: host.current?.scrollTop ?? 0, moved: false, command: null };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault(); event.currentTarget.focus();
  };
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const current = point(event); active.current = current;
    if (!active.moved && Math.hypot(current.x - active.start.x, current.y - active.start.y) < 4) return;
    active.moved = true; setDragging(true);
    if (active.kind === 'pan') {
      setPan(Math.max(0, Math.min(scale.maxPan(), active.pan - current.x + active.start.x)));
      if (host.current) host.current.scrollTop = active.scroll - event.movementY + host.current.scrollTop;
      return;
    }
    if (active.kind === 'marquee') { setMarquee({ start: active.start, end: current }); return; }
    let snap = snapDate(scale, current.x, event.altKey);
    if (active.kind === 'create') {
      const start = toFractionalYear(active.date) <= toFractionalYear(snap.date) ? active.date : snap.date;
      const end = start === active.date ? snap.date : active.date;
      if (compareDates(start, end) >= 0 || tool === 'event') return;
      const created: Item = { id: active.created?.id ?? newId(), kind: 'period', start, end, label: EDITOR.period, laneId: active.laneId, color: state.document.items.at(-1)?.color ?? 'brique', shape: 'bar' };
      active.created = created; active.command = addItems(state.document, [created]);
    } else if (active.kind === 'move' && active.itemId && active.ids.includes(active.itemId)) {
      const date = selectedStart(state.document, active.itemId);
      if (!date) return;
      const offset = scale.xToTime(current.x) - scale.xToTime(active.start.x);
      snap = snapDate(scale, scale.timeToX(toFractionalYear(date) + offset), event.altKey, precisionAt(scale, current.x));
      active.command = moveSelection(state.document, active.ids, toFractionalYear(snap.date) - toFractionalYear(date), precisionAt(scale, current.x));
    } else {
      const item = state.document.items.find((item) => item.id === active.itemId);
      if (!item || item.kind !== 'period') return;
      const start = active.kind === 'resize-start' ? snap.date : item.start;
      const end = active.kind === 'resize-end' ? snap.date : item.end;
      if (compareDates(start, end) >= 0) return;
      active.command = { name: 'updateItems', label: 'resizePeriod', patches: [{ itemId: item.id, patch: { start, end } }] };
    }
    if (active.command) state.previewCommand(active.command);
    const movedItem = editorStore.getState().preview?.items.find((item) => item.id === active.itemId);
    if (active.kind === 'move' && movedItem) {
      const date = movedItem.kind === 'event' ? movedItem.date : movedItem.start;
      snap = { date, guide: snap.guide !== null && Math.abs(scale.timeToX(toFractionalYear(date)) - snap.guide) < 1 ? snap.guide : null };
    }
    setTooltip({ point: current, text: active.created?.kind === 'period' ? EDITOR.range(formatDate(active.created.start), formatDate(active.created.end)) : formatDate(snap.date), guide: snap.guide });
  };
  const onUp = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false); setTooltip(null); setMarquee(null);
    if (active.kind === 'marquee' && active.moved) {
      const left = Math.min(active.start.x, active.current.x), right = Math.max(active.start.x, active.current.x);
      const top = Math.min(active.start.y, active.current.y), bottom = Math.max(active.start.y, active.current.y);
      state.select([...new Set([...active.ids, ...sceneBoxes.filter((box) => box.x < right && box.x + box.width > left && box.y < bottom && box.y + box.height > top).map((box) => box.id)])]);
    } else if (active.kind === 'create') {
      let item = active.created;
      if (!item && (!active.moved || tool === 'event') && tool !== 'period') item = { id: newId(), kind: 'event', date: active.date, label: EDITOR.event, color: state.document.items.at(-1)?.color ?? 'brique', laneId: active.laneId };
      if (item) {
        state.previewCommand(addItems(state.document, [item])); state.select([item.id]); setEditing({ id: item.id, value: item.label, created: item });
      }
    } else if (active.moved && active.command) state.dispatch(active.command);
  };
  const editBox = editing ? sceneBoxes.find((box) => box.id === editing.id) : null;

  return <div ref={host} className={styles.canvas} tabIndex={0} role="region" aria-label={EDITOR.canvas}
    data-tool={space ? 'pan' : tool} data-dragging={dragging} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
    onPointerCancel={cancel} onLostPointerCapture={() => { if (gesture.current) cancel(); }}
    onDoubleClick={(event) => {
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest('[data-item-id]')?.getAttribute('data-item-id');
      const item = doc.items.find((item) => item.id === id);
      if (item) setEditing({ id: item.id, value: item.label });
    }}
    onKeyDown={(event) => {
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest('[data-item-id]')?.getAttribute('data-item-id');
      if (id && (event.key === 'Enter' || event.key === 'F2')) {
        const item = doc.items.find((item) => item.id === id);
        if (item) { event.preventDefault(); event.stopPropagation(); state.select([id]); setEditing({ id, value: item.label }); }
      }
    }}>
    <Frise scene={scene} title={doc.meta.title} theme={themeById(doc.themeId)}>
      {sceneBoxes.filter((box) => state.selection.includes(box.id)).map((box) => <rect key={box.id} className={styles.selection} x={box.x - 2} y={box.y - 2} width={Math.max(box.width, 1) + 4} height={box.height + 4} rx={5} />)}
      {state.selection.length === 1 && !editing && scene.periods.filter((period) => state.selection.includes(period.itemId)).map((period) => <g key={period.itemId} data-item-id={period.itemId}>
        {(['start', 'end'] as const).map((edge) => <g key={edge} data-edge={edge} className={styles.edge}>
          <rect x={(edge === 'start' ? period.x0 : period.x1) - 12} y={period.y} width={24} height={24} fill="transparent" />
          <rect className={styles.handle} x={(edge === 'start' ? period.x0 : period.x1) - 4} y={period.y + 4} width={8} height={16} rx={4} />
        </g>)}
      </g>)}
      {marquee && <rect className={styles.marquee} x={Math.min(marquee.start.x, marquee.end.x)} y={Math.min(marquee.start.y, marquee.end.y)} width={Math.abs(marquee.end.x - marquee.start.x)} height={Math.abs(marquee.end.y - marquee.start.y)} />}
      {tooltip?.guide !== null && tooltip && <line className={styles.guide} x1={tooltip.guide} x2={tooltip.guide} y1={0} y2={scene.height} />}
    </Frise>
    {!doc.items.length && <p className={styles.empty}>{CANVAS.emptyHint}</p>}
    {editing && editBox && <input ref={input} className={styles.inline} aria-label={EDITOR.label}
      style={{ left: Math.max(4, Math.min(size.width - 244, editBox.x)), top: editBox.y, width: Math.max(160, Math.min(editBox.width, 320)) }}
      value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })}
      onPointerDown={(event) => event.stopPropagation()} onBlur={() => finishEdit(true)}
      onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); finishEdit(event.key === 'Enter'); } }} />}
    {doc.axis.segments.length === 1 && <div className={styles.axisBounds} style={{ top: scene.height - 30, color: TOKENS['--text-secondary'] }}>
      {(['start', 'end'] as const).map((edge) => axisEdit?.edge === edge ?
        <input key={edge} ref={axisInput} aria-label={edge === 'start' ? EDITOR.axisStart : EDITOR.axisEnd} value={axisEdit.value}
          onChange={(event) => setAxisEdit({ edge, value: event.target.value })} onPointerDown={(event) => event.stopPropagation()}
          onBlur={() => finishAxis(true)} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); finishAxis(event.key === 'Enter'); } }} /> :
        <button key={edge} aria-label={edge === 'start' ? EDITOR.axisStart : EDITOR.axisEnd} onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setAxisEdit({ edge, value: formatDate(doc.axis[edge]) })}>{formatDate(doc.axis[edge])}</button>)}
    </div>}
    {tooltip && <div className={styles.tooltip} data-snapped={tooltip.guide !== null} style={{ left: Math.min(size.width - 180, tooltip.point.x + 16), top: tooltip.point.y - 36 }}>{tooltip.text}</div>}
  </div>;
}
