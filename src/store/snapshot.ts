/**
 * Instantané d'autosauvegarde : la forme sous laquelle un document et son
 * historique dorment dans IndexedDB (docs/format.md §7).
 *
 * Ce module est le socle commun de `persistence.ts` (qui écrit) et de
 * `library.ts` (qui inventorie) : il ne dépend d'aucun des deux.
 */
import { HISTORY_LIMIT, undo, redo, type History, type HistoryState } from '../core/history';
import { parseDocument } from '../core/schema';
import { EDITOR } from '../ui/strings';

export const LAST_DOCUMENT_KEY = 'krono:last-document';
export interface Snapshot extends HistoryState { version: 1 }

/** Accès au stockage, injectable : les tests n'ouvrent jamais IndexedDB. */
export interface Storage {
  get: (key: string) => Promise<unknown>;
  write: (id: string, snapshot: Snapshot) => Promise<void>;
}

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

