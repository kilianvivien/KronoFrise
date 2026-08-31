import { useEffect, useRef, useState, type JSX } from 'react';
import { redistributeAxis } from '../core/axis';
import type { Axis } from '../core/types';
import type { Scale } from '../layout/scale';
import { editorStore } from '../store/editor';
import { M2 } from './strings';

export function AxisHandles({ axis, scale, y, edit }: { axis: Axis; scale: Scale; y: number; edit: (index: number, x: number) => void }): JSX.Element {
  const drag = useRef<{ pointerId: number; index: number; x: number; width: number; share: number; axis: Axis; next: Axis } | null>(null);
  const [active, setActive] = useState(false);
  const finish = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null; setActive(false);
    const state = editorStore.getState();
    if (state.preview && d.next !== d.axis) state.dispatch({ name: 'setAxis', axis: d.next });
    else state.previewCommand(null);
  };
  const cancel = () => { if (!drag.current) return; drag.current = null; setActive(false); editorStore.getState().previewCommand(null); };
  useEffect(() => {
    // Finalize before SVG retargeting/lost capture can swallow the release.
    const move = (event: PointerEvent) => {
      const d = drag.current; if (!d || d.pointerId !== event.pointerId) return;
      d.next = redistributeAxis(d.axis, d.index, d.share + (event.clientX - d.x) / d.width);
      editorStore.getState().previewCommand({ name: 'setAxis', axis: d.next });
    };
    const up = (event: PointerEvent) => { if (drag.current?.pointerId === event.pointerId) finish(); };
    const abort = (event: Event) => { if (event.type === 'blur' || ('pointerId' in event && event.pointerId === drag.current?.pointerId)) cancel(); };
    window.addEventListener('blur', abort); window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', abort, true);
    return () => { window.removeEventListener('blur', abort); window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', abort, true); };
  }, []);
  return <g>{axis.segments.slice(0, -1).map((segment, index) => {
    const left = scale.segments[index]!, right = scale.segments[index + 1]!;
    const x = (left.x1 + right.x0) / 2 - scale.pan;
    return <g key={index} className="axisHandle" role="slider" aria-label={M2.resizeBoundary(index + 1)} aria-valuemin={2} aria-valuemax={98} aria-valuenow={Math.round(100 * segment.weight / (segment.weight + axis.segments[index + 1]!.weight))} tabIndex={0}
      onDoubleClick={(e) => { e.stopPropagation(); edit(index, x); }}
      onPointerDown={(e) => { e.stopPropagation(); if (drag.current || e.button !== 0 || editorStore.getState().preview) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.focus(); drag.current = { pointerId: e.pointerId, index, x: e.clientX, width: left.x1 - left.x0 + right.x1 - right.x0, share: segment.weight / (segment.weight + axis.segments[index + 1]!.weight), axis, next: axis }; setActive(true); }}

      onPointerUp={(e) => { e.stopPropagation(); if (drag.current?.pointerId === e.pointerId) finish(); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
      onPointerCancel={(e) => { if (drag.current?.pointerId === e.pointerId) cancel(); }} onLostPointerCapture={(e) => { if (drag.current?.pointerId === e.pointerId) cancel(); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); cancel(); }
        if (e.key === 'Enter') { e.stopPropagation(); edit(index, x); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); editorStore.getState().dispatch({ name: 'setAxis', axis: redistributeAxis(axis, index, segment.weight / (segment.weight + axis.segments[index + 1]!.weight) + (e.key === 'ArrowLeft' ? -.02 : .02)) }); }
      }}>
      <rect x={x - 12} y={y - 14} width={24} height={28} fill="transparent" />
      <rect x={x - 4} y={y - 12} width={8} height={24} rx={4} fill="var(--field-bg)" stroke="var(--accent)" opacity={active ? 1 : .8} />
    </g>;
  })}</g>;
}
