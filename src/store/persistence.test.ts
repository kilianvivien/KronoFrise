import { describe, expect, it, vi } from 'vitest';
import { createEditorStore } from './editor';
import { decodeSnapshot, LAST_DOCUMENT_KEY, startPersistence, type Snapshot, type Storage } from './persistence';
import { decodeFile, serializeFile } from './fileIO';
import { createDocument } from '../core/document';

function memoryStorage() {
  const values = new Map<string, unknown>();
  const backend: Storage = { get: (key) => Promise.resolve(values.get(key)), write: vi.fn((id: string, snapshot: Snapshot) => { values.set(id, structuredClone(snapshot)); values.set(LAST_DOCUMENT_KEY, id); return Promise.resolve(); }) };
  return { backend, values };
}
describe('autosave and files', () => {
  it('debounces commands and restores undo/redo after reopening', async () => {
    vi.useFakeTimers();
    try {
      const { backend } = memoryStorage(); const store = createEditorStore();
      const persistence = startPersistence(store, backend); await persistence.ready;
      store.getState().dispatch({ name: 'setTitle', title: 'Premier titre' });
      await vi.advanceTimersByTimeAsync(300);
      store.getState().dispatch({ name: 'setTitle', title: 'Second titre' });
      await vi.advanceTimersByTimeAsync(499); expect(backend.write).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1); expect(backend.write).toHaveBeenCalledTimes(1);
      persistence.stop();
      const reopened = createEditorStore(); const restored = startPersistence(reopened, backend); await restored.ready;
      expect(reopened.getState().document.meta.title).toBe('Second titre');
      reopened.getState().undo(); expect(reopened.getState().document.meta.title).toBe('Premier titre');
      await restored.flush(); restored.stop();
      const again = createEditorStore(); const recovery = startPersistence(again, backend); await recovery.ready;
      again.getState().redo(); expect(again.getState().document.meta.title).toBe('Second titre'); recovery.stop();
    } finally { vi.useRealTimers(); }
  });
  it('reports a failed save without marking unsaved work saved', async () => {
    const store = createEditorStore(); const { backend } = memoryStorage();
    backend.write = () => Promise.reject(new Error('quota'));
    const persistence = startPersistence(store, backend); await persistence.ready;
    store.getState().dispatch({ name: 'setTitle', title: 'Important' }); await persistence.flush();
    expect(store.getState().error).toContain('Enregistrez un fichier');
    expect(store.getState().savedRevision).not.toBe(store.getState().revision); persistence.stop();
  });
  it('roundtrips all fixture documents through .krono with a save timestamp', async () => {
    const { FIXTURES } = await import('../core/fixtures');
    for (const { document } of FIXTURES) {
      const restored = decodeFile(serializeFile(document, new Date('2026-08-30T12:00:00Z')));
      expect(restored).toEqual({ ...document, meta: { ...document.meta, modifiedAt: '2026-08-30T12:00:00.000Z' } });
    }
  });
  it('rejects malformed, unknown-version and oversized files', () => {
    expect(() => decodeFile('{')).toThrow();
    expect(() => decodeFile('{"schema":"krono/999"}')).toThrow();
    expect(() => decodeFile(' '.repeat(20 * 1024 * 1024 + 1))).toThrow('20 Mo');
    expect(() => decodeSnapshot({ version: 1, document: createDocument(), history: { past: [{ inverse: null }], future: [] } })).toThrow();
  });
});
