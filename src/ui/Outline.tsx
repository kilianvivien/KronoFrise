import { useState, type JSX } from 'react';
import { useStore } from 'zustand';
import { setLane } from '../core/commands';
import { itemStart } from '../core/document';
import { compareDates, formatDate } from '../core/dates';
import { newId } from '../core/ids';
import { editorStore } from '../store/editor';
import { commit } from './fields';
import { resolveBase } from './palette';
import { M2 } from './strings';

export function Outline({ onLane, onFocus }: { onLane: (id: string) => void; onFocus: (id: string) => void }): JSX.Element {
  const state = useStore(editorStore), doc = state.document;
  const [search, setSearch] = useState('');
  const matches = doc.items.filter((item) => item.label.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))).sort((a, b) => compareDates(itemStart(a), itemStart(b)) || a.id.localeCompare(b.id));
  return <section className="outline">
    <input type="search" aria-label={M2.search} placeholder={M2.search} value={search} onChange={(e) => setSearch(e.target.value)} />
    <div className="sectionHeading"><h3>{M2.lanes}</h3><button aria-label={M2.addLane} title={M2.addLane} onClick={() => { const lane = { id: newId(), name: M2.newLane }; commit({ name: 'insertLane', lane, at: doc.lanes.length }); state.select([]); onLane(lane.id); }}>+</button></div>
    {doc.lanes.map((lane, index) => <div key={lane.id} className="outlineLane" onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-krono-item')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }} onDrop={(e) => {
      const id = e.dataTransfer.getData('application/x-krono-item');
      if (doc.items.some((i) => i.id === id)) { e.preventDefault(); commit(setLane(state.selection.includes(id) ? state.selection : [id], lane.id)); }
    }}>
      <div className="laneHeading">
        <button aria-label={lane.collapsed ? M2.expand : M2.collapse} aria-expanded={!lane.collapsed} onClick={() => commit({ name: 'updateLane', laneId: lane.id, patch: { collapsed: !lane.collapsed } })}>{lane.collapsed ? '›' : '⌄'}</button>
        <button className="laneTitle" title={M2.selectLane} onClick={() => { state.select([]); onLane(lane.id); }}><i style={{ background: resolveBase(lane.color ?? 'pierre') }} />{lane.name || M2.unnamedLane}</button>
        <button aria-label={M2.moveUp} disabled={index === 0} onClick={() => { const ids = doc.lanes.map((l) => l.id); [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!]; commit({ name: 'reorderLanes', ids }); }}>↑</button>
        <button aria-label={M2.moveDown} disabled={index === doc.lanes.length - 1} onClick={() => { const ids = doc.lanes.map((l) => l.id); [ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!]; commit({ name: 'reorderLanes', ids }); }}>↓</button>
      </div>
      {(!lane.collapsed || search) && matches.filter((item) => item.laneId === lane.id).map((item) => <button className="outlineItem" aria-pressed={state.selection.includes(item.id)} key={item.id} draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-krono-item', item.id); e.dataTransfer.effectAllowed = 'move'; }} onClick={() => {
        if (lane.collapsed) commit({ name: 'updateLane', laneId: lane.id, patch: { collapsed: false } });
        state.select([item.id]); onFocus(item.id);
      }}><i style={{ background: resolveBase(item.color) }} /><span>{item.label}<small>{formatDate(itemStart(item))}</small></span></button>)}
    </div>)}
    {search && !matches.length && <p>{M2.noResults}</p>}
  </section>;
}
