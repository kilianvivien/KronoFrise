import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type JSX } from 'react';
import { useStore } from 'zustand';
import { addItems, setLabel, setLane, type Command } from '../core/commands';
import { compareDates, formatDate, parseDateInput, toFractionalYear } from '../core/dates';
import { parseDocument } from '../core/schema';
import { newId } from '../core/ids';
import type { Item, KDate } from '../core/types';
import { layout } from '../layout/layout';
import { visibleScene } from '../layout/scene';
import { makeScale, type ScaleInsets } from '../layout/scale';
import { Frise } from '../renderer/Frise';
import { editorStore } from '../store/editor';
import { themeById } from '../themes';
import { CANVAS, EDITOR } from './strings';
import { resolveToken } from './tokenValues';
import { clampPan } from './camera';
import { AxisHandles } from './AxisHandles';
import { moveAxisBreak, removeAxisBreak, splitAxis } from '../core/axis';
import { Field, commit, dateInput, reportError } from './fields';
import { importImage } from './images';
import { M2 } from './strings';
import { canvasMeasurer } from './measureText';
import { Icon } from './icons';
import { moveSelection, precisionAt, selectedStart, snapDate } from './canvasMath';
import { useReflow } from './useReflow';
import styles from './Editor.module.css';

import { backgroundIntent, createsEvent, type Tool } from './gesturePolicy';
import { CanvasPointers, pinchZoom } from './canvasPointers';
export type { Tool } from './gesturePolicy';
interface Props {
  insets: ScaleInsets; onWidth: (width: number) => void; focusItem: { id: string; serial: number } | null;
  tool: Tool; setTool: (tool: Tool) => void; zoom: number; setZoom: (zoom: number) => void; pan: number; setPan: (pan: number) => void;
  /** fiche élève : les masques deviennent des lignes à compléter */
  worksheet?: boolean;
  /** fiche élève : on choisit les masques, on ne déplace rien */
  readOnly?: boolean;
}
interface Point { x: number; y: number }
interface Gesture {
  pointerId: number; start: Point; current: Point; moved: boolean;
  kind: 'pan' | 'create' | 'move' | 'resize-start' | 'resize-end' | 'marquee';
  itemId?: string; ids: string[]; date: KDate; laneId: string; pan: number; scroll: number;
  command: Command | null; created?: Item;
}
interface Editing { id: string; value: string; created?: Item }

