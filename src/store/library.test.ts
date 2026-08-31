import { describe, expect, it } from 'vitest';
import { createDocument } from '../core/document';
import { emptyHistory } from '../core/history';
import { revolution } from '../core/fixtures/index';
import {
  deleteDocument, duplicateDocument, INDEX_KEY, isDocumentKey, listDocuments,
  parseIndex, readDocument, recordDocument, summarize, upsert, type LibraryBackend,
} from './library';
import { LAST_DOCUMENT_KEY } from './persistence';

function memory(initial: [string, unknown][] = []): { backend: LibraryBackend; values: Map<string, unknown> } {
  const values = new Map<string, unknown>(initial);
  return {
    values,
    backend: {
      get: (key) => Promise.resolve(values.get(key)),
      set: (key, value) => { values.set(key, value); return Promise.resolve(); },
      del: (key) => { values.delete(key); return Promise.resolve(); },
      keys: () => Promise.resolve([...values.keys()]),
    },
  };
}
const snapshot = (document = revolution) => ({ version: 1 as const, document, history: emptyHistory });

describe('bibliothèque des frises', () => {
  it('inventorie les documents, le plus récent d’abord', async () => {
    const old = createDocument({ title: 'Ancienne' });
    const { backend } = memory([[revolution.id, snapshot()], [old.id, snapshot(old)]]);
    await recordDocument(old, backend, new Date('2026-01-01T10:00:00Z'));
    await recordDocument(revolution, backend, new Date('2026-08-30T10:00:00Z'));
    const list = await listDocuments(backend);
    expect(list.map((entry) => entry.title)).toEqual([revolution.meta.title, 'Ancienne']);
    expect(list[0]!.items).toBe(revolution.items.length);
  });

  it('retrouve un document enregistré sans index', async () => {
    const { backend } = memory([[revolution.id, snapshot()]]);
    const list = await listDocuments(backend);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(revolution.id);
  });

  it('ignore les entrées d’index dont le document a disparu', async () => {
    const { backend } = memory([[INDEX_KEY, [summarize(revolution)]]]);
    expect(await listDocuments(backend)).toEqual([]);
  });

  it('supprime le document, sa vignette, son entrée et le pointeur courant', async () => {
    const { backend, values } = memory([
      [revolution.id, snapshot()],
      [`${revolution.id}:thumbnail`, new Blob()],
      [LAST_DOCUMENT_KEY, revolution.id],
      [INDEX_KEY, [summarize(revolution)]],
    ]);
    await deleteDocument(revolution.id, backend);
    expect(values.has(revolution.id)).toBe(false);
    expect(values.has(`${revolution.id}:thumbnail`)).toBe(false);
    expect(values.has(LAST_DOCUMENT_KEY)).toBe(false);
    expect(await listDocuments(backend)).toEqual([]);
  });

  it('relit un instantané complet', async () => {
    const { backend } = memory([[revolution.id, snapshot()]]);
    expect((await readDocument(revolution.id, backend)).document).toEqual(revolution);
  });

  it('duplique sans toucher à l’original', () => {
    const copy = duplicateDocument(revolution, 'Copie');
    expect(copy.id).not.toBe(revolution.id);
    expect(copy.meta.title).toBe('Copie');
    expect(copy.items).toEqual(revolution.items);
    copy.items[0]!.label = 'Modifié';
    expect(revolution.items[0]!.label).not.toBe('Modifié');
  });

  it('résiste à un index abîmé', () => {
    expect(parseIndex(null)).toEqual([]);
    expect(parseIndex([{ id: 'a' }, { title: 'sans id' }, 42])).toEqual([]);
    expect(parseIndex([{ id: 'a', title: 'Frise' }])[0]!.items).toBe(0);
  });

  it('distingue les clés de service des identifiants', () => {
    expect(isDocumentKey('krono:last-document')).toBe(false);
    expect(isDocumentKey('abc:thumbnail')).toBe(false);
    expect(isDocumentKey('abc')).toBe(true);
  });

  it('ne garde qu’une entrée par document, la plus récente', () => {
    const first = summarize(revolution, new Date('2026-01-01T00:00:00Z'));
    const second = summarize(revolution, new Date('2026-02-01T00:00:00Z'));
    expect(upsert(upsert([], first), second)).toEqual([second]);
  });
});
