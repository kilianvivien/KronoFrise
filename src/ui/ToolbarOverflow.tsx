import { useEffect, useId, useRef, type JSX } from 'react';
import { Icon, type IconName } from './icons';
import { EDITOR } from './strings';
import styles from './Editor.module.css';

export interface ToolbarAction {
  label: string;
  icon: IconName;
  disabled?: boolean;
  pressed?: boolean;
  run: () => void;
}

export function ToolbarOverflow({ groups, compact }: { groups: { label: string; actions: ToolbarAction[] }[]; compact: boolean }): JSX.Element {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const close = () => { popover.current?.hidePopover(); trigger.current?.focus(); };
  useEffect(() => {
    if (!compact) popover.current?.hidePopover();
  }, [compact]);
  return <>
    <button ref={trigger} data-toolbar-overflow className={`${styles.icon} ${styles.overflowTrigger}`} popoverTarget={id}
      aria-label={EDITOR.toolbarOverflow} title={EDITOR.toolbarOverflow} data-tour="present-mode"><Icon name="more" /></button>
    <div ref={popover} id={id} popover="auto" className={styles.toolbarPopover} role="dialog" aria-label={EDITOR.toolbarOverflow}
      onToggle={(event) => { if (event.nativeEvent.newState === 'open') popover.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus(); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); close(); }
      }}>
      <div className={styles.overflowHeading}><h2>{EDITOR.toolbarOverflow}</h2><button aria-label={EDITOR.close} onClick={close}><Icon name="close" /></button></div>
      {groups.map((group) => <div className={styles.overflowGroup} role="group" aria-label={group.label} key={group.label}>
        <h3>{group.label}</h3>
        {group.actions.map((action) => <button key={action.label} disabled={action.disabled} aria-pressed={action.pressed}
          onClick={() => { close(); action.run(); }}><Icon name={action.icon} /><span>{action.label}</span>{action.pressed && <Icon name="check" />}</button>)}
      </div>)}
    </div>
  </>;
}
