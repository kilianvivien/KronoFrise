import { useRef, type JSX } from 'react';
import { useStore } from 'zustand';
import { toFractionalYear } from '../core/dates';
import { makeScale, type ScaleInsets } from '../layout/scale';
import { editorStore } from '../store/editor';
import { resolveBase } from './palette';
import { clampPan, panLimits } from './camera';
import { M2 } from './strings';

export function Minimap({ width, zoom, pan, setPan, insets }: { insets: ScaleInsets; width: number; zoom: number; pan: number; setPan: (pan: number) => void }): JSX.Element {
  const doc = useStore(editorStore, (state) => state.preview ?? state.document);
  const drag = useRef<{ offset: number } | null>(null);
  const full = makeScale(doc.axis, width, 0, 1, insets), view = makeScale(doc.axis, width, pan, zoom, insets);
  const left = full.timeToX(view.xToTime(0)), right = full.timeToX(view.xToTime(width));
  const limits = panLimits(view);
  const go = (x: number) => setPan(clampPan(view, makeScale(doc.axis, width, 0, zoom, insets).timeToX(full.xToTime(x)) - width / 2));
  return <div className="minimap" role="slider" aria-label={M2.minimap} aria-valuemin={Math.round(limits.min)} aria-valuemax={Math.round(limits.max)} aria-valuenow={Math.round(pan)} tabIndex={0}
    onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); setPan(e.key === 'Home' ? 0 : e.key === 'End' ? view.maxPan() : clampPan(view, pan + (e.key === 'ArrowLeft' ? -1 : 1) * width / 4)); } }}
    onPointerDown={(e) => { const x = e.clientX - e.currentTarget.getBoundingClientRect().left; drag.current = { offset: x >= left && x <= right ? x - (left + right) / 2 : 0 }; e.currentTarget.setPointerCapture(e.pointerId); if (x < left || x > right) go(x); }}
    onPointerMove={(e) => { if (drag.current) { go(e.clientX - e.currentTarget.getBoundingClientRect().left - drag.current.offset); } }} onPointerUp={(e) => { drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
    <svg width="100%" height="64" viewBox={`0 0 ${width} 64`} aria-hidden="true">
      <rect className="minimapTrack" x={0} y={4} width={width} height={48} rx={4} />
      {doc.items.map((item) => { const y = 10 + doc.lanes.findIndex((l) => l.id === item.laneId) * 38 / Math.max(doc.lanes.length, 1); const x = full.timeToX(toFractionalYear(item.kind === 'event' ? item.date : item.start)); return item.kind === 'event' ? <line key={item.id} x1={x} x2={x} y1={y} y2={y + 10} stroke={resolveBase(item.color)} strokeWidth={2} /> : <rect key={item.id} x={x} y={y} width={Math.max(1, full.timeToX(toFractionalYear(item.end)) - x)} height={8} fill={resolveBase(item.color)} opacity={.6} />; })}
      <rect className="minimapView" x={left} y={4} width={Math.max(right - left, 4)} height={48} rx={4} />
    </svg>
  </div>;
}
