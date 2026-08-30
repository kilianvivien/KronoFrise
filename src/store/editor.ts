import { createStore } from 'zustand/vanilla';
import { apply, type Command } from '../core/commands';
import { createDocument } from '../core/document';
import { emptyHistory, execute, redo, undo, type History, type HistoryState } from '../core/history';
import type { KronoDocument } from '../core/types';

export interface EditorState extends HistoryState {
  preview: KronoDocument | null;
  selection: string[];
  ready: boolean;
  revision: number;
  savedRevision: number;
  error: string | null;
  dispatch: (command: Command) => void;
  previewCommand: (command: Command | null) => void;
  select: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  replace: (document: KronoDocument, history?: History) => void;
}

export function createEditorStore(document = createDocument()) {
  return createStore<EditorState>((set) => ({
    document, history: emptyHistory, preview: null, selection: [], ready: false,
    revision: 0, savedRevision: -1, error: null,
    dispatch: (command) => set((state) => ({ ...execute(state, command), preview: null, revision: state.revision + 1 })),
    previewCommand: (command) => set((state) => ({ preview: command ? apply(state.document, command) : null })),
    select: (selection) => set({ selection }),
    undo: () => set((state) => state.history.past.length ? ({ ...undo(state), preview: null, selection: [], revision: state.revision + 1 }) : state),
    redo: () => set((state) => state.history.future.length ? ({ ...redo(state), preview: null, selection: [], revision: state.revision + 1 }) : state),
    replace: (document, history = emptyHistory) => set((state) => ({ document, history, preview: null, selection: [], ready: true, revision: state.revision + 1, error: null })),
  }));
}
const hotData = import.meta.hot?.data as { editorStore?: ReturnType<typeof createEditorStore> } | undefined;
export const editorStore = hotData?.editorStore ?? createEditorStore();
if (hotData) hotData.editorStore = editorStore;
export type EditorStore = ReturnType<typeof createEditorStore>;
