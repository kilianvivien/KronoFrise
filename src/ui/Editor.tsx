import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useStore } from 'zustand';
import { addItems, deleteItems, setLane } from '../core/commands';
import { axisCovering } from '../core/axis';
import { formatDate } from '../core/dates';
import { datePrecision, moveSelection, nudgeStep, selectedStart } from './canvasMath';
import { csvItems } from '../core/importers';
import { newId } from '../core/ids';
import { editorStore } from '../store/editor';
import { openFile, saveFile } from '../store/fileIO';
import { startPersistence } from '../store/persistence';
import { APP_LINKS, CONFIRM, DOC, EDITOR, EXPORT, LIBRARY, M2, TOOLBAR, WORKSHEET } from './strings';
import { EditorCanvas, type Tool } from './EditorCanvas';
import { useThumbnail } from './useThumbnail';
import styles from './Editor.module.css';
import { fitInsets } from '../layout/fit';
import { canvasMeasurer } from './measureText';
import { makeScale } from '../layout/scale';
import { clampPan } from './camera';
import { AppearancePicker } from './AppearancePicker';
import { Tutorial } from './Tutorial';
import { appearanceStore, setTutorialDone } from '../store/appearance';
import { TUTORIAL } from './strings';
import { Icon, type IconName } from './icons';
import { Inspector } from './Inspector';
import type { Mode } from './mode';
import { Presentation } from './Presentation';
import { Library } from './Library';
import { ExportDialog } from './ExportDialog';
import { AgentSkillDialog } from './AgentSkillDialog';
import { SetupDialog } from './SetupDialog';
import { Outline } from './Outline';
import { Minimap } from './Minimap';
import { PwaPrompts } from './PwaPrompts';
import { ToolbarOverflow } from './ToolbarOverflow';
import { useToolbarOverflow } from './useToolbarOverflow';
import './panels.css';

function editable(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('input,textarea,select,[contenteditable=true],dialog');
}
/**
 * Sélection sur laquelle agit le clavier.
 *
 * Une commande qui vide la sélection — une annulation, l'ajout d'une bande —
 * laissait l'anneau de focus sur un élément que les flèches ne déplaçaient
 * plus : l'anneau mentait. On rétablit donc la sélection depuis le focus réel.
 */
