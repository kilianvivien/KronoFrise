/**
 * Mise en route d'une frise vide — demande de Kilian (31 août 2026).
 *
 * Une frise neuve arrivait sur le siècle écoulé, et l'enseignant devait
 * deviner où régler ses bornes. La boîte pose les trois seules questions qui
 * ne peuvent pas attendre : le titre, le début, la fin. Les champs de date
 * sont les mêmes que dans l'inspecteur (`DateField`), aide à la saisie
 * comprise — on apprend le geste ici, on le retrouve là-bas.
 *
 * Rien n'est écrit tant qu'on n'a pas validé, et ce qui l'est tient dans une
 * seule commande : une annulation ramène la frise telle qu'elle était.
 */
import { useEffect, useRef, useState, type JSX } from 'react';
import { useStore } from 'zustand';
import { setAxisBounds } from '../core/axis';
import { compareDates, formatDate, formatSpan, toFractionalYear } from '../core/dates';
import { greatPeriodRanges } from '../core/presets';
import type { KDate } from '../core/types';
import { editorStore } from '../store/editor';
import { commit } from './fields';
import { DateField } from './DateField';
import { DATE_INPUT, EDITOR, SETUP } from './strings';
import styles from './Editor.module.css';

export function SetupDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const doc = useStore(editorStore, (state) => state.document);
  const dialog = useRef<HTMLDialogElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState<KDate>(doc.axis.start);
  const [end, setEnd] = useState<KDate>(doc.axis.end);
  const suggestions = useRef(greatPeriodRanges()).current;

  useEffect(() => { dialog.current?.showModal(); name.current?.focus(); }, []);

  const ordered = compareDates(end, start) > 0;
  const span = Math.round(toFractionalYear(end) - toFractionalYear(start));

  const create = (): void => {
    if (!ordered) return;
    const trimmed = title.trim();
    commit({
      name: 'batch', label: 'setupDocument', commands: [
        ...(trimmed ? [{ name: 'setTitle' as const, title: trimmed }] : []),
        { name: 'setAxis', axis: setAxisBounds(doc.axis, start, end) },
      ],
    });
    onClose();
  };

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="setup-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); onClose();
    }}>
    <h2 id="setup-title">{SETUP.title}</h2>
    <form className="setupForm" onSubmit={(event) => { event.preventDefault(); create(); }}>
      <p>{SETUP.intro}</p>

      <label className="field stack">
        <span>{SETUP.name}</span>
        <input ref={name} aria-label={SETUP.name} value={title} placeholder={SETUP.namePlaceholder}
          onChange={(event) => setTitle(event.target.value)} />
      </label>

      <div className="setupBounds">
        <DateField stack label={SETUP.start} value={start} onChange={setStart} />
        <DateField stack label={SETUP.end} value={end} onChange={setEnd} />
      </div>
      {/* Un seul rappel des formats pour les deux bornes : le répéter par
          colonne le serrait en trois lignes sous la seule « Fin ». */}
      <p className="dateHint setupFormats">{DATE_INPUT.hint}</p>

      <fieldset className="setupSuggestions">
        <legend>{SETUP.suggestions}</legend>
        <div className="setupChips">
          {suggestions.map((range) => <button key={range.name} type="button"
            aria-pressed={compareDates(start, range.start) === 0 && compareDates(end, range.end) === 0}
            onClick={() => { setStart(range.start); setEnd(range.end); }}>{range.name}</button>)}
        </div>
        <p>{SETUP.suggestionsHint}</p>
      </fieldset>

      <p className={ordered ? 'setupSummary' : 'setupSummary invalid'} role="status">
        {ordered
          ? SETUP.summary(EDITOR.range(formatDate(start), formatDate(end)), formatSpan(span))
          : SETUP.endBeforeStart}
      </p>

      <div className={styles.dialogActions}>
        <button type="button" className={styles.button} onClick={onClose}>{SETUP.skip}</button>
        <button type="submit" className={styles.primary} disabled={!ordered}>{SETUP.create}</button>
      </div>
    </form>
  </dialog>;
}
