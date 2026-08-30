import { get, setMany, set } from 'idb-keyval';
import { emptyHistory, undo, redo, HISTORY_LIMIT, type History, type HistoryState } from '../core/history';
import { parseDocument } from '../core/schema';
import { serializeFile, decodeFile } from './fileIO';
import type { EditorStore } from './editor';
import { EDITOR } from '../ui/strings';

export const LAST_DOCUMENT_KEY = 'krono:last-document';
export interface Snapshot extends HistoryState { version: 1 }
export interface Storage {
  get: (key: string) => Promise<unknown>;
  write: (id: string, snapshot: Snapshot) => Promise<void>;
}
const storage: Storage = {
  get: (key) => get<unknown>(key),
  write: (id, snapshot) => setMany([[id, snapshot], [LAST_DOCUMENT_KEY, id]]),
};
export function decodeSnapshot(value: unknown): HistoryState {
  if (!value || typeof value !== 'object') throw new Error(EDITOR.restoreError);
  const candidate = value as Partial<Snapshot>;
  const document = parseDocument(candidate.document);
  const history = candidate.history;
  if (candidate.version !== 1 || !history || !Array.isArray(history.past) || !Array.isArray(history.future) || history.past.length > HISTORY_LIMIT || history.future.length > HISTORY_LIMIT) {
    throw new Error(EDITOR.restoreError);
  }
  // Validate serialized inverses against the actual document, including all future states.
  const validHistory: History = structuredClone(history);
  let past = { document, history: validHistory };
  while (past.history.past.length) { past = undo(past); parseDocument(past.document); }
  let future = { document, history: validHistory };
  while (future.history.future.length) { future = redo(future); parseDocument(future.document); }
  return { document, history: validHistory };
}

export function startPersistence(store: EditorStore, backend = storage) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let queue = Promise.resolve();
  const flush = (): Promise<void> => {
    clearTimeout(timer);
    const state = store.getState();
    if (!state.ready || state.savedRevision === state.revision) return queue;
    queue = queue.then(async () => {
      try {
        const document = decodeFile(serializeFile(state.document));
        await backend.write(document.id, { version: 1, document, history: state.history });
        if (store.getState().revision === state.revision) store.setState({ savedRevision: state.revision, error: null });
      } catch { store.setState({ error: EDITOR.storageError }); }
    });
    return queue;
  };
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.ready && (state.revision !== previous.revision || !previous.ready)) {
      clearTimeout(timer); timer = setTimeout(() => { void flush(); }, 500);
    }
  });
  const ready = (async () => {
    try {
      const id = await backend.get(LAST_DOCUMENT_KEY);
      const value = typeof id === 'string' ? await backend.get(id) : undefined;
      if (stopped || store.getState().ready) return;
      if (value !== undefined) {
        const snapshot = decodeSnapshot(value);
        store.getState().replace(snapshot.document, snapshot.history);
        store.setState({ savedRevision: store.getState().revision });
      } else store.setState({ ready: true, history: emptyHistory });
    } catch { if (!stopped) store.setState({ ready: true, savedRevision: store.getState().revision, error: EDITOR.restoreError }); }
  })();
  return { ready, flush, stop: () => { stopped = true; unsubscribe(); clearTimeout(timer); } };
}
export async function saveThumbnail(id: string, png: Blob): Promise<void> { await set(`${id}:thumbnail`, png); }
