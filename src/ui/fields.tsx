import { useRef, useState, type JSX } from 'react';
import { apply, type Command } from '../core/commands';
import { parseDateInput } from '../core/dates';
import { parseDocument } from '../core/schema';
import { serializeFile } from '../store/fileIO';
import { editorStore } from '../store/editor';
import { EDITOR, M2 } from './strings';
import { PALETTE, resolveBase } from './palette';

export function reportError(error: unknown): void {
  editorStore.setState({ error: error instanceof Error ? error.message : EDITOR.fileError });
}
export function commit(command: Command): void {
  const state = editorStore.getState();
  if (!state.ready || state.preview) return;
  const next = parseDocument(apply(state.document, command));
  if (command.name === 'updateItems' && command.patches.some(({ patch }) => patch.image)) serializeFile(next);
  state.dispatch(command);
}
export function dateInput(value: string) {
  const date = parseDateInput(value);
  if (!date) throw new Error(EDITOR.invalidDate);
  return date;
}
/** Local drafts never enter the undo stack; blur/Enter commit once. */
export function Field({ label, value, onCommit, multiline = false, type = 'text' }: {
  label: string; value: string; onCommit: (value: string) => void; multiline?: boolean; type?: string;
}): JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    if (draft !== null && draft !== value) { try { onCommit(draft); } catch (error) { reportError(error); } }
    setDraft(null);
  };
  const props = { 'aria-label': label, value: draft ?? value, onFocus: () => { done.current = false; },
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { done.current = false; setDraft(e.target.value); },
    onBlur: finish, onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { done.current = true; setDraft(null); (e.target as HTMLElement).blur(); }
      if (e.key === 'Enter' && !multiline) { e.preventDefault(); finish(); (e.target as HTMLElement).blur(); }
    } };
  return <label className="field">{label}{multiline ? <textarea {...props} rows={3} /> : <input {...props} type={type} />}</label>;
}
export function Colors({ value, onChange, label = M2.color }: { value: string; onChange: (value: string) => void; label?: string }): JSX.Element {
  return <fieldset className="colors"><legend>{label}</legend>{PALETTE.map((color) => <button key={color.id} type="button" aria-label={color.name} title={color.name} aria-pressed={resolveBase(value) === color.base} style={{ background: color.base }} onClick={() => onChange(color.id)} />)}</fieldset>;
}
export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }): JSX.Element {
  return <label className="check"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}
