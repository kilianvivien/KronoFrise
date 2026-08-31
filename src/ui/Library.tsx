/**
 * Navigateur de frises — DESIGN.md §10.
 *
 * Toutes les frises enregistrées sur cet appareil, avec leur vignette : on les
 * ouvre, on les duplique, on les supprime, on en crée une. La vignette vient du
 * même rendu que l'écran (`useThumbnail`), donc la tuile montre la vraie frise.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useStore } from 'zustand';
import { createDocument } from '../core/document';
import { FIXTURES } from '../core/fixtures';
import { newId } from '../core/ids';
import { editorStore } from '../store/editor';
import { readAnyFile } from '../store/fileIO';
import {
  deleteDocument, duplicateDocument, listDocuments, readDocument, readThumbnail,
  type LibraryEntry,
} from '../store/library';
import { relativeTime } from './relativeTime';
import { CONFIRM, EDITOR, LIBRARY, START } from './strings';
import { Icon } from './icons';
import styles from './Library.module.css';

export function Library({ onClose, onOpen, onImported }: {
  onClose: () => void;
  /** remplace le document courant, après avoir mis le travail en cours à l'abri */
  onOpen: (open: () => Promise<void>) => void;
  onImported: (message: string) => void;
}): JSX.Element {
  const state = useStore(editorStore);
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<LibraryEntry | null>(null);
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const urls = useRef<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const list = await listDocuments();
      setEntries(list);
      for (const entry of list) {
        const blob = await readThumbnail(entry.id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          urls.current.push(url);
          setThumbnails((current) => ({ ...current, [entry.id]: url }));
        }
      }
    } catch { setEntries([]); setError(LIBRARY.storageUnavailable); }
  }, []);

  useEffect(() => { void refresh(); return () => { for (const url of urls.current) URL.revokeObjectURL(url); urls.current = []; }; }, [refresh]);
  useEffect(() => { if (deleting) dialog.current?.showModal(); else dialog.current?.close(); }, [deleting]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape' && !deleting) { event.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, onClose]);

  const open = (entry: LibraryEntry): void => {
    if (entry.id === state.document.id) { onClose(); return; }
    onOpen(async () => {
      try {
        const snapshot = await readDocument(entry.id);
        editorStore.getState().replace(snapshot.document, snapshot.history);
        onClose();
      } catch { setError(LIBRARY.unreadable); }
    });
  };
  const create = (): void => onOpen(() => { editorStore.getState().replace(createDocument()); onClose(); return Promise.resolve(); });
  const duplicate = (entry: LibraryEntry): void => {
    onOpen(async () => {
      try {
        const snapshot = await readDocument(entry.id);
        editorStore.getState().replace(duplicateDocument(snapshot.document, LIBRARY.copySuffix(snapshot.document.meta.title)));
        onClose();
      } catch { setError(LIBRARY.unreadable); }
    });
  };
  const importFile = (file: File): void => {
    onOpen(async () => {
      try {
        const { document, skipped } = await readAnyFile(file);
        editorStore.getState().replace(document);
        onImported(EDITOR.imported(document.items.length, skipped.length));
        onClose();
      } catch (cause) { setError(cause instanceof Error ? cause.message : LIBRARY.unreadable); }
    });
  };

  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={LIBRARY.title}
    data-dropping={dropping}
    onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDropping(true); } }}
    onDragLeave={() => setDropping(false)}
    onDrop={(event) => {
      event.preventDefault(); setDropping(false);
      const file = event.dataTransfer.files[0];
      if (file) importFile(file);
    }}>
    <header className={styles.header}>
      <div>
        <h1>{LIBRARY.title}</h1>
        <p className={styles.subtitle}>{LIBRARY.subtitle}</p>
      </div>
      <span className={styles.spacer} />
      <button className={styles.secondary} onClick={() => upload.current?.click()}><Icon name="open" />{LIBRARY.importFile}</button>
      <button className={styles.close} aria-label={LIBRARY.close} onClick={onClose}><Icon name="close" /></button>
    </header>
    <input hidden type="file" ref={upload} accept=".krono,application/json" onChange={(event) => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) importFile(file);
    }} />
    {error !== null && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.grid}>
      <button className={styles.newTile} onClick={create}>
        <Icon name="plus" />
        {START.newDocument}
      </button>
      {entries === null ? <p className={styles.hint}>{LIBRARY.loading}</p> : entries.map((entry) => <article key={entry.id} className={styles.tile}>
        <button className={styles.preview} aria-label={`${LIBRARY.openDocument} : ${entry.title}`} onClick={() => open(entry)}>
          {thumbnails[entry.id] !== undefined
            ? <img src={thumbnails[entry.id]} alt="" />
            : <span className={styles.noThumbnail}>{LIBRARY.noThumbnail}</span>}
          {entry.id === state.document.id && <span className={styles.badge}>{LIBRARY.current}</span>}
        </button>
        <div className={styles.meta}>
          <h2>{entry.title}</h2>
          <p>{LIBRARY.modified(relativeTime(entry.modifiedAt))} · {LIBRARY.counted(entry.items, entry.lanes)}</p>
        </div>
        <div className={styles.actions}>
          <button onClick={() => duplicate(entry)}><Icon name="duplicate" />{LIBRARY.duplicate}</button>
          <button className={styles.dangerText} disabled={entry.id === state.document.id} onClick={() => setDeleting(entry)}><Icon name="trash" />{LIBRARY.delete}</button>
        </div>
      </article>)}
    </div>
    {entries !== null && entries.length === 0 && <p className={styles.hint}>{START.empty}</p>}

    <section className={styles.examples}>
      <h2>{LIBRARY.examples}</h2>
      <p>{LIBRARY.examplesHint}</p>
      <div className={styles.exampleRow}>
        {FIXTURES.filter((entry) => entry.file !== 'stress.krono').map((entry) => <button key={entry.file} onClick={() => onOpen(() => {
          editorStore.getState().replace({ ...structuredClone(entry.document), id: newId() });
          onClose();
          return Promise.resolve();
        })}>{entry.document.meta.title}</button>)}
      </div>
    </section>

    <p className={styles.dropHint}><Icon name="open" /> {LIBRARY.drop}</p>
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setDeleting(null)} aria-labelledby="library-delete">
      <h2 id="library-delete">{deleting ? LIBRARY.confirmDelete(deleting.title) : ''}</h2>
      <p>{LIBRARY.confirmHint}</p>
      <div className={styles.dialogActions}>
        <button autoFocus onClick={() => setDeleting(null)}>{CONFIRM.cancel}</button>
        <button className={styles.danger} onClick={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void deleteDocument(target.id).then(refresh).catch(() => setError(LIBRARY.storageUnavailable));
        }}>{CONFIRM.delete}</button>
      </div>
    </dialog>
  </div>;
}
