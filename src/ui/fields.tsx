import { useRef, useState, type JSX } from 'react';
import { apply, type Command } from '../core/commands';
import { parseDateInput } from '../core/dates';
import { parseDocument } from '../core/schema';
import type { TitleBlock } from '../core/types';
import { serializeFile } from '../store/fileIO';
import { editorStore } from '../store/editor';
import { EDITOR, M2 } from './strings';
import { PALETTE, resolveBase } from './palette';
import { Icon, type IconName } from './icons';

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
/**
 * Modifie une partie du bloc de titre en repartant de **l'état courant**, pas
 * du document capturé au rendu.
 *
 * Chaque contrôle du bloc écrit l'objet entier ; construit sur une valeur
 * fermée, un réglage validé juste avant peut être écrasé par le suivant — le
 * sous-titre disparaissait alors que son champ le montrait encore. La commande
 * reste une seule étape d'annulation.
 */
export function patchTitleBlock(patch: Partial<TitleBlock>): void {
  const current = editorStore.getState().document.titleBlock;
  if (current === undefined) return;
  const block: TitleBlock = { ...current, ...patch };
  // `undefined` retire la clé plutôt que de la laisser vide dans le fichier.
  for (const key of Object.keys(patch) as (keyof TitleBlock)[]) {
    if (patch[key] === undefined) delete block[key];
  }
  commit({ name: 'setTitleBlock', block });
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
  return <label className="field"><span>{label}</span>{multiline ? <textarea {...props} rows={3} /> : <input {...props} type={type} />}</label>;
}

/** Choix exclusif compact : les trois formes d'une période, une résolution… */
export function Choices<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string; icon?: IconName; text?: string }[];
  onChange: (value: T) => void;
}): JSX.Element {
  return <div className="choiceRow">
    <span>{label}</span>
    <div className="choices" role="group" aria-label={label}>
      {options.map((option) => <button key={option.value} type="button" aria-label={option.label} data-tip={option.label} title={option.label}
        aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
        {option.icon ? <Icon name={option.icon} /> : option.text ?? option.label}
      </button>)}
    </div>
  </div>;
}
export function Colors({ value, onChange, label = M2.color }: { value: string; onChange: (value: string) => void; label?: string }): JSX.Element {
  return <fieldset className="colors"><legend>{label}</legend>{PALETTE.map((color) => <button key={color.id} type="button" aria-label={color.name} title={color.name} aria-pressed={resolveBase(value) === color.base} style={{ background: color.base }} onClick={() => onChange(color.id)} />)}</fieldset>;
}

/**
 * Case à cocher. `wide` met la case avant son libellé, pour les options qui se
 * lisent comme une phrase plutôt que comme une propriété.
 */
export function Check({ label, value, onChange, wide = false }: {
  label: string; value: boolean; onChange: (value: boolean) => void; wide?: boolean;
}): JSX.Element {
  return <label className={wide ? 'check wide' : 'check'}>
    {wide ? <><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></>
      : <><span>{label}</span><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /></>}
  </label>;
}

/** Bouton d'action pleine largeur d'un panneau, avec son icône. */
export function PanelButton({ icon, label, onClick, disabled = false, danger = false, title }: {
  icon: IconName; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; title?: string;
}): JSX.Element {
  return <button type="button" className={danger ? 'panelAction panelDanger' : 'panelAction'} disabled={disabled}
    {...(title === undefined ? {} : { title })} onClick={onClick}>
    <Icon name={icon} />{label}
  </button>;
}
