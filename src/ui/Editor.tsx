import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useStore } from 'zustand';
import { addItems, deleteItems } from '../core/commands';
import { createDocument } from '../core/document';
import { newId } from '../core/ids';
import { FIXTURES } from '../core/fixtures';
import { editorStore } from '../store/editor';
import { openFile, saveFile } from '../store/fileIO';
import { startPersistence } from '../store/persistence';
import { CONFIRM, DOC, EDITOR, START, TOOLBAR } from './strings';
import { EditorCanvas, type Tool } from './EditorCanvas';
import { useThumbnail } from './useThumbnail';
import styles from './Editor.module.css';

function editable(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('input,textarea,select,[contenteditable=true],dialog');
}
export function Editor(): JSX.Element {
  const state = useStore(editorStore);
  const [tool, setTool] = useState<Tool>('auto');
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState(0);
  const [sidebar, setSidebar] = useState(true), [inspector, setInspector] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const exportedRevision = useRef(-1);
  const flush = useRef<() => Promise<void>>(async () => {});
  const titleInput = useRef<HTMLInputElement>(null);
  const finishingTitle = useRef(false);
  useThumbnail(state.document, state.ready, state.revision);

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

  const fit = () => { setZoom(1); setPan(0); };
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
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (editable(event.target) || !editorStore.getState().ready) return;
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const current = editorStore.getState();
      if (key === 'escape') { current.select([]); setTool('auto'); return; }
      if (current.preview) return;
      if (command && key === 'z') { event.preventDefault(); if (event.shiftKey) current.redo(); else current.undo(); }
      else if (command && key === 'd') { event.preventDefault(); duplicate(); }
      else if (command && key === 'a') { event.preventDefault(); current.select(current.document.items.map((item) => item.id)); }
      else if (command && key === 's') { event.preventDefault(); void save(); }
      else if (command && key === 'o') { event.preventDefault(); void open(); }
      else if (command && key === '1') { event.preventDefault(); setSidebar((value) => !value); }
      else if (command && key === '2') { event.preventDefault(); setInspector((value) => !value); }
      else if (key === 'delete' || key === 'backspace') { event.preventDefault(); remove(); }
      else if (!command && key === 'e') setTool('event');
      else if (!command && key === 'p') setTool('period');
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [duplicate, open, remove, save]);
  const finishTitle = (commit: boolean) => {
    if (finishingTitle.current) return;
    finishingTitle.current = true;
    if (commit && title !== null && (title.trim() || DOC.untitled) !== state.document.meta.title) state.dispatch({ name: 'setTitle', title: title.trim() || DOC.untitled });
    setTitle(null);
  };
  const stepZoom = (factor: number) => {
    const next = Math.max(1, Math.min(5000, zoom * factor));
    // SPEC? Toolbar zoom anchors the viewport centre; wheel zoom anchors the pointer.
    const width = document.querySelector('[data-tool]')?.clientWidth ?? 800;
    setPan(Math.max(0, (pan + width / 2) * next / zoom - width / 2)); setZoom(next);
  };

  return <div className={styles.app}>
    <header className={styles.toolbar} aria-label={TOOLBAR.modeEdit}>
      <button className={styles.icon} aria-label={EDITOR.sidebarToggle} aria-pressed={sidebar} onClick={() => setSidebar(!sidebar)}><Icon name="sidebar" /></button>
      {title === null ? <button className={styles.title} title={EDITOR.title} onClick={() => setTitle(state.document.meta.title)}>{state.document.meta.title}</button> :
        <input ref={titleInput} className={styles.titleInput} aria-label={EDITOR.title} value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => finishTitle(true)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') finishTitle(event.key === 'Enter'); }} />}
      <button className={styles.icon} aria-label={TOOLBAR.undo} title={`${TOOLBAR.undo} (⌘Z)`} disabled={!state.history.past.length || !!state.preview} onClick={state.undo}><Icon name="undo" /></button>
      <button className={styles.icon} aria-label={TOOLBAR.redo} title={`${TOOLBAR.redo} (⇧⌘Z)`} disabled={!state.history.future.length || !!state.preview} onClick={state.redo}><Icon name="redo" /></button>
      <span className={styles.separator} />
      <button className={styles.primary} disabled={!state.ready} aria-pressed={tool === 'event'} onClick={() => setTool(tool === 'event' ? 'auto' : 'event')}>{TOOLBAR.addEvent}</button>
      <button className={styles.button} disabled={!state.ready} aria-pressed={tool === 'period'} onClick={() => setTool(tool === 'period' ? 'auto' : 'period')}>{TOOLBAR.addPeriod}</button>
      <span className={styles.separator} />
      <button className={styles.icon} aria-label={TOOLBAR.zoomOut} disabled={zoom <= 1} onClick={() => stepZoom(1 / 1.5)}><Icon name="minus" /></button>
      <button className={styles.zoom} title={TOOLBAR.zoomFit} onClick={fit}>{EDITOR.zoomPercent(zoom)}</button>
      <button className={styles.icon} aria-label={TOOLBAR.zoomIn} disabled={zoom >= 5000} onClick={() => stepZoom(1.5)}><Icon name="plus" /></button>
      <span className={styles.spacer} />
      <button className={styles.button} disabled={!state.ready} onClick={() => { void open(); }}>{EDITOR.open}</button>
      <button className={styles.button} disabled={!state.ready} onClick={() => { void save(); }}>{EDITOR.save}</button>
      <button className={styles.icon} aria-label={EDITOR.inspectorToggle} aria-pressed={inspector} onClick={() => setInspector(!inspector)}><Icon name="inspector" /></button>
    </header>
    <div className={styles.workspace}>
      <aside className={styles.sidebar} data-open={sidebar} aria-hidden={!sidebar} inert={!sidebar}>
        <div className={styles.panelContent}>
          <h2>{EDITOR.sidebar}</h2><p>{EDITOR.sidebarHint}</p>
          <button className={styles.button} disabled={!state.ready} onClick={() => { void preserveCurrent().then((safe) => { if (safe) { state.replace(createDocument()); fit(); } }); }}>{START.newDocument}</button>
          <select aria-label={EDITOR.examples} className={styles.example} value="" disabled={!state.ready} onChange={(event) => {
            const fixture = FIXTURES.find((entry) => entry.file === event.target.value);
            if (fixture) void preserveCurrent().then((safe) => { if (safe) { state.replace({ ...structuredClone(fixture.document), id: newId() }); fit(); } });
          }}><option value="">{EDITOR.chooseExample}</option>{FIXTURES.map((entry) => <option key={entry.file} value={entry.file}>{entry.document.meta.title}</option>)}</select>
        </div>
      </aside>
      <main className={styles.main}>{state.ready ? <EditorCanvas key={state.document.id} tool={tool} setTool={setTool} zoom={zoom} setZoom={setZoom} pan={pan} setPan={setPan} /> : <p>{EDITOR.loading}</p>}</main>
      <aside className={styles.inspector} data-open={inspector} aria-hidden={!inspector} inert={!inspector}><div className={styles.panelContent}><h2>{EDITOR.inspector}</h2><p>{EDITOR.inspectorHint}</p></div></aside>
    </div>
    <footer className={styles.footer}>
      <span className={styles.status} role="status">{state.selection.length ? EDITOR.selected(state.selection.length) : state.savedRevision === state.revision ? EDITOR.saved : EDITOR.saving}</span>
      <span className={styles.hint}>{EDITOR.hint}</span>
      <button className={styles.icon} aria-label={EDITOR.duplicate} title={`${EDITOR.duplicate} (⌘D)`} disabled={!state.selection.length} onClick={duplicate}><Icon name="duplicate" /></button>
      <button className={styles.icon} aria-label={CONFIRM.delete} disabled={!state.selection.length} onClick={remove}><Icon name="trash" /></button>
    </footer>
    {(state.error || notice) && <div className={styles.notification} role={state.error ? 'alert' : 'status'}>{state.error || notice}<button className={styles.button} onClick={() => { editorStore.setState({ error: null }); setNotice(null); }}>{EDITOR.close}</button></div>}
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setDeleting([])} aria-labelledby="delete-title">
      <h2 id="delete-title">{CONFIRM.deleteItems(deleting.length)}</h2>
      <div className={styles.dialogActions}><button className={styles.button} autoFocus onClick={() => setDeleting([])}>{CONFIRM.cancel}</button><button className={styles.danger} onClick={() => { state.dispatch(deleteItems(state.document, deleting)); state.select([]); setDeleting([]); }}>{CONFIRM.delete}</button></div>
    </dialog>
  </div>;
}
function Icon({ name }: { name: 'sidebar' | 'inspector' | 'undo' | 'redo' | 'minus' | 'plus' | 'duplicate' | 'trash' }): JSX.Element {
  const paths = {
    sidebar: 'M2 2h12v12H2z M6 2v12', inspector: 'M2 2h12v12H2z M10 2v12',
    undo: 'M6 3L2 7l4 4 M2 7h7a4 4 0 0 1 4 4v2', redo: 'M10 3l4 4-4 4 M14 7H7a4 4 0 0 0-4 4v2',
    minus: 'M3 8h10', plus: 'M3 8h10 M8 3v10', duplicate: 'M6 6h8v8H6z M10 6V2H2v8h4',
    trash: 'M2 4h12 M6 4V2h4v2 M4 4l1 10h6l1-10 M7 7v4 M9 7v4',
  };
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
