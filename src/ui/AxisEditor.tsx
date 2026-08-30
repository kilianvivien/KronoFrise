import { useState, type JSX } from 'react';
import type { Axis } from '../core/types';
import { formatDate } from '../core/dates';
import { moveAxisBreak, removeAxisBreak, setAxisBounds, splitAxis } from '../core/axis';
import { Field, commit, dateInput, reportError } from './fields';
import { M2 } from './strings';

export function AxisEditor({ axis }: { axis: Axis }): JSX.Element {
  const [split, setSplit] = useState('');
  const change = (next: Axis) => commit({ name: 'setAxis', axis: next });
  return <section className="panelSection"><h3>{M2.axis}</h3>
    <Field label={M2.start} value={formatDate(axis.start)} onCommit={(value) => change(setAxisBounds(axis, dateInput(value), axis.end))} />
    <Field label={M2.end} value={formatDate(axis.end)} onCommit={(value) => change(setAxisBounds(axis, axis.start, dateInput(value)))} />
    {axis.segments.map((segment, index) => <div className="segment" key={index}>
      <h4>{M2.segmentName(index + 1)}</h4>
      {index < axis.segments.length - 1 && <Field label={M2.boundary} value={formatDate(segment.until)} onCommit={(value) => change(moveAxisBreak(axis, index, dateInput(value)))} />}
      <Field label={M2.weight} type="number" value={String(Number(segment.weight.toPrecision(6)))} onCommit={(value) => change({ ...axis, segments: axis.segments.map((s, i) => i === index ? { ...s, weight: Number(value) } : s) })} />
      {index < axis.segments.length - 1 && <button onClick={() => change(removeAxisBreak(axis, index))}>{M2.removeBreak}</button>}
    </div>)}
    <label className="field">{M2.splitAt}<input aria-label={M2.splitAt} value={split} onChange={(e) => setSplit(e.target.value)} placeholder="1492" /></label>
    <button disabled={axis.segments.length >= 8 || !split.trim()} onClick={() => { try { change(splitAxis(axis, dateInput(split))); setSplit(''); } catch (error) { reportError(error); } }}>{M2.addBreak}</button>
  </section>;
}
