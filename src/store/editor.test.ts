import { describe, expect, it } from 'vitest';
import { createEditorStore } from './editor';
import { addItems, deleteItems, moveEvent } from '../core/commands';
import { createDocument } from '../core/document';
import { newId } from '../core/ids';
import type { Item } from '../core/types';

function setup() {
  const document = createDocument();
  const item: Item = { id: newId(), laneId: document.lanes[0]!.id, kind: 'event', date: { year: 1789 }, label: 'Bastille', color: 'brique' };
  const store = createEditorStore({ ...document, items: [item] });
  return { store, item };
}
describe('editor command lifecycle', () => {
  it('keeps many drag previews transient and commits one undo step', () => {
    const { store, item } = setup();
    for (let year = 1790; year < 1800; year++) store.getState().previewCommand(moveEvent(item.id, { year }));
    expect(store.getState().document.items[0]).toEqual(item);
    expect(store.getState().history.past).toHaveLength(0);
    store.getState().dispatch(moveEvent(item.id, { year: 1800 }));
    expect(store.getState().history.past).toHaveLength(1);
    expect(store.getState().preview).toBeNull();
    store.getState().undo(); expect(store.getState().document.items[0]).toEqual(item);
    store.getState().redo(); expect(store.getState().document.items[0]).toMatchObject({ date: { year: 1800 } });
  });
  it('cancels a preview without changing document or history', () => {
    const { store, item } = setup();
    store.getState().previewCommand(moveEvent(item.id, { year: 1800 }));
    store.getState().previewCommand(null);
    expect(store.getState().document.items).toEqual([item]); expect(store.getState().revision).toBe(0);
  });
  it('restores deleted items and their mask order exactly', () => {
    const { store, item } = setup();
    const other = { ...item, id: newId() };
    store.getState().dispatch(addItems(store.getState().document, [other]));
    store.getState().dispatch({ name: 'setMask', itemId: item.id, hide: 'label' });
    store.getState().dispatch({ name: 'setMask', itemId: other.id, hide: 'date' });
    const before = store.getState().document;
    store.getState().dispatch(deleteItems(before, [item.id]));
    store.getState().undo(); expect(store.getState().document).toEqual(before);
    store.getState().dispatch({ name: 'setMask', itemId: item.id, hide: 'both' }); store.getState().undo();
    expect(store.getState().document).toEqual(before);
  });
});
