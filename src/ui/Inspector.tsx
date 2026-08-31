/**
 * Inspecteur — DESIGN.md §3 : rangées en grille, titres de section en
 * capitales discrètes, contrôles alignés. Il édite le document sélectionné,
 * une bande, ou les éléments sélectionnés ; il ne décide de rien lui-même :
 * chaque modification est une commande annulable.
 */
import { useRef, type JSX } from 'react';
import { useStore } from 'zustand';
import { deleteLane, type ItemPatch } from '../core/commands';
import { formatDate } from '../core/dates';
import { greatPeriodsPreset } from '../core/presets';
import { editorStore } from '../store/editor';
import { themeById } from '../themes';
import { AxisEditor } from './AxisEditor';
import { Check, Choices, Colors, Field, PanelButton, commit, dateInput, reportError } from './fields';
import { Icon } from './icons';
import { importImage } from './images';
import { FillPicker } from './FillPicker';
import { ThemePicker } from './ThemePicker';
import { Worksheet } from './Worksheet';
import { FILLS, M2, TOOLBAR } from './strings';
import type { Mode } from './mode';

const SHAPES = [
  { value: 'bar' as const, label: M2.bar, icon: 'bar' as const },
  { value: 'bracket' as const, label: M2.bracket, icon: 'bracket' as const },
  { value: 'arrow' as const, label: M2.arrow, icon: 'arrow' as const },
];

