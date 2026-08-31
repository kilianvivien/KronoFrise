import { get, setMany, set } from 'idb-keyval';
import { INDEX_KEY, parseIndex, summarize, upsert } from './library';
import { emptyHistory } from '../core/history';
import { serializeFile, decodeFile } from './fileIO';
import type { EditorStore } from './editor';
import { EDITOR } from '../ui/strings';
import { decodeSnapshot, LAST_DOCUMENT_KEY, type Snapshot, type Storage } from './snapshot';

export { decodeSnapshot, LAST_DOCUMENT_KEY };
export type { Snapshot, Storage };

const storage: Storage = {
  get: (key) => get<unknown>(key),
  // L'index de la bibliothèque est écrit dans la même transaction que le
  // document : la liste des frises ne peut pas prendre du retard sur les faits.
  write: async (id, snapshot) => {
    const entries = upsert(parseIndex(await get<unknown>(INDEX_KEY)), summarize(snapshot.document));
    await setMany([[id, snapshot], [LAST_DOCUMENT_KEY, id], [INDEX_KEY, entries]]);
  },
};

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
