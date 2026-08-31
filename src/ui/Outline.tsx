/**
 * Plan de la frise — DESIGN.md §3.2 : bandes et éléments, recherche, glisser
 * pour changer de bande. C'est la vue « table des matières » du document ;
 * elle ne modifie rien directement, tout passe par des commandes.
 */
import { useState, type JSX } from 'react';
import { useStore } from 'zustand';
import { setLane } from '../core/commands';
import { itemStart } from '../core/document';
import { compareDates, formatDate } from '../core/dates';
import { newId } from '../core/ids';
import { editorStore } from '../store/editor';
import { commit } from './fields';
import { Icon } from './icons';
import { resolveBase } from './palette';
import { M2 } from './strings';

export function Outline({ onLane, onFocus }: { onLane: (id: string) => void; onFocus: (id: string) => void }): JSX.Element {
  const state = useStore(editorStore), doc = state.document;
  const [search, setSearch] = useState('');
  const [dropLane, setDropLane] = useState<string | null>(null);
  const needle = search.toLocaleLowerCase('fr');
  const matches = doc.items
    .filter((item) => item.label.toLocaleLowerCase('fr').includes(needle))
    .sort((a, b) => compareDates(itemStart(a), itemStart(b)) || a.id.localeCompare(b.id));

  const move = (index: number, direction: -1 | 1): void => {
    const ids = doc.lanes.map((lane) => lane.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
    commit({ name: 'reorderLanes', ids });
  };

  return <section className="outline">
    <div className="searchField">
      <Icon name="search" />
      <input type="search" aria-label={M2.search} placeholder={M2.search} value={search} onChange={(event) => setSearch(event.target.value)} />
    </div>

    <div className="sectionHeading">
      <h3>{M2.lanes}</h3>
      <button aria-label={M2.addLane} title={M2.addLane} onClick={() => {
        const lane = { id: newId(), name: M2.newLane };
        commit({ name: 'insertLane', lane, at: doc.lanes.length });
        state.select([]); onLane(lane.id);
      }}><Icon name="plus" /></button>
    </div>

    {doc.lanes.map((lane, index) => <div key={lane.id} className="outlineLane" data-drop={dropLane === lane.id}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-krono-item')) {
          event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropLane(lane.id);
        }
      }}
      onDragLeave={() => setDropLane((current) => (current === lane.id ? null : current))}
      onDrop={(event) => {
        setDropLane(null);
        const id = event.dataTransfer.getData('application/x-krono-item');
        if (doc.items.some((item) => item.id === id)) {
          event.preventDefault();
          commit(setLane(state.selection.includes(id) ? state.selection : [id], lane.id));
        }
      }}>
      <div className="laneHeading">
        <button className="iconOnly" aria-label={lane.collapsed ? M2.expand : M2.collapse} title={lane.collapsed ? M2.expand : M2.collapse} aria-expanded={!lane.collapsed}
          onClick={() => commit({ name: 'updateLane', laneId: lane.id, patch: { collapsed: !lane.collapsed } })}>
          <Icon name={lane.collapsed ? 'chevronRight' : 'chevronDown'} />
        </button>
        <button className="laneTitle" title={M2.selectLane}
          onClick={() => { state.select([]); onLane(lane.id); }}>
          <i style={{ background: resolveBase(lane.color ?? 'pierre') }} />
          <span>{lane.name || M2.unnamedLane}</span>
        </button>
        <button className="iconOnly" aria-label={M2.moveUp} title={M2.moveUp} disabled={index === 0} onClick={() => move(index, -1)}><Icon name="arrowUp" /></button>
        <button className="iconOnly" aria-label={M2.moveDown} title={M2.moveDown} disabled={index === doc.lanes.length - 1} onClick={() => move(index, 1)}><Icon name="arrowDown" /></button>
      </div>

      {(!lane.collapsed || search !== '') && matches.filter((item) => item.laneId === lane.id).map((item) =>
        <button className="outlineItem" key={item.id} aria-pressed={state.selection.includes(item.id)} draggable
          onDragStart={(event) => { event.dataTransfer.setData('application/x-krono-item', item.id); event.dataTransfer.effectAllowed = 'move'; }}
          onClick={() => {
            if (lane.collapsed) commit({ name: 'updateLane', laneId: lane.id, patch: { collapsed: false } });
            state.select([item.id]); onFocus(item.id);
          }}>
          <i data-kind={item.kind} style={{ background: resolveBase(item.color) }} />
          <span>{item.label}<small>{formatDate(itemStart(item))}</small></span>
        </button>)}
    </div>)}

    {search !== '' && matches.length === 0 && <p className="outlineEmpty">{M2.noResults}</p>}
    {search === '' && doc.items.length === 0 && <p className="outlineEmpty">{M2.emptyOutline}</p>}
  </section>;
}
