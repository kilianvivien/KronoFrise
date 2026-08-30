import { useRef, type JSX } from 'react';
import { useStore } from 'zustand';
import { deleteLane, type ItemPatch } from '../core/commands';
import { formatDate } from '../core/dates';
import { greatPeriodsPreset } from '../core/presets';
import { editorStore } from '../store/editor';
import { THEMES } from '../themes';
import { AxisEditor } from './AxisEditor';
import { Check, Colors, Field, commit, dateInput, reportError } from './fields';
import { importImage } from './images';
import { M2 } from './strings';

export function Inspector({ laneId, onLane, fit }: { laneId: string | null; onLane: (id: string | null) => void; fit: () => void }): JSX.Element {
  const state = useStore(editorStore), doc = state.document;
  const items = doc.items.filter((item) => state.selection.includes(item.id));
  const lane = !items.length ? doc.lanes.find((lane) => lane.id === laneId) : undefined;
  const item = items.length === 1 ? items[0] : undefined;
  const upload = useRef<HTMLInputElement>(null);
  const patch = (patch: ItemPatch) => commit({ name: 'updateItems', label: 'inspectItems', patches: items.map((item) => ({ itemId: item.id, patch })) });
  return <div className="inspectorContent">
    <nav className="panelTabs"><button aria-pressed={!items.length && !lane} onClick={() => { state.select([]); onLane(null); }}>{M2.document}</button><span>{lane ? M2.lane : items.length ? M2.item : ''}</span></nav>
    {lane ? <section className="panelSection" key={lane.id}>
      <Field label={M2.laneName} value={lane.name} onCommit={(name) => commit({ name: 'updateLane', laneId: lane.id, patch: { name } })} />
      <Colors label={M2.laneColor} value={lane.color ?? 'pierre'} onChange={(color) => commit({ name: 'updateLane', laneId: lane.id, patch: { color } })} />
      <Check label={M2.collapse} value={!!lane.collapsed} onChange={(collapsed) => commit({ name: 'updateLane', laneId: lane.id, patch: { collapsed } })} />
      <button disabled={doc.lanes.length <= 1} onClick={() => { const command = deleteLane(doc, lane.id); if (command) { commit(command); onLane(null); } }}>{M2.deleteLane}</button>
    </section> : items.length ? <section className="panelSection" key={items.map((i) => i.id).join(',')}>
      <h3>{item ? item.kind === 'event' ? M2.event : M2.period : M2.item}</h3>
      {item && <>
        <Field label={M2.label} value={item.label} onCommit={(label) => patch({ label })} />
        <Field label={M2.description} value={item.description ?? ''} multiline onCommit={(description) => patch({ description: description || null })} />
        {item.kind === 'event' ? <>
          <Field label={M2.date} value={formatDate(item.date)} onCommit={(value) => patch({ date: dateInput(value) })} />
          <Check label={M2.circa} value={!!item.date.circa} onChange={(circa) => patch({ date: { ...item.date, circa } })} />
        </> : <>
          <Field label={M2.start} value={formatDate(item.start)} onCommit={(value) => patch({ start: dateInput(value) })} />
          <Field label={M2.end} value={formatDate(item.end)} onCommit={(value) => patch({ end: dateInput(value) })} />
          <label className="field">{M2.shape}<select value={item.shape} onChange={(e) => patch({ shape: e.target.value as 'bar' | 'arrow' | 'bracket' })}><option value="bar">{M2.bar}</option><option value="bracket">{M2.bracket}</option><option value="arrow">{M2.arrow}</option></select></label>
          <Check label={M2.fuzzyStart} value={!!item.fuzzyStart} onChange={(fuzzyStart) => patch({ fuzzyStart })} />
          <Check label={M2.fuzzyEnd} value={!!item.fuzzyEnd} onChange={(fuzzyEnd) => patch({ fuzzyEnd })} />
        </>}
      </>}
      <Colors value={items[0]!.color} onChange={(color) => patch({ color })} />
      <label className="field">{M2.lane}<select value={items.every((i) => i.laneId === items[0]!.laneId) ? items[0]!.laneId : ''} onChange={(e) => patch({ laneId: e.target.value })}><option value="" disabled>—</option>{doc.lanes.map((l) => <option key={l.id} value={l.id}>{l.name || M2.unnamedLane}</option>)}</select></label>
      {item && <>
        <Check label={M2.pinned} value={item.pinnedRow !== undefined} onChange={(pinned) => patch({ pinnedRow: pinned ? 0 : null })} />
        {item.pinnedRow !== undefined && <Field label={M2.row} type="number" value={String(item.pinnedRow + 1)} onCommit={(value) => patch({ pinnedRow: Number(value) - 1 })} />}
        {item.kind === 'event' && <div className="imageField"><h3>{M2.image}</h3><p>{M2.imageHint}</p>
          {item.image && <img src={item.image.src} alt={item.label} />}
          <input hidden type="file" ref={upload} accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            const file = event.target.files?.[0]; event.target.value = '';
            const id = item.id, documentId = doc.id;
            if (file) void importImage(file).then((image) => {
              const current = editorStore.getState();
              if (current.document.id === documentId && current.document.items.some((i) => i.id === id)) commit({ name: 'updateItems', label: 'setImage', patches: [{ itemId: id, patch: { image } }] });
            }).catch(reportError);
          }} />
          <button onClick={() => upload.current?.click()}>{M2.addImage}</button>
          {item.image && <button onClick={() => patch({ image: null })}>{M2.removeImage}</button>}
        </div>}
      </>}
      {!item && <p>{M2.multiHint}</p>}
    </section> : <>
      <section className="panelSection"><Field label={M2.title} value={doc.meta.title} onCommit={(title) => commit({ name: 'setTitle', title })} /><Field label={M2.author} value={doc.meta.author ?? ''} onCommit={(author) => commit({ name: 'setAuthor', author: author || null })} />
        <label className="field">{M2.theme}<select value={doc.themeId} onChange={(e) => commit({ name: 'setTheme', themeId: e.target.value })}>{THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
        <button title={M2.presetHint} onClick={() => { commit(greatPeriodsPreset(doc)); fit(); }}>{M2.preset}</button>
      </section><AxisEditor axis={doc.axis} />
    </>}
  </div>;
}
