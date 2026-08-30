/**
 * Pile d'annulation — docs/format.md §6/§7.
 *
 * Structure purement fonctionnelle et sérialisable : elle part avec
 * l'instantané d'autosauvegarde, si bien que rouvrir un document conserve
 * son historique. Plafond : 200 entrées.
 */
import { apply, invert, type Command } from './commands';
import type { KronoDocument } from './types';

export const HISTORY_LIMIT = 200;

export interface HistoryEntry {
  command: Command;
  /** inverse calculé au moment de l'exécution — c'est lui qui annule */
  inverse: Command;
}

export interface History {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export const emptyHistory: History = { past: [], future: [] };

export interface HistoryState {
  document: KronoDocument;
  history: History;
}

/** Exécute une commande et empile son inverse ; vide la pile « refaire ». */
export function execute(state: HistoryState, command: Command): HistoryState {
  const entry: HistoryEntry = { command, inverse: invert(state.document, command) };
  const past = [...state.history.past, entry];
  return {
    document: apply(state.document, command),
    history: { past: past.slice(-HISTORY_LIMIT), future: [] },
  };
}

export function canUndo(history: History): boolean {
  return history.past.length > 0;
}

export function canRedo(history: History): boolean {
  return history.future.length > 0;
}

export function undo(state: HistoryState): HistoryState {
  const entry = state.history.past[state.history.past.length - 1];
  if (entry === undefined) return state;
  return {
    document: apply(state.document, entry.inverse),
    history: {
      past: state.history.past.slice(0, -1),
      future: [entry, ...state.history.future].slice(0, HISTORY_LIMIT),
    },
  };
}

export function redo(state: HistoryState): HistoryState {
  const [entry, ...rest] = state.history.future;
  if (entry === undefined) return state;
  return {
    document: apply(state.document, entry.command),
    history: { past: [...state.history.past, entry].slice(-HISTORY_LIMIT), future: rest },
  };
}
