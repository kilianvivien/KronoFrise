/**
 * Champ de date guidé — demande de Kilian (31 août 2026).
 *
 * Le champ texte accepte toujours ce que `parseDateInput` comprend ; ce qui
 * s'ajoute ici, c'est de ne *pas* avoir à le savoir. Deux boutons d'ère
 * remplacent la convention « av. J.-C. », quatre boutons décalent la date d'un
 * siècle ou d'un millénaire. Les trois contrôles écrivent la même `KDate`, et
 * chaque clic reste une commande annulable — l'appelant décide laquelle.
 *
 * Un brouillon en cours n'est jamais perdu par un clic sur les boutons : il
 * est analysé d'abord, et sert de point de départ au décalage.
 */
import { useRef, useState, type JSX } from 'react';
import { formatDate, isBc, parseDateInput, shiftYears, withEra } from '../core/dates';
import type { KDate } from '../core/types';
import { reportError } from './fields';
import { DATE_INPUT, EDITOR } from './strings';

/** Décalages proposés : le siècle et le millénaire, dans les deux sens. */
const STEPS = [-1000, -100, 100, 1000] as const;

export function DateField({ label, value, onChange, stack = false, hint = false }: {
  label: string;
  value: KDate;
  onChange: (date: KDate) => void;
  /** libellé au-dessus du champ plutôt qu'à sa gauche (boîte de mise en route) */
  stack?: boolean;
  /** rappelle les formats acceptés sous les boutons */
  hint?: boolean;
}): JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);
  const done = useRef(false);

  const change = (date: KDate): void => {
    if (date === value) return;
    try { onChange(date); } catch (error) { reportError(error); }
  };
  /** Le brouillon fait foi s'il est lisible ; sinon la valeur en place. */
  const current = (): KDate => (draft === null ? value : parseDateInput(draft) ?? value);
  const finish = (): void => {
    if (done.current) return;
    done.current = true;
    const text = draft;
    setDraft(null);
    if (text === null || text === formatDate(value)) return;
    const date = parseDateInput(text);
    if (date === null) { reportError(new Error(EDITOR.invalidDate)); return; }
    change(date);
  };
  const act = (next: (date: KDate) => KDate) => () => {
    const date = next(current());
    setDraft(null); done.current = true;
    change(date);
  };
  /**
   * Le clic agit sans prendre le focus : la saisie reste dans le champ, où l'on
   * relit la date qu'on vient de décaler. `onClick` sert quand même l'action,
   * donc Entrée et Espace au clavier fonctionnent comme partout.
   */
  const keepFocus = (event: React.MouseEvent): void => event.preventDefault();
  const bc = isBc(current().year);

  return <div className={stack ? 'dateField stack' : 'dateField'}>
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        value={draft ?? formatDate(value)}
        title={DATE_INPUT.hint}
        onFocus={() => { done.current = false; }}
        onChange={(event) => { done.current = false; setDraft(event.target.value); }}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { done.current = true; setDraft(null); event.currentTarget.blur(); }
          if (event.key === 'Enter') { event.preventDefault(); finish(); event.currentTarget.blur(); }
        }}
      />
    </label>
    <div className="dateTools">
      <div className="choices" role="group" aria-label={DATE_INPUT.era}>
        <button type="button" aria-pressed={bc} title={DATE_INPUT.bcLong}
          onMouseDown={keepFocus} onClick={act((date) => withEra(date, true))}>{DATE_INPUT.bc}</button>
        <button type="button" aria-pressed={!bc} title={DATE_INPUT.adLong}
          onMouseDown={keepFocus} onClick={act((date) => withEra(date, false))}>{DATE_INPUT.ad}</button>
      </div>
      <div className="dateSteps" role="group" aria-label={DATE_INPUT.shift}>
        {STEPS.map((step) => <button key={step} type="button"
          aria-label={step < 0 ? DATE_INPUT.earlier(-step) : DATE_INPUT.later(step)}
          title={step < 0 ? DATE_INPUT.earlier(-step) : DATE_INPUT.later(step)}
          onMouseDown={keepFocus} onClick={act((date) => shiftYears(date, step))}>
          {step < 0 ? `−${-step}` : `+${step}`}
        </button>)}
      </div>
      {hint && <p className="dateHint">{DATE_INPUT.hint}</p>}
    </div>
  </div>;
}
