import { useId, useRef, type JSX } from 'react';
import { useStore } from 'zustand';
import { appearanceStore, chooseAppearance, type Appearance } from '../store/appearance';
import { APPEARANCE, EDITOR } from './strings';
import styles from './AppearancePicker.module.css';

const choices: Appearance[] = ['terracotta', 'light', 'dark', 'system'];
export function AppearancePicker(): JSX.Element {
  const { preference, saved } = useStore(appearanceStore);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const close = (element: HTMLElement) => { element.hidePopover(); trigger.current?.focus(); };
  return <>
    <button ref={trigger} className={styles.trigger} popoverTarget={id} aria-label={APPEARANCE.title} title={APPEARANCE.title}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5v11a5.5 5.5 0 0 0 0-11" fill="currentColor" stroke="none" /></svg>
    </button>
    <div id={id} popover="auto" className={styles.popover} role="dialog" aria-labelledby={`${id}-title`}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(event.currentTarget); } }}
      onToggle={(event) => { if (event.nativeEvent.newState === 'open') event.currentTarget.querySelector<HTMLInputElement>('input:checked')?.focus(); }}>
      <div className={styles.heading}><h2 id={`${id}-title`}>{APPEARANCE.title}</h2><button className={styles.close} aria-label={EDITOR.close} onClick={(event) => { const popover = event.currentTarget.closest<HTMLElement>('[popover]'); if (popover) close(popover); }}>×</button></div>
      <fieldset className={styles.choices}><legend className={styles.srOnly}>{APPEARANCE.title}</legend>
        {choices.map((choice) => <label key={choice} className={styles.choice}>
          <input type="radio" name={`${id}-appearance`} value={choice} checked={preference === choice} onChange={() => chooseAppearance(choice)} onKeyDown={(event) => {
            const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
            if (!direction && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault(); event.stopPropagation();
            const next = choices[event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (choices.indexOf(choice) + direction + choices.length) % choices.length]!;
            chooseAppearance(next);
            event.currentTarget.closest('fieldset')?.querySelector<HTMLInputElement>(`input[value="${next}"]`)?.focus();
          }} />
          <span className={styles.preview} data-preview={choice} aria-hidden="true"><i /><b /><em /></span>
          <span className={styles.choiceName}>{APPEARANCE[choice]}<span className={styles.check} aria-hidden="true">✓</span></span>
        </label>)}
      </fieldset>
      <p>{APPEARANCE.hint}</p>
      {preference === 'terracotta' && <p>{APPEARANCE.terracottaHint}</p>}
      {preference === 'system' && <p>{APPEARANCE.systemHint}</p>}
      {!saved && <p role="status">{APPEARANCE.storageWarning}</p>}
    </div>
  </>;
}
