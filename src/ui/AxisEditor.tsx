import { useState, type JSX } from 'react';
import type { Axis } from '../core/types';
import { moveAxisBreak, removeAxisBreak, setAxisBounds, splitAxis } from '../core/axis';
import { DateField } from './DateField';
import { Field, PanelButton, commit, dateInput, reportError } from './fields';
import { M2 } from './strings';

export function AxisEditor({ axis }: { axis: Axis }): JSX.Element {
  const [split, setSplit] = useState('');
  const change = (next: Axis) => commit({ name: 'setAxis', axis: next });
  return <section className="panelSection"><h3>{M2.axis}</h3>
    <DateField label={M2.start} value={axis.start} onChange={(date) => change(setAxisBounds(axis, date, axis.end))} />
    <DateField label={M2.end} value={axis.end} hint onChange={(date) => change(setAxisBounds(axis, axis.start, date))} />
    {axis.segments.length > 1 && axis.segments.map((segment, index) => <div className="segment" key={index}>
      <h4>{M2.segmentName(index + 1)}</h4>
      {index < axis.segments.length - 1 && <DateField label={M2.boundary} value={segment.until} onChange={(date) => change(moveAxisBreak(axis, index, date))} />}
      <Field label={M2.weight} type="number" value={String(Number(segment.weight.toPrecision(6)))} onCommit={(value) => change({ ...axis, segments: axis.segments.map((s, i) => i === index ? { ...s, weight: Number(value) } : s) })} />
      {index < axis.segments.length - 1 && <PanelButton icon="trash" danger label={M2.removeBreak} onClick={() => change(removeAxisBreak(axis, index))} />}
    </div>)}
    <label className="field"><span>{M2.splitAt}</span><input aria-label={M2.splitAt} value={split} onChange={(e) => setSplit(e.target.value)} placeholder="1492" /></label>
    <PanelButton icon="plus" label={M2.addBreak} disabled={axis.segments.length >= 8 || !split.trim()}
      title={axis.segments.length >= 8 ? M2.maxSegments : M2.splitHint}
      onClick={() => { try { change(splitAxis(axis, dateInput(split))); setSplit(''); } catch (error) { reportError(error); } }} />
  </section>;
}
