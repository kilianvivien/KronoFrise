import { useEffect, useRef, type JSX } from 'react';
import { useStore } from 'zustand';
import { dismissInstall, installApp, markInstalled, pwaStore, updateApp } from '../pwa/prompts';
import { EDITOR, PWA } from './strings';
import styles from './PwaPrompts.module.css';

export function PwaPrompts({ hidden, save }: { hidden: boolean; save: () => Promise<boolean> }): JSX.Element | null {
  const state = useStore(pwaStore);
  const busy = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = busy.current;
    if (state.updating) dialog?.showModal();
    else dialog?.close();
    return () => dialog?.close();
  }, [state.updating]);
  const update = state.waiting !== null && !state.updateDismissed;
  const install = state.installMethod !== null && !state.installDismissed;
  if (hidden && !state.updating) return null;
  if (!update && !install && !state.error && !state.updating) return null;
  return <>
    <section className={styles.card} aria-label={update ? PWA.updateTitle : PWA.installTitle} onKeyDown={(event) => event.stopPropagation()}>
      <div role="status">
        <h2>{update ? PWA.updateTitle : PWA.installTitle}</h2>
        <p>{update ? PWA.updateHint : PWA.installHint}</p>
        {!update && state.installMethod === 'ios' && <p>{PWA.iosHint}</p>}
        {!update && state.installMethod === 'safari' && <p>{PWA.safariHint}</p>}
        {!update && (state.installMethod === 'ios' || state.installMethod === 'safari') && <p>{PWA.manualDataHint}</p>}
      </div>
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <div className={styles.actions}>
        <button disabled={state.updating} onClick={() => {
          if (update) pwaStore.setState({ updateDismissed: true, error: null });
          else dismissInstall();
        }}>{!update && !install ? EDITOR.close : PWA.later}</button>
        {update ? <button className={styles.primary} disabled={state.updating} onClick={() => { void updateApp(save); }}>{PWA.update}</button>
          : install && (state.installMethod === 'native'
            ? <button className={styles.primary} onClick={() => { void installApp(); }}>{PWA.install}</button>
            : <button onClick={markInstalled}>{PWA.alreadyInstalled}</button>)}
      </div>
    </section>
    <dialog ref={busy} className={styles.busy} aria-label={PWA.updating} onCancel={(event) => event.preventDefault()}>
      <p role="status">{PWA.updating}</p>
    </dialog>
  </>;
}
