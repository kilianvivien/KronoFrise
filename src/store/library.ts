/**
 * Bibliothèque des frises — les documents conservés dans IndexedDB.
 *
 * L'autosauvegarde (docs/format.md §7) écrit un instantané par document ; ce
 * module en tient l'index, seule chose que le navigateur de frises a besoin de
 * lire pour dresser la liste. Ouvrir un document reste le travail de
 * `persistence.ts` : ici on ne fait qu'inventorier, dupliquer et supprimer.
 */
import { del, get, keys as idbKeys, set } from 'idb-keyval';
import { newId } from '../core/ids';
import type { KronoDocument } from '../core/types';
import { decodeSnapshot, LAST_DOCUMENT_KEY, type Snapshot } from './snapshot';
import type { HistoryState } from '../core/history';

export const INDEX_KEY = 'krono:documents';
/** Toutes les clés de service sont préfixées ; le reste est un identifiant. */
const RESERVED_PREFIX = 'krono:';
const THUMBNAIL_SUFFIX = ':thumbnail';

export interface LibraryEntry {
  id: string;
  title: string;
  /** ISO 8601 — la date d'enregistrement, pas celle du document */
  modifiedAt: string;
  items: number;
  lanes: number;
}

export interface LibraryBackend {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  del: (key: string) => Promise<void>;
  keys: () => Promise<string[]>;
}

export const idbBackend: LibraryBackend = {
  get: (key) => get<unknown>(key),
  set: (key, value) => set(key, value),
  del: (key) => del(key),
  keys: async () => (await idbKeys()).map(String),
};

export function summarize(doc: KronoDocument, at = new Date()): LibraryEntry {
  return {
    id: doc.id,
    title: doc.meta.title,
    modifiedAt: at.toISOString(),
    items: doc.items.length,
    lanes: doc.lanes.length,
  };
}

/** Lecture défensive : un index abîmé ne doit jamais empêcher d'ouvrir l'app. */
export function parseIndex(value: unknown): LibraryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (entry === null || typeof entry !== 'object') return [];
    const candidate = entry as Partial<LibraryEntry>;
    if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') return [];
    return [{
      id: candidate.id,
      title: candidate.title,
      modifiedAt: typeof candidate.modifiedAt === 'string' ? candidate.modifiedAt : new Date(0).toISOString(),
      items: typeof candidate.items === 'number' ? candidate.items : 0,
      lanes: typeof candidate.lanes === 'number' ? candidate.lanes : 1,
    }];
  });
}

export function upsert(entries: readonly LibraryEntry[], entry: LibraryEntry): LibraryEntry[] {
  return [entry, ...entries.filter((candidate) => candidate.id !== entry.id)]
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

/** Un identifiant de document, par opposition aux clés de service et vignettes. */
export function isDocumentKey(key: string): boolean {
  return !key.startsWith(RESERVED_PREFIX) && !key.endsWith(THUMBNAIL_SUFFIX);
}

export async function recordDocument(doc: KronoDocument, backend: LibraryBackend = idbBackend, at = new Date()): Promise<void> {
  const entries = upsert(parseIndex(await backend.get(INDEX_KEY)), summarize(doc, at));
  await backend.set(INDEX_KEY, entries);
}

/**
 * Liste des frises, la plus récente d'abord. L'index fait foi, mais les clés
 * réelles tranchent : un document effacé disparaît, un document enregistré
 * avant l'index (ou par une autre version) est retrouvé et réintégré.
 */
export async function listDocuments(backend: LibraryBackend = idbBackend): Promise<LibraryEntry[]> {
  const [indexed, keys] = await Promise.all([
    backend.get(INDEX_KEY).then(parseIndex).catch(() => [] as LibraryEntry[]),
    backend.keys().catch(() => [] as string[]),
  ]);
  const present = new Set(keys.filter(isDocumentKey));
  const known = indexed.filter((entry) => present.has(entry.id));
  const missing = [...present].filter((id) => !known.some((entry) => entry.id === id));
  for (const id of missing) {
    try {
      const snapshot = decodeSnapshot(await backend.get(id));
      known.push(summarize(snapshot.document, new Date(snapshot.document.meta.modifiedAt)));
    } catch { /* un instantané illisible n'apparaît pas dans la liste */ }
  }
  return known.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export async function readDocument(id: string, backend: LibraryBackend = idbBackend): Promise<HistoryState> {
  return decodeSnapshot(await backend.get(id));
}

export async function readThumbnail(id: string, backend: LibraryBackend = idbBackend): Promise<Blob | undefined> {
  const value = await backend.get(`${id}${THUMBNAIL_SUFFIX}`);
  return value instanceof Blob ? value : undefined;
}

/** Supprime le document, sa vignette et son entrée d'index. Sans retour. */
export async function deleteDocument(id: string, backend: LibraryBackend = idbBackend): Promise<void> {
  await backend.del(id);
  await backend.del(`${id}${THUMBNAIL_SUFFIX}`);
  const entries = parseIndex(await backend.get(INDEX_KEY)).filter((entry) => entry.id !== id);
  await backend.set(INDEX_KEY, entries);
  if (await backend.get(LAST_DOCUMENT_KEY) === id) await backend.del(LAST_DOCUMENT_KEY);
}

/** Copie complète, nouvel identifiant : l'original n'est jamais touché. */
export function duplicateDocument(doc: KronoDocument, title: string, now = new Date()): KronoDocument {
  return {
    ...structuredClone(doc),
    id: newId(),
    meta: { ...doc.meta, title, createdAt: now.toISOString(), modifiedAt: now.toISOString() },
  };
}

export type { Snapshot };
