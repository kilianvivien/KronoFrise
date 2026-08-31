/**
 * Panneau « Fiche élève » — PLAN.md §3.5.
 *
 * Masquer n'altère jamais le document (docs/format.md §5) : chaque bouton
 * produit une commande annulable, et le corrigé est un simple drapeau de vue.
 */
import type { JSX } from 'react';
import { useStore } from 'zustand';
import { clearMasks, maskAll, maskRandom, setMask } from '../core/pedagogy';
import { maskOf } from '../core/document';
import type { MaskKind } from '../core/types';
import { editorStore } from '../store/editor';
import { Check, commit } from './fields';
import { WORKSHEET } from './strings';

const CHOICES: { value: MaskKind | null; label: string }[] = [
  { value: null, label: WORKSHEET.hideNothing },
  { value: 'label', label: WORKSHEET.hideLabel },
  { value: 'date', label: WORKSHEET.hideDate },
  { value: 'both', label: WORKSHEET.hideBoth },
];

export function Worksheet({ answerKey, onAnswerKey }: { answerKey: boolean; onAnswerKey: (value: boolean) => void }): JSX.Element {
  const state = useStore(editorStore);
  const doc = state.document;
  const selected = doc.items.filter((item) => state.selection.includes(item.id));
  // Une sélection multiple n'affiche un choix coché que si elle est unanime.
  const common = selected.length
    ? selected.every((item) => maskOf(doc, item.id) === maskOf(doc, selected[0]!.id))
      ? maskOf(doc, selected[0]!.id) ?? null
      : undefined
    : undefined;

  return <>
    <section className="panelSection">
      <h3>{WORKSHEET.masking}</h3>
      <p>{WORKSHEET.counted(doc.pedagogy.maskedItems.length, doc.items.length)}</p>
      <div className="worksheetActions">
        <button disabled={!doc.items.length} onClick={() => commit(maskAll(doc, 'label'))}>{WORKSHEET.maskLabels}</button>
        <button disabled={!doc.items.length} onClick={() => commit(maskAll(doc, 'date'))}>{WORKSHEET.maskDates}</button>
        <button disabled={!doc.items.length} onClick={() => commit(maskRandom(doc, 0.5))}>{WORKSHEET.maskHalf}</button>
        <button disabled={!doc.pedagogy.maskedItems.length} onClick={() => commit(clearMasks())}>{WORKSHEET.showAll}</button>
      </div>
      <Check label={WORKSHEET.answerKey} value={answerKey} onChange={onAnswerKey} />
      <p>{WORKSHEET.answerKeyHint}</p>
    </section>
    <section className="panelSection">
      <h3>{WORKSHEET.hide}</h3>
      {selected.length === 0 ? <p>{WORKSHEET.hint}</p> : <fieldset className="worksheetChoices">
        <legend>{WORKSHEET.hide}</legend>
        {CHOICES.map((choice) => <button key={choice.label} type="button" aria-pressed={common === choice.value}
          onClick={() => commit(selected.length === 1
            ? setMask(selected[0]!.id, choice.value)
            : { name: 'batch', label: 'setMasks', commands: selected.map((item) => setMask(item.id, choice.value)) })}>
          {choice.label}
        </button>)}
      </fieldset>}
    </section>
  </>;
}