function keyboardSelection(): readonly string[] {
  const current = editorStore.getState();
  if (current.selection.length) return current.selection;
  const active = document.activeElement;
  const id = active instanceof Element ? active.closest('[data-item-id]')?.getAttribute('data-item-id') : null;
  if (id !== null && id !== undefined && current.document.items.some((item) => item.id === id)) {
    current.select([id]);
    return [id];
  }
  return [];
}
export function Editor(): JSX.Element {
  const toolbar = useToolbarOverflow();
  const state = useStore(editorStore);
  const [tool, setTool] = useState<Tool>('auto');
  const [mode, setMode] = useState<Mode>('edit');
  const [answerKey, setAnswerKey] = useState(false);
  const [library, setLibrary] = useState(false);
  const tutorialDone = useStore(appearanceStore, (value) => value.tutorialDone);
  const [tutorial, setTutorial] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [agentSkill, setAgentSkill] = useState(false);
  const [setup, setSetup] = useState(false);
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState(0);
  const [sidebar, setSidebar] = useState(() => !window.matchMedia('(max-width: 1100px)').matches);
  const [inspector, setInspector] = useState(() => !window.matchMedia('(max-width: 1100px)').matches);
  const toggleSidebar = useCallback(() => {
    setSidebar((value) => !value);
    if (window.matchMedia('(max-width: 1100px)').matches) setInspector(false);
  }, []);
  const toggleInspector = useCallback(() => {
    setInspector((value) => !value);
    if (window.matchMedia('(max-width: 1100px)').matches) setSidebar(false);
  }, []);
  const revealInspector = useCallback(() => {
    setInspector(true);
    if (window.matchMedia('(max-width: 1100px)').matches) setSidebar(false);
  }, []);
  const [laneId, setLaneId] = useState<string | null>(null);
  const [focusItem, setFocusItem] = useState<{ id: string; serial: number } | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const insets = useMemo(() => fitInsets(state.document, canvasWidth, canvasMeasurer), [state.document, canvasWidth]);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [title, setTitle] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const exportedRevision = useRef(-1);
  const flush = useRef<() => Promise<void>>(async () => {});
  const titleInput = useRef<HTMLInputElement>(null);
  const modeRef = useRef<Mode>('edit');
  const finishingTitle = useRef(false);
  useThumbnail(state.document, state.ready, state.revision);
  modeRef.current = mode;

  useEffect(() => {
    const compact = window.matchMedia('(max-width: 1100px)');
    const changed = () => { if (compact.matches) { setSidebar(false); setInspector(false); } };
    compact.addEventListener('change', changed);
    return () => compact.removeEventListener('change', changed);
  }, []);

  useEffect(() => {
    const persistence = startPersistence(editorStore); flush.current = persistence.flush;
    const hide = () => { if (document.visibilityState === 'hidden') void persistence.flush(); };
    const unload = (event: BeforeUnloadEvent) => {
      const current = editorStore.getState();
      void persistence.flush();
      if (current.ready && current.revision !== current.savedRevision) event.preventDefault();
    };
    document.addEventListener('visibilitychange', hide); window.addEventListener('beforeunload', unload);
    return () => { persistence.stop(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('beforeunload', unload); };
  }, []);
  useEffect(() => { if (title !== null) { finishingTitle.current = false; titleInput.current?.focus(); titleInput.current?.select(); } }, [title !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (deleting.length) dialog.current?.showModal(); else dialog.current?.close(); }, [deleting]);
  // Une confirmation s'efface d'elle-même ; une erreur attend d'être lue.
  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Première visite : la prise en main s'ouvre dès que la frise est prête,
  // jamais sur l'écran de chargement.
  useEffect(() => { if (state.ready && !tutorialDone) setTutorial(true); }, [state.ready, tutorialDone]);

  const scale = useMemo(() => makeScale(state.document.axis, canvasWidth, pan, zoom, insets), [state.document.axis, canvasWidth, pan, zoom, insets]);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const fit = () => { setZoom(1); setPan(0); };
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const stepZoom = useCallback((factor: number) => {
    // SPEC? Toolbar zoom anchors the viewport centre; wheel zoom anchors the pointer.
    const current = scaleRef.current, width = current.width;
    const next = Math.max(1, Math.min(5000, current.zoom * factor));
    const nextScale = makeScale(editorStore.getState().document.axis, width, 0, next, insets);
    setPan(clampPan(nextScale, nextScale.timeToX(current.xToTime(width / 2)) - width / 2)); setZoom(next);
  }, [insets]);
  // La barre d'état est un `role="status"` : nommer l'élément unique y fait
  // annoncer sa date à chaque décalage aux flèches, sinon le clavier déplaçait
  // en silence.
  const selectedLabel = useMemo(() => {
    if (state.selection.length !== 1) return null;
    const item = state.document.items.find((candidate) => candidate.id === state.selection[0]);
    if (!item) return null;
    return item.kind === 'event'
      ? EDITOR.eventAccessible(item.label, formatDate(item.date))
      : EDITOR.periodAccessible(item.label, EDITOR.range(formatDate(item.start), formatDate(item.end)));
  }, [state.selection, state.document.items]);
  const worksheet = mode === 'worksheet';
  const changeMode = (next: Mode) => { setMode(next); setTool('auto'); if (next !== 'worksheet') setAnswerKey(false); };
  const error = useCallback((cause: unknown) => {
    editorStore.setState({ error: cause instanceof Error ? cause.message : EDITOR.fileError });
  }, []);
  const preserveCurrent = useCallback(async () => {
    await flush.current();
    const current = editorStore.getState();
    return current.savedRevision === current.revision || exportedRevision.current === current.revision;
  }, []);
  const open = useCallback(async () => {
    try {
      const document = await openFile();
      if (document && await preserveCurrent()) { editorStore.getState().replace(document); setZoom(1); setPan(0); }
    } catch (cause) { error(cause); }
  }, [error, preserveCurrent]);
  const saveBeforeUpdate = useCallback(async () => {
    await flush.current();
    const current = editorStore.getState();
    return current.ready && current.preview === null && current.savedRevision === current.revision;
  }, []);
  const save = useCallback(async () => {
    try { const current = editorStore.getState(); if (await saveFile(current.document)) { exportedRevision.current = current.revision; await flush.current(); setNotice(EDITOR.fileSaved); } }
    catch (cause) { error(cause); }
  }, [error]);
  const remove = useCallback(() => {
    const current = editorStore.getState();
    if (current.selection.length >= 2) setDeleting(current.selection);
    else if (current.selection.length) { current.dispatch(deleteItems(current.document, current.selection)); current.select([]); }
  }, []);
  const duplicate = useCallback(() => {
    const current = editorStore.getState();
    const items = current.document.items.filter((item) => current.selection.includes(item.id)).map((item) => ({ ...item, id: newId() }));
    if (items.length) { current.dispatch(addItems(current.document, items)); current.select(items.map((item) => item.id)); }
  }, []);
  // PLAN.md §3.2 : les flèches décalent la sélection d'une graduation, ⇧ de dix.
  // Le pas se lit dans la règle affichée, donc il suit le zoom et le segment.
  const nudge = useCallback((direction: -1 | 1, times: number) => {
    const selection = keyboardSelection();
    const current = editorStore.getState();
    const anchor = selection.map((id) => selectedStart(current.document, id)).find((date) => date !== undefined);
    if (!anchor) return;
    const delta = nudgeStep(scaleRef.current, anchor) * times * direction;
    current.dispatch(moveSelection(current.document, selection, delta, datePrecision(anchor)));
  }, []);
  // SPEC? Le glissement vertical change de bande (PLAN.md §3.3.4) ; au clavier,
  // c'est ↑/↓ — sans équivalent, la sélection multi-bandes serait bloquée.
  const shiftLane = useCallback((direction: -1 | 1) => {
    const selection = keyboardSelection();
    const current = editorStore.getState();
    const lanes = current.document.lanes;
    const selected = current.document.items.filter((item) => selection.includes(item.id));
    if (!selected.length || lanes.length < 2) return;
    const from = Math.min(...selected.map((item) => lanes.findIndex((lane) => lane.id === item.laneId)));
    const target = lanes[Math.max(0, Math.min(lanes.length - 1, from + direction))];
    if (!target || selected.every((item) => item.laneId === target.id)) return;
    current.dispatch(setLane(selection, target.id));
  }, []);
  // Coller un tableau (docs/format.md §8.2) ajoute des éléments à la frise
  // ouverte : c'est une commande, donc annulable, et rien n'est remplacé.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (editable(event.target) || modeRef.current !== 'edit') return;
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!text.includes(';') && !text.includes('\t') && !text.includes(',')) return;
      const current = editorStore.getState();
      const laneId = current.document.lanes[0]?.id;
      if (!current.ready || laneId === undefined) return;
      try {
        const { items, skipped } = csvItems(text, laneId);
        if (items.length === 0) return;
        event.preventDefault();
        // Les éléments collés hors de l'axe l'étendent : sinon ils seraient
        // invisibles. L'axe et les éléments forment une seule annulation.
        const axis = axisCovering(current.document.axis, items);
        const add = addItems(current.document, items);
        current.dispatch(axis === null ? add : { name: 'batch', label: 'pasteItems', commands: [add, { name: 'setAxis', axis }] });
        current.select(items.map((item) => item.id));
        setNotice(EDITOR.pasted(items.length, skipped.length));
      } catch { /* un collage qui n'est pas un tableau reste un collage ordinaire */ }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (editable(event.target) || !editorStore.getState().ready) return;
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const current = editorStore.getState();
      if (key === 'escape') { current.select([]); setTool('auto'); return; }
      if (current.preview) return;
      if (command && key === 'z') { event.preventDefault(); if (event.shiftKey) current.redo(); else current.undo(); }
      else if (command && key === 'd') { event.preventDefault(); if (modeRef.current === 'edit') duplicate(); }
      else if (command && key === 'a') { event.preventDefault(); current.select(current.document.items.map((item) => item.id)); }
      else if (command && key === 's') { event.preventDefault(); void save(); }
      else if (command && key === 'o') { event.preventDefault(); void open(); }
      else if (command && key === 'e') { event.preventDefault(); setExporting(true); }
      else if (command && key === '1') { event.preventDefault(); toggleSidebar(); }
      else if (command && key === '2') { event.preventDefault(); toggleInspector(); }
      else if (command && (key === '=' || key === '+')) { event.preventDefault(); stepZoom(1.5); }
      else if (command && key === '-') { event.preventDefault(); stepZoom(1 / 1.5); }
      else if (command && key === '0') { event.preventDefault(); fitRef.current(); }
      else if (key === 'delete' || key === 'backspace') { event.preventDefault(); if (modeRef.current === 'edit') remove(); }
      else if (!command && key === 'e' && modeRef.current === 'edit') setTool('event');
      else if (!command && key === 'p' && modeRef.current === 'edit') setTool('period');
      else if (!command && (key === 'arrowleft' || key === 'arrowright') && modeRef.current === 'edit') {
        event.preventDefault(); nudge(key === 'arrowleft' ? -1 : 1, event.shiftKey ? 10 : 1);
      } else if (!command && (key === 'arrowup' || key === 'arrowdown') && modeRef.current === 'edit') {
        event.preventDefault(); shiftLane(key === 'arrowup' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [duplicate, nudge, open, remove, save, shiftLane, stepZoom, toggleSidebar, toggleInspector]);
  const finishTitle = (commit: boolean) => {
    if (finishingTitle.current) return;
    finishingTitle.current = true;
    if (commit && title !== null && (title.trim() || DOC.untitled) !== state.document.meta.title) state.dispatch({ name: 'setTitle', title: title.trim() || DOC.untitled });
    setTitle(null);
  };

  return <div className={styles.app}>
    <header className={styles.toolbar} aria-label={TOOLBAR.toolbar}>
      <div ref={toolbar.ref} className={styles.toolbarContent} data-compact={toolbar.compact}>
      <IconButton icon="sidebar" label={EDITOR.sidebarToggle} pressed={sidebar} onClick={toggleSidebar} />
      {title === null ? <button data-toolbar-title className={`${styles.title} ${styles.tip}`} data-tip={EDITOR.renameTitle} onClick={() => setTitle(state.document.meta.title)}>{state.document.meta.title}</button> :
        <input data-toolbar-title ref={titleInput} className={styles.titleInput} aria-label={EDITOR.title} value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => finishTitle(true)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') finishTitle(event.key === 'Enter'); }} />}
      <span className={styles.separator} />
      <IconButton icon="undo" label={TOOLBAR.undo} hint="⌘Z" disabled={!state.history.past.length || !!state.preview} onClick={state.undo} />
      <IconButton icon="redo" label={TOOLBAR.redo} hint="⇧⌘Z" disabled={!state.history.future.length || !!state.preview} onClick={state.redo} />
      <IconButton icon="duplicate" label={EDITOR.duplicate} hint="⌘D" disabled={!state.selection.length || worksheet} onClick={duplicate} />
      <IconButton icon="trash" label={CONFIRM.delete} hint="⌫" disabled={!state.selection.length || worksheet} onClick={remove} />
      <span className={styles.separator} />
      <div className={styles.group} role="group" aria-label={TOOLBAR.tools}>
        <IconButton icon="navigate" label={M2.navigate} hint="Échap" segment pressed={tool === 'auto'} onClick={() => setTool('auto')} />
        <span data-tour="event-tool"><IconButton icon="event" label={TOOLBAR.addEvent} hint="E" segment pressed={tool === 'event'} disabled={!state.ready || worksheet} onClick={() => setTool(tool === 'event' ? 'auto' : 'event')} /></span>
        <IconButton icon="period" label={TOOLBAR.addPeriod} hint="P" segment pressed={tool === 'period'} disabled={!state.ready || worksheet} onClick={() => setTool(tool === 'period' ? 'auto' : 'period')} />
      </div>
      <span data-toolbar-spacer className={styles.spacer} />
      <div className={styles.desktopCommands} inert={toolbar.compact}>
      <div className={styles.group} role="group" aria-label={WORKSHEET.mode}>
        {([['edit', TOOLBAR.modeEdit, 'edit'], ['present', TOOLBAR.modePresent, 'present'], ['worksheet', TOOLBAR.modeWorksheet, 'worksheet']] as const).map(([value, label, icon]) =>
          <span key={value} {...(value === 'present' ? { 'data-tour': 'present-mode' } : {})}>
            <IconButton icon={icon} label={label} segment pressed={mode === value} disabled={!state.ready} onClick={() => changeMode(value)} />
          </span>)}
      </div>
      <span className={styles.separator} />
      <IconButton icon="library" label={LIBRARY.open} pressed={library} disabled={!state.ready} onClick={() => setLibrary(!library)} />
      <IconButton icon="open" label={EDITOR.open} hint="⌘O" disabled={!state.ready} onClick={() => { void open(); }} />
      <IconButton icon="save" label={EDITOR.save} hint="⌘S" disabled={!state.ready} onClick={() => { void save(); }} />
      <IconButton icon="export" label={EXPORT.open} hint="⌘E" disabled={!state.ready} onClick={() => setExporting(true)} />
      </div>
      <ToolbarOverflow compact={toolbar.compact} groups={[
        { label: WORKSHEET.mode, actions: ([['edit', TOOLBAR.modeEdit, 'edit'], ['present', TOOLBAR.modePresent, 'present'], ['worksheet', TOOLBAR.modeWorksheet, 'worksheet']] as const).map(([value, label, icon]) => ({
          label, icon, pressed: mode === value, disabled: !state.ready, run: () => changeMode(value),
        })) },
        { label: M2.document, actions: [
          { label: LIBRARY.title, icon: 'library', disabled: !state.ready, run: () => setLibrary(true) },
          { label: EDITOR.open, icon: 'open', disabled: !state.ready, run: () => { void open(); } },
          { label: EDITOR.save, icon: 'save', disabled: !state.ready, run: () => { void save(); } },
          { label: EXPORT.open, icon: 'export', disabled: !state.ready, run: () => setExporting(true) },
        ] },
      ]} />
      </div>
      <div className={styles.inspectorToggle}>
        <span className={styles.separator} />
        <IconButton icon="inspector" label={EDITOR.inspectorToggle} hint="⌘2" pressed={inspector} atEnd onClick={toggleInspector} />
      </div>
    </header>
    <div className={styles.workspace}>
      <aside className={styles.sidebar} style={sidebar ? { width: sidebarWidth } : undefined} data-open={sidebar} aria-hidden={!sidebar} inert={!sidebar}>
        <div className={styles.panelContent}>
          <header className="panelHeader"><h2>{EDITOR.sidebar}</h2></header>
          <Outline onLane={(id) => { setLaneId(id); revealInspector(); }} onFocus={(id) => { setLaneId(null); revealInspector(); setFocusItem({ id, serial: Date.now() }); }} />
        </div>
      </aside>
      {sidebar && <div className="sidebarResize" role="separator" aria-label={M2.resizeSidebar} aria-orientation="vertical" aria-valuemin={200} aria-valuemax={320} aria-valuenow={sidebarWidth} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setSidebarWidth(Math.max(200, Math.min(320, sidebarWidth + (e.key === 'ArrowLeft' ? -10 : 10)))); } }}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setSidebarWidth(Math.max(200, Math.min(320, e.clientX))); }} onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)} />}
      <main className={styles.main} data-tour="canvas">{state.ready ? <><EditorCanvas insets={insets} key={state.document.id} tool={tool} setTool={setTool} zoom={zoom} setZoom={setZoom} pan={pan} setPan={setPan} onWidth={setCanvasWidth} focusItem={focusItem} worksheet={worksheet && !answerKey} readOnly={worksheet} />
        <div className={styles.zoomBubble} role="group" aria-label={TOOLBAR.zoom}>
          <IconButton icon="zoomOut" label={TOOLBAR.zoomOut} hint="⌘−" disabled={zoom <= 1} onClick={() => stepZoom(1 / 1.5)} />
          <button className={`${styles.zoom} ${styles.tip}`} aria-label={`${TOOLBAR.zoomFit} · ${EDITOR.zoomPercent(zoom)}`} data-tip={`${TOOLBAR.zoomFit} · ⌘0`} onClick={fit}>{EDITOR.zoomPercent(zoom)}</button>
          <IconButton icon="zoomIn" label={TOOLBAR.zoomIn} hint="⌘+" atEnd disabled={zoom >= 5000} onClick={() => stepZoom(1.5)} />
        </div>
        <Minimap insets={insets} width={canvasWidth} zoom={zoom} pan={pan} setPan={setPan} /></> : <p>{EDITOR.loading}</p>}</main>
      <aside className={styles.inspector} data-open={inspector} aria-hidden={!inspector} inert={!inspector}><Inspector laneId={laneId} onLane={setLaneId} fit={fit} mode={mode} answerKey={answerKey} onAnswerKey={setAnswerKey} /></aside>
    </div>
    <footer className={styles.footer}>
      <span className={styles.status} role="status">
        {state.selection.length
          ? <><Icon name="navigate" />{selectedLabel ?? EDITOR.selected(state.selection.length)}</>
          : state.savedRevision === state.revision
            ? <><Icon name="check" />{EDITOR.saved}</>
            : <><span className={styles.pulse} aria-hidden="true" />{EDITOR.saving}</>}
      </span>
      <span className={styles.hint}>{worksheet ? WORKSHEET.hint : <><span className={styles.desktopHint}>{EDITOR.hint}</span><span className={styles.touchHint}>{EDITOR.touchHint}</span></>}</span>
      <AppearancePicker />
      <IconButton icon="help" label={TUTORIAL.restart} above disabled={!state.ready} onClick={() => { setTutorialDone(false); setTutorial(true); }} />
      <IconButton icon="agentSkill" label={APP_LINKS.agentSkill} above atEnd onClick={() => setAgentSkill(true)} />
      <a className={`${styles.icon} ${styles.tip} ${styles.tipAbove} ${styles.tipEnd}`} href="https://github.com/kilianvivien/KronoFrise" target="_blank" rel="noopener noreferrer" aria-label={APP_LINKS.github} data-tip={APP_LINKS.github}><Icon name="github" /></a>
    </footer>
    <PwaPrompts hidden={!state.ready || tutorial || !tutorialDone || library || exporting || agentSkill || setup || mode === 'present' || deleting.length > 0 || !!state.error || notice !== null} save={saveBeforeUpdate} />
    {agentSkill && <AgentSkillDialog onClose={() => setAgentSkill(false)} />}
    {setup && state.ready && <SetupDialog onClose={() => { setSetup(false); fit(); }} />}
    {exporting && <ExportDialog worksheet={worksheet && !answerKey} onClose={() => setExporting(false)} onDone={setNotice} />}
    {library && <Library onClose={() => setLibrary(false)} onImported={setNotice} onCreated={() => setSetup(true)} onOpen={(replace) => {
      void preserveCurrent().then((safe) => { if (safe) return replace().then(fit); });
    }} />}
    {mode === 'present' && state.ready && <Presentation onExit={() => changeMode('edit')} />}
    {tutorial && state.ready && <Tutorial mode={mode} onClose={() => setTutorial(false)} />}
    {(state.error || notice) && <div className={styles.notification} data-kind={state.error ? 'error' : 'notice'} role={state.error ? 'alert' : 'status'}>
      <Icon name={state.error ? 'close' : 'check'} />
      <span>{state.error || notice}</span>
      <button className={styles.icon} aria-label={EDITOR.close} onClick={() => { editorStore.setState({ error: null }); setNotice(null); }}><Icon name="close" /></button>
    </div>}
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setDeleting([])} aria-labelledby="delete-title">
      <h2 id="delete-title">{CONFIRM.deleteItems(deleting.length)}</h2>
      <div className={styles.dialogActions}><button className={styles.button} autoFocus onClick={() => setDeleting([])}>{CONFIRM.cancel}</button><button className={styles.danger} onClick={() => { state.dispatch(deleteItems(state.document, deleting)); state.select([]); setDeleting([]); }}>{CONFIRM.delete}</button></div>
    </dialog>
  </div>;
}
/**
 * Bouton d'icône : jamais d'icône sans nom accessible ni infobulle
 * (DESIGN.md §7). L'infobulle rappelle le raccourci, comme sous macOS.
 */
function IconButton({ icon, label, hint, pressed, disabled, onClick, segment = false, atEnd = false, above = false }: {
  icon: IconName; label: string; hint?: string; pressed?: boolean; disabled?: boolean; onClick: () => void;
  segment?: boolean; atEnd?: boolean; above?: boolean;
}): JSX.Element {
  return <button
    type="button"
    className={`${segment ? styles.segment : styles.icon} ${styles.tip} ${atEnd ? styles.tipEnd : ''} ${above ? styles.tipAbove : ''}`}
    aria-label={label}
    data-tip={hint === undefined ? label : `${label} · ${hint}`}
    {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
    disabled={disabled === true}
    onClick={onClick}
  ><Icon name={icon} /></button>;
}