export function EditorCanvas({ tool, setTool, zoom, setZoom, pan, setPan, onWidth, focusItem, insets, worksheet = false, readOnly = false }: Props): JSX.Element {
  const state = useStore(editorStore);
  const doc = state.preview ?? state.document;
  const theme = themeById(doc.themeId);
  const host = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new CanvasPointers());
  const pinch = useRef<{ distance: number; zoom: number; time: number; y: number; scroll: number } | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [axisMenu, setAxisMenu] = useState<{ index: number | null; x: number; date: string } | null>(null);
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
  const scale = useMemo(() => makeScale(doc.axis, size.width, pan, zoom, insets), [doc.axis, size.width, pan, zoom, insets]);
  const settled = useMemo(() => layout(doc, scale, { measurer: canvasMeasurer, height: size.height, worksheet }), [doc, scale, size.height, worksheet]);
  // Après un dépôt, la mise en page ne saute pas : elle glisse vers sa nouvelle
  // forme en 140 ms (DESIGN.md §8). Le reste du composant — sélection,
  // poignées, aimantation — travaille sur cette scène-là, celle qui est peinte,
  // et reste donc d'accord avec ce que l'on voit pendant le mouvement.
  const scene = useReflow(settled, doc.id, state.preview === null ? state.revision : null);
  // Ce qui est réellement dessiné : la scène élaguée à la fenêtre, avec une
  // largeur de vue de marge de chaque côté. La sélection, la souris et les
  // exports continuent de travailler sur `scene`, qui reste entière.
  const painted = useMemo(() => visibleScene(scene, { x0: -size.width, x1: size.width * 2 }), [scene, size.width]);
  const sceneBoxes = useMemo(() => [
    ...scene.events.map((event) => ({ id: event.itemId, ...event.chip })),
    ...scene.periods.map((period) => ({ id: period.itemId, x: period.x0, y: period.y, width: period.x1 - period.x0, height: period.height })),
  ], [scene]);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) { setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); onWidth(entry.contentRect.width); } });
    observer.observe(host.current); return () => observer.disconnect();
  }, [onWidth]);
  useEffect(() => {
    if (!focusItem) return;
    const item = state.document.items.find((item) => item.id === focusItem.id);
    if (!item) return;
    const start = toFractionalYear(item.kind === 'event' ? item.date : item.start);
    const time = item.kind === 'event' ? start : (start + toFractionalYear(item.end)) / 2;
    const unpanned = makeScale(state.document.axis, size.width, 0, zoom, insets);
    setPan(clampPan(unpanned, unpanned.timeToX(time) - size.width / 2));
    const lane = scene.lanes.find((lane) => lane.id === item.laneId);
    if (lane && host.current) host.current.scrollTop = Math.max(0, lane.anchorY - size.height + 80);
    // A focus request is one camera action, not a camera lock on each render.
  }, [focusItem]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (editing) { finishingEdit.current = false; input.current?.focus(); input.current?.select(); } }, [editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (axisEdit) { axisFinishing.current = false; axisInput.current?.focus(); axisInput.current?.select(); } }, [axisEdit?.edge]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useCallback(() => {
    pointers.current.clear(); pinch.current = null;
    gesture.current = null;
    const current = editorStore.getState();
    current.previewCommand(null);
    current.select(current.selection.filter((id) => current.document.items.some((item) => item.id === id))); setDragging(false); setTooltip(null); setMarquee(null); setEditing(null); setAxisEdit(null); setAxisMenu(null);
  }, []);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true],dialog')) return;
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
        const nextScale = makeScale(doc.axis, size.width, 0, next, insets);
        setPan(clampPan(nextScale, nextScale.timeToX(scale.xToTime(x)) - x)); setZoom(next);
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey || scene.height <= size.height + 1) {
        setPan(clampPan(scale, pan + (event.deltaX || event.deltaY)));
      } else element.scrollTop += event.deltaY;
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [doc.axis, editing, axisEdit, pan, scale, scene.height, setPan, setZoom, size, zoom, insets]);

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
    if (editing || axisEdit || axisMenu || (event.button !== 0 && event.button !== 1)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const intent = pointers.current.down({ id: event.pointerId, type: event.pointerType, x: event.clientX - rect.left, y: event.clientY - rect.top });
    if (intent === 'ignore') return;
    if (intent === 'pinch' || gesture.current) {
      // A pinch or a new pen stroke cancels the uncommitted one-pointer edit.
      gesture.current = null; state.previewCommand(null);
      setDragging(false); setTooltip(null); setMarquee(null);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const pair = pointers.current.pair();
    if (pair) {
      pinch.current = { distance: pair.distance, zoom, time: scale.xToTime(pair.x), y: pair.y, scroll: event.currentTarget.scrollTop };
      event.preventDefault();
      return;
    }
    pinch.current = null;
    const target = event.target instanceof Element ? event.target : null;
    const id = target?.closest('[data-item-id]')?.getAttribute('data-item-id') ?? undefined;
    let edge = target?.closest('[data-edge]')?.getAttribute('data-edge');
    const start = point(event);
    const period = scene.periods.find((period) => period.itemId === id);
    if (!edge && period && state.selection.length <= 1) {
      const hitWidth = event.pointerType === 'touch' ? 18 : 8;
      if (Math.abs(start.x - period.x0) <= hitWidth) edge = 'start';
      else if (Math.abs(start.x - period.x1) <= hitWidth) edge = 'end';
    }
    const laneId = scene.lanes.find((lane) => start.y >= lane.y && start.y <= lane.anchorY)?.id ?? doc.lanes[0]?.id;
    if (!laneId) return;
    let ids = state.selection;
    let kind: Gesture['kind'] = readOnly ? (event.shiftKey ? 'marquee' : 'pan') : backgroundIntent(tool, event.shiftKey, space, event.button);
    if (space || event.button === 1) kind = 'pan';
    else if (id) {
      ids = event.shiftKey ? (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]) : ids.includes(id) ? ids : [id];
      state.select(ids);
      kind = readOnly ? 'pan' : edge === 'start' ? 'resize-start' : edge === 'end' ? 'resize-end' : 'move';
    } else if (event.shiftKey) kind = 'marquee';
    else state.select([]);
    const date = snapDate(scale, start.x, event.altKey).date;
    gesture.current = { pointerId: event.pointerId, start, current: start, kind, itemId: id, ids, date, laneId, pan, scroll: host.current?.scrollTop ?? 0, moved: false, command: null };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault(); event.currentTarget.focus();
  };
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointers.current.move({ id: event.pointerId, type: event.pointerType, x: event.clientX - rect.left, y: event.clientY - rect.top });
    const pair = pointers.current.pair();
    if (pair && pinch.current) {
      const initial = pinch.current;
      const next = pinchZoom(initial.zoom, initial.distance, pair.distance);
      const nextScale = makeScale(state.document.axis, size.width, 0, next, insets);
      setZoom(next); setPan(clampPan(nextScale, nextScale.timeToX(initial.time) - pair.x));
      event.currentTarget.scrollTop = initial.scroll + initial.y - pair.y;
      event.preventDefault();
      return;
    }
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const current = point(event); active.current = current;
    if (!active.moved && Math.hypot(current.x - active.start.x, current.y - active.start.y) < 4) return;
    active.moved = true; setDragging(true);
    if (active.kind === 'pan') {
      setPan(clampPan(scale, active.pan - current.x + active.start.x));
      event.currentTarget.scrollTop = active.start.y - (event.clientY - rect.top);
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
      const destination = scene.lanes.find((lane) => current.y >= lane.y && current.y <= lane.anchorY);
      if (destination && destination.id !== active.laneId) active.command = { name: 'batch', label: 'moveBetweenLanes', commands: [active.command, setLane(active.ids, destination.id)] };
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
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.up(event.pointerId);
    if (pinch.current) {
      pinch.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return; // Lifting a finger after zooming must not create or move an item.
    }
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
      if (!item && createsEvent(tool, active.moved)) item = { id: newId(), kind: 'event', date: active.date, label: EDITOR.event, color: state.document.items.at(-1)?.color ?? 'brique', laneId: active.laneId };
      if (item) {
        state.previewCommand(addItems(state.document, [item])); state.select([item.id]); setEditing({ id: item.id, value: item.label, created: item });
      }
    } else if (active.moved && active.command) state.dispatch(active.command);
  };
  const editBox = editing ? sceneBoxes.find((box) => box.id === editing.id) : null;

  return <div ref={host} className={styles.canvas} style={{ '--paper': resolveToken(theme.paper) } as CSSProperties} tabIndex={0} role="region" aria-label={EDITOR.canvas}
    data-tool={space || tool === 'auto' ? 'pan' : tool} data-dragging={dragging} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
    onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
    onDrop={(event) => {
      event.preventDefault();
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest('[data-item-id]')?.getAttribute('data-item-id');
      if (readOnly) return;
      const item = doc.items.find((item) => item.id === id && item.kind === 'event'), file = event.dataTransfer.files[0];
      const documentId = doc.id;
      if (item && file) void importImage(file).then((image) => { const current = editorStore.getState(); if (current.document.id === documentId && current.document.items.some((i) => i.id === item.id)) commit({ name: 'updateItems', label: 'setImage', patches: [{ itemId: item.id, patch: { image } }] }); }).catch(reportError);
    }}
    onContextMenu={(event) => { if (readOnly) return; const rect = host.current?.getBoundingClientRect(); const y = event.clientY - (rect?.top ?? 0) + (host.current?.scrollTop ?? 0); if (y >= scene.baselineY - 16) { event.preventDefault(); const x = event.clientX - (rect?.left ?? 0); setAxisMenu({ index: null, x, date: formatDate(snapDate(scale, x, false).date) }); } }}
    onPointerCancel={(event) => { if (pointers.current.has(event.pointerId)) cancel(); }}
    onLostPointerCapture={(event) => { if (pointers.current.has(event.pointerId)) cancel(); }}
    onFocus={(event) => {
      // Sans cela, Tab atteignait un élément mais ne le sélectionnait pas :
      // au clavier, rien n'était déplaçable, dupliquable ni supprimable
      // (DESIGN.md §7 — « Tab l'atteint »).
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest('[data-item-id]')?.getAttribute('data-item-id');
      const selection = editorStore.getState().selection;
      if (id && (selection.length !== 1 || selection[0] !== id)) state.select([id]);
    }}
    onDoubleClick={(event) => {
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest('[data-item-id]')?.getAttribute('data-item-id');
      const item = doc.items.find((item) => item.id === id);
      if (item && !readOnly) setEditing({ id: item.id, value: item.label });
    }}
    onKeyDown={(event) => {
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest('[data-item-id]')?.getAttribute('data-item-id');
      if (id && !readOnly && (event.key === 'Enter' || event.key === 'F2')) {
        const item = doc.items.find((item) => item.id === id);
        if (item) { event.preventDefault(); event.stopPropagation(); state.select([id]); setEditing({ id, value: item.label }); }
      }
    }}>
    <Frise scene={painted} title={doc.meta.title} theme={themeById(doc.themeId)}>
      {sceneBoxes.filter((box) => state.selection.includes(box.id)).map((box) => <rect key={box.id} className={styles.selection} x={box.x - 2} y={box.y - 2} width={Math.max(box.width, 1) + 4} height={box.height + 4} rx={5} />)}
      {state.selection.length === 1 && !editing && scene.periods.filter((period) => state.selection.includes(period.itemId)).map((period) => <g key={period.itemId} data-item-id={period.itemId}>
        {(['start', 'end'] as const).map((edge) => <g key={edge} data-edge={edge} className={styles.edge}>
          <rect x={(edge === 'start' ? period.x0 : period.x1) - 12} y={period.y} width={24} height={24} fill="transparent" />
          <rect className={styles.handle} x={(edge === 'start' ? period.x0 : period.x1) - 4} y={period.y + 4} width={8} height={16} rx={4} />
        </g>)}
      </g>)}
      {marquee && <rect className={styles.marquee} x={Math.min(marquee.start.x, marquee.end.x)} y={Math.min(marquee.start.y, marquee.end.y)} width={Math.abs(marquee.end.x - marquee.start.x)} height={Math.abs(marquee.end.y - marquee.start.y)} />}
      {tooltip?.guide !== null && tooltip && <line className={styles.guide} x1={tooltip.guide} x2={tooltip.guide} y1={0} y2={scene.height} />}
      {!readOnly && <AxisHandles axis={doc.axis} scale={scale} y={scene.baselineY} edit={(index, x) => setAxisMenu({ index, x, date: formatDate(doc.axis.segments[index]!.until) })} />}
    </Frise>
    {!doc.items.length && !readOnly && <div className={styles.empty} style={{ color: resolveToken(theme.rulerInk) }}>
      <Icon name="event" />
      <p className={styles.emptyTitle}>{CANVAS.emptyTitle}</p>
      <p>{CANVAS.emptyHint}</p>
      <p className={styles.emptyKeys}>
        <kbd>E</kbd> {M2.event} <kbd>P</kbd> {M2.period}
      </p>
    </div>}
    {editing && editBox && <input ref={input} className={styles.inline} aria-label={EDITOR.label}
      style={{ left: Math.max(4, Math.min(size.width - 244, editBox.x)), top: editBox.y, width: Math.max(160, Math.min(editBox.width, 320)) }}
      value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })}
      onPointerDown={(event) => event.stopPropagation()} onBlur={() => finishEdit(true)}
      onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); finishEdit(event.key === 'Enter'); } }} />}
    {doc.axis.segments.length === 1 && !readOnly && <div className={styles.axisBounds} style={{ top: scene.height - 30, color: resolveToken(theme.rulerInk) }}>
      {(['start', 'end'] as const).map((edge) => axisEdit?.edge === edge ?
        <input key={edge} ref={axisInput} aria-label={edge === 'start' ? EDITOR.axisStart : EDITOR.axisEnd} value={axisEdit.value}
          onChange={(event) => setAxisEdit({ edge, value: event.target.value })} onPointerDown={(event) => event.stopPropagation()}
          onBlur={() => finishAxis(true)} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); finishAxis(event.key === 'Enter'); } }} /> :
        <button key={edge} aria-label={edge === 'start' ? EDITOR.axisStart : EDITOR.axisEnd} onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setAxisEdit({ edge, value: formatDate(doc.axis[edge]) })}>{formatDate(doc.axis[edge])}</button>)}
    </div>}
    {axisMenu && <div className="axisPopover" style={{ left: Math.max(8, Math.min(size.width - 248, axisMenu.x)), top: Math.max(8, scene.baselineY - 220) }} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <Field label={axisMenu.index === null ? M2.splitAt : M2.boundary} value={axisMenu.date} onCommit={(date) => setAxisMenu({ ...axisMenu, date })} />
      <button onClick={() => { try { const axis = axisMenu.index === null ? splitAxis(state.document.axis, dateInput(axisMenu.date)) : moveAxisBreak(state.document.axis, axisMenu.index, dateInput(axisMenu.date)); commit({ name: 'setAxis', axis }); setAxisMenu(null); } catch (error) { reportError(error); } }}>{axisMenu.index === null ? M2.split : M2.apply}</button>
      {axisMenu.index !== null && <button onClick={() => { commit({ name: 'setAxis', axis: removeAxisBreak(state.document.axis, axisMenu.index!) }); setAxisMenu(null); }}>{M2.removeBreak}</button>}
      <button onClick={() => setAxisMenu(null)}>{EDITOR.close}</button>
    </div>}
    {tooltip && <div className={styles.tooltip} data-snapped={tooltip.guide !== null} style={{ left: Math.min(size.width - 180, tooltip.point.x + 16), top: tooltip.point.y - 36 }}>{tooltip.text}</div>}
  </div>;
}