export function Inspector({ laneId, onLane, fit, mode = 'edit', answerKey = false, onAnswerKey = () => {} }: {
  laneId: string | null; onLane: (id: string | null) => void; fit: () => void;
  mode?: Mode; answerKey?: boolean; onAnswerKey?: (value: boolean) => void;
}): JSX.Element {
  const state = useStore(editorStore), doc = state.document;
  const items = doc.items.filter((item) => state.selection.includes(item.id));
  const lane = !items.length ? doc.lanes.find((lane) => lane.id === laneId) : undefined;
  const item = items.length === 1 ? items[0] : undefined;
  const upload = useRef<HTMLInputElement>(null);
  const patch = (patch: ItemPatch) => commit({ name: 'updateItems', label: 'inspectItems', patches: items.map((item) => ({ itemId: item.id, patch })) });
  const back = () => { state.select([]); onLane(null); };

  if (mode === 'worksheet') return <div className="inspectorContent">
    <header className="panelHeader"><h2>{TOOLBAR.modeWorksheet}</h2></header>
    <Worksheet answerKey={answerKey} onAnswerKey={onAnswerKey} />
  </div>;

  if (lane) return <div className="inspectorContent" key={lane.id}>
    <Header title={lane.name || M2.unnamedLane} badge={M2.lane} onBack={back} />
    <section className="panelSection">
      <Field label={M2.laneName} value={lane.name} onCommit={(name) => commit({ name: 'updateLane', laneId: lane.id, patch: { name } })} />
      <Colors label={M2.laneColor} value={lane.color ?? 'pierre'} onChange={(color) => commit({ name: 'updateLane', laneId: lane.id, patch: { color } })} />
      <Check label={M2.collapse} value={!!lane.collapsed} onChange={(collapsed) => commit({ name: 'updateLane', laneId: lane.id, patch: { collapsed } })} />
      <PanelButton icon="trash" danger label={M2.deleteLane} disabled={doc.lanes.length <= 1}
        onClick={() => { const command = deleteLane(doc, lane.id); if (command) { commit(command); onLane(null); } }} />
    </section>
  </div>;

  if (items.length) return <div className="inspectorContent" key={items.map((i) => i.id).join(',')}>
    <Header
      title={item ? item.label || M2.item : M2.selectionCount(items.length)}
      badge={item ? (item.kind === 'event' ? M2.event : M2.period) : M2.item}
      onBack={back}
    />
    {item && <section className="panelSection">
      <h3>{M2.details}</h3>
      <Field label={M2.label} value={item.label} onCommit={(label) => patch({ label })} />
      <Field label={M2.description} value={item.description ?? ''} multiline onCommit={(description) => patch({ description: description || null })} />
      {item.kind === 'event' ? <>
        <Field label={M2.date} value={formatDate(item.date)} onCommit={(value) => patch({ date: dateInput(value) })} />
        <Check label={M2.circa} value={!!item.date.circa} onChange={(circa) => patch({ date: { ...item.date, circa } })} />
      </> : <>
        <Field label={M2.start} value={formatDate(item.start)} onCommit={(value) => patch({ start: dateInput(value) })} />
        <Field label={M2.end} value={formatDate(item.end)} onCommit={(value) => patch({ end: dateInput(value) })} />
        <Choices label={M2.shape} value={item.shape} options={SHAPES} onChange={(shape) => patch({ shape })} />
        <Check label={M2.fuzzyStart} value={!!item.fuzzyStart} onChange={(fuzzyStart) => patch({ fuzzyStart })} />
        <Check label={M2.fuzzyEnd} value={!!item.fuzzyEnd} onChange={(fuzzyEnd) => patch({ fuzzyEnd })} />
      </>}
    </section>}

    <section className="panelSection">
      <h3>{M2.appearance}</h3>
      <Colors value={items[0]!.color} onChange={(color) => patch({ color })} />
      <FillPicker value={items.every((i) => (i.fillStyle ?? 'tint') === (items[0]!.fillStyle ?? 'tint')) ? (items[0]!.fillStyle ?? 'tint') : null}
        color={items[0]!.color} theme={themeById(doc.themeId)} disabled={items.every((i) => i.kind === 'period' && i.shape === 'bracket')}
        onChange={(fillStyle) => patch({ fillStyle: fillStyle === 'tint' ? null : fillStyle })} />
      {items.some((i) => i.kind === 'period' && i.shape === 'bracket') && <p>{FILLS.bracketHint}</p>}
    </section>

    <section className="panelSection">
      <h3>{M2.placement}</h3>
      <label className="field"><span>{M2.lane}</span>
        <select value={items.every((i) => i.laneId === items[0]!.laneId) ? items[0]!.laneId : ''} onChange={(e) => patch({ laneId: e.target.value })}>
          <option value="" disabled>—</option>
          {doc.lanes.map((l) => <option key={l.id} value={l.id}>{l.name || M2.unnamedLane}</option>)}
        </select>
      </label>
      {item && <>
        <Check label={M2.pinned} value={item.pinnedRow !== undefined} onChange={(pinned) => patch({ pinnedRow: pinned ? 0 : null })} />
        {item.pinnedRow !== undefined && <Field label={M2.row} type="number" value={String(item.pinnedRow + 1)} onCommit={(value) => patch({ pinnedRow: Number(value) - 1 })} />}
      </>}
      {!item && <p>{M2.multiHint}</p>}
    </section>

    {item?.kind === 'event' && <section className="panelSection imageField">
      <h3>{M2.image}</h3>
      {item.image ? <img src={item.image.src} alt={item.label} /> : <p>{M2.imageHint}</p>}
      <input hidden type="file" ref={upload} accept="image/png,image/jpeg,image/webp" onChange={(event) => {
        const file = event.target.files?.[0]; event.target.value = '';
        const id = item.id, documentId = doc.id;
        if (file) void importImage(file).then((image) => {
          const current = editorStore.getState();
          if (current.document.id === documentId && current.document.items.some((i) => i.id === id)) commit({ name: 'updateItems', label: 'setImage', patches: [{ itemId: id, patch: { image } }] });
        }).catch(reportError);
      }} />
      <div className="row">
        <PanelButton icon="image" label={item.image ? M2.replaceImage : M2.addImage} onClick={() => upload.current?.click()} />
        {item.image && <PanelButton icon="trash" danger label={M2.removeImage} onClick={() => patch({ image: null })} />}
      </div>
    </section>}
  </div>;

  return <div className="inspectorContent">
    <header className="panelHeader"><h2>{M2.document}</h2></header>
    <section className="panelSection">
      <Field label={M2.title} value={doc.meta.title} onCommit={(title) => commit({ name: 'setTitle', title })} />
      <Field label={M2.author} value={doc.meta.author ?? ''} onCommit={(author) => commit({ name: 'setAuthor', author: author || null })} />
    </section>
    <section className="panelSection">
      <h3>{M2.theme}</h3>
      <ThemePicker value={doc.themeId} onChange={(themeId) => commit({ name: 'setTheme', themeId })} />
    </section>
    <section className="panelSection">
      <h3>{M2.preset}</h3>
      <p>{M2.presetHint}</p>
      <PanelButton icon="preset" label={M2.presetAction} onClick={() => { commit(greatPeriodsPreset(doc)); fit(); }} />
    </section>
    <AxisEditor axis={doc.axis} />
  </div>;
}

function Header({ title, badge, onBack }: { title: string; badge: string; onBack: () => void }): JSX.Element {
  return <header className="panelHeader">
    <button className="panelBack" aria-label={M2.backToDocument} onClick={onBack}><Icon name="back" /></button>
    <h2>{title}</h2>
    <span className="badge">{badge}</span>
  </header>;
}
