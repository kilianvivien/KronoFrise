import { useEffect, useRef, type JSX } from 'react';
import agentSkillUrl from '../agent/kronofrise/SKILL.md?url';
import { AGENT_SKILL, EDITOR } from './strings';
import editorStyles from './Editor.module.css';
import styles from './AgentSkillDialog.module.css';

export function AgentSkillDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);

  return <dialog ref={dialog} className={`${editorStyles.dialog} ${styles.dialog}`}
    aria-labelledby="agent-skill-title" aria-describedby="agent-skill-intro"
    onCancel={onClose} onKeyDown={(event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); onClose();
    }} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <h2 id="agent-skill-title" tabIndex={-1} autoFocus>{AGENT_SKILL.title}</h2>
    <p id="agent-skill-intro" className={styles.intro}>{AGENT_SKILL.intro}</p>
    <ol className={styles.steps}>
      {AGENT_SKILL.steps.map((step) => <li key={step}>{step}</li>)}
    </ol>
    <div className={styles.example}>
      <h3>{AGENT_SKILL.exampleTitle}</h3>
      <blockquote>{AGENT_SKILL.example}</blockquote>
    </div>
    <p className={styles.note}>{AGENT_SKILL.note}</p>
    <div className={`${editorStyles.dialogActions} ${styles.actions}`}>
      <button className={editorStyles.button} onClick={onClose}>{EDITOR.close}</button>
      <a className={`${editorStyles.primary} ${styles.download}`} href={agentSkillUrl} download="SKILL.md">{AGENT_SKILL.download}</a>
    </div>
  </dialog>;
}
