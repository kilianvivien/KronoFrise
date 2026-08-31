/**
 * Commandes — docs/format.md §6.
 *
 * Toute mutation du document passe par une commande. Une commande est une
 * **donnée sérialisable** (`{ name, payload }`), pas un objet à méthodes :
 * la pile d'annulation doit survivre à un rechargement (format.md §7), ce
 * qu'une fermeture ne permet pas. `apply` et `invert` sont donc des fonctions
 * du module. SPEC? voir docs/spec-gaps.md §5.
 *
 * Règle d'or : `apply(doc, invert(doc, c))` ramène exactement `doc`.
 */
import { produce } from 'immer';
import { compareDates } from './dates';
import {
  type Axis,
  type Item,
  type ItemImage,
  type FillStyle,
  type KDate,
  type KronoDocument,
  type Lane,
  type MaskKind,
  type PeriodShape,
  type TitleBlock,
} from './types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Champs modifiables d'un élément ; `null` efface un champ optionnel. */
export interface ItemPatch {
  label?: string;
  description?: string | null;
  color?: string;
  fillStyle?: FillStyle | null;
  laneId?: string;
  image?: ItemImage | null;
  pinnedRow?: number | null;
  date?: KDate;
  start?: KDate;
  end?: KDate;
  shape?: PeriodShape;
  fuzzyStart?: boolean | null;
  fuzzyEnd?: boolean | null;
}

/** Un élément et sa place exacte dans `doc.items` — l'annulation la restitue. */
export interface ItemSlot {
  item: Item;
  index: number;
}

export type Command =
  | { name: 'batch'; label: string; commands: Command[] }
  | { name: 'insertItems'; entries: ItemSlot[] }
  | { name: 'removeItems'; entries: ItemSlot[] }
  | { name: 'updateItems'; label: string; patches: { itemId: string; patch: ItemPatch }[] }
  | { name: 'insertLane'; lane: Lane; at: number }
  | { name: 'removeLane'; lane: Lane; at: number }
  | { name: 'updateLane'; laneId: string; patch: { name?: string; collapsed?: boolean | null; color?: string | null } }
  | { name: 'setAxis'; axis: Axis; label?: string }
  | { name: 'reorderLanes'; ids: string[] }
  | { name: 'setAuthor'; author: string | null }
  | { name: 'setTitle'; title: string }
  | { name: 'setTheme'; themeId: string }
  | { name: 'setTitleBlock'; block: TitleBlock | null }
  | { name: 'restoreMasks'; masks: KronoDocument['pedagogy']['maskedItems'] }
  | { name: 'setMask'; itemId: string; hide: MaskKind | null };

/** Étiquette technique de la commande (journal, tests, « Annuler … »). */
export function commandLabel(command: Command): string {
  switch (command.name) {
    case 'batch':
    case 'updateItems':
      return command.label;
    case 'setAxis':
      return command.label ?? command.name;
    default:
      return command.name;
  }
}

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */

export function apply(doc: KronoDocument, command: Command): KronoDocument {
  if (command.name === 'batch') {
    return command.commands.reduce((current, step) => apply(current, step), doc);
  }
  return produce(doc, (draft) => {
    switch (command.name) {
      case 'insertItems': {
        for (const { item, index } of [...command.entries].sort((a, b) => a.index - b.index)) {
          draft.items.splice(Math.min(index, draft.items.length), 0, structuredClone(item));
        }
        break;
      }
      case 'removeItems': {
        const ids = new Set(command.entries.map((e) => e.item.id));
        draft.items = draft.items.filter((item) => !ids.has(item.id));
        draft.pedagogy.maskedItems = draft.pedagogy.maskedItems.filter((m) => !ids.has(m.itemId));
        break;
      }
      case 'updateItems': {
        for (const { itemId, patch } of command.patches) {
          const item = draft.items.find((candidate) => candidate.id === itemId);
          if (item === undefined) continue;
          applyPatch(item, patch);
        }
        break;
      }
      case 'insertLane': {
        draft.lanes.splice(command.at, 0, { ...command.lane });
        break;
      }
      case 'removeLane': {
        // Les éléments ont déjà été déplacés par la commande composite
        // `deleteLane` : supprimer une bande n'efface jamais ses éléments
        // (docs/format.md §4).
        draft.lanes = draft.lanes.filter((lane) => lane.id !== command.lane.id);
        break;
      }
      case 'updateLane': {
        const lane = draft.lanes.find((candidate) => candidate.id === command.laneId);
        if (lane === undefined) break;
        if (command.patch.name !== undefined) lane.name = command.patch.name;
        if ('color' in command.patch) {
          if (command.patch.color == null) delete lane.color; else lane.color = command.patch.color;
        }
        if ('collapsed' in command.patch) {
          if (command.patch.collapsed === null || command.patch.collapsed === undefined) {
            delete lane.collapsed;
          } else {
            lane.collapsed = command.patch.collapsed;
          }
        }
        break;
      }
      case 'setAxis': {
        draft.axis = structuredClone(command.axis);
        break;
      }
      case 'reorderLanes': {
        if (command.ids.length !== draft.lanes.length || new Set(command.ids).size !== draft.lanes.length || command.ids.some((id) => !draft.lanes.some((lane) => lane.id === id))) break;
        draft.lanes = command.ids.map((id) => draft.lanes.find((lane) => lane.id === id)).filter((lane): lane is Lane => lane !== undefined);
        break;
      }
      case 'setAuthor': {
        if (command.author === null) delete draft.meta.author; else draft.meta.author = command.author;
        break;
      }
      case 'setTitle': {
        draft.meta.title = command.title;
        break;
      }
      case 'setTheme': {
        draft.themeId = command.themeId;
        break;
      }
      // `null` retire le bloc plutôt que d'y laisser un objet éteint : un
      // document sans bloc de titre est *exactement* celui d'avant M4.
      case 'setTitleBlock': {
        if (command.block === null) delete draft.titleBlock;
        else draft.titleBlock = command.block;
        break;
      }
      case 'restoreMasks': {
        draft.pedagogy.maskedItems = structuredClone(command.masks);
        break;
      }
      case 'setMask': {
        const others = draft.pedagogy.maskedItems.filter((m) => m.itemId !== command.itemId);
        draft.pedagogy.maskedItems =
          command.hide === null ? others : [...others, { itemId: command.itemId, hide: command.hide }];
        break;
      }
    }
  });
}

/** Commande exactement inverse, calculée **avant** l'application. */
export function invert(before: KronoDocument, command: Command): Command {
  switch (command.name) {
    case 'batch': {
      const inverses: Command[] = [];
      let current = before;
      for (const step of command.commands) {
        inverses.unshift(invert(current, step));
        current = apply(current, step);
      }
      return { name: 'batch', label: command.label, commands: inverses };
    }
    case 'insertItems':
      return { name: 'removeItems', entries: command.entries };
    case 'removeItems':
      return { name: 'batch', label: 'restoreItems', commands: [
        { name: 'insertItems', entries: command.entries },
        { name: 'restoreMasks', masks: before.pedagogy.maskedItems },
      ] };
    case 'updateItems': {
      return {
        name: 'updateItems',
        label: command.label,
        patches: command.patches.map(({ itemId, patch }) => ({
          itemId,
          patch: inversePatch(before.items.find((item) => item.id === itemId), patch),
        })),
      };
    }
    case 'insertLane':
      return { name: 'removeLane', lane: command.lane, at: command.at };
    case 'removeLane':
      return { name: 'insertLane', lane: command.lane, at: command.at };
    case 'updateLane': {
      const lane = before.lanes.find((candidate) => candidate.id === command.laneId);
      const patch: { name?: string; collapsed?: boolean | null; color?: string | null } = {};
      if (command.patch.name !== undefined) patch.name = lane?.name ?? '';
      if ('color' in command.patch) patch.color = lane?.color ?? null;
      if ('collapsed' in command.patch) patch.collapsed = lane?.collapsed ?? null;
      return { name: 'updateLane', laneId: command.laneId, patch };
    }
    case 'setAxis': {
      const inverse: Command = { name: 'setAxis', axis: before.axis };
      return command.label === undefined ? inverse : { ...inverse, label: command.label };
    }
    case 'reorderLanes':
      return { name: 'reorderLanes', ids: before.lanes.map((lane) => lane.id) };
    case 'setAuthor':
      return { name: 'setAuthor', author: before.meta.author ?? null };
    case 'setTitle':
      return { name: 'setTitle', title: before.meta.title };
    case 'setTheme':
      return { name: 'setTheme', themeId: before.themeId };
    case 'setTitleBlock':
      return { name: 'setTitleBlock', block: before.titleBlock ?? null };
    case 'restoreMasks':
      return { name: 'restoreMasks', masks: before.pedagogy.maskedItems };
    case 'setMask':
      return { name: 'restoreMasks', masks: before.pedagogy.maskedItems };
  }
}

/* ------------------------------------------------------------------ */
/* Fabriques nommées (docs/format.md §6 : « moveEvent », « setLabel »…) */
/* ------------------------------------------------------------------ */

export function addItems(doc: KronoDocument, items: readonly Item[]): Command {
  return {
    name: 'insertItems',
    entries: items.map((item, offset) => ({ item, index: doc.items.length + offset })),
  };
}

export function deleteItems(doc: KronoDocument, itemIds: readonly string[]): Command {
  const wanted = new Set(itemIds);
  const entries = doc.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => wanted.has(item.id));
  return { name: 'removeItems', entries };
}

export function moveEvent(itemId: string, date: KDate): Command {
  return { name: 'updateItems', label: 'moveEvent', patches: [{ itemId, patch: { date } }] };
}

export function movePeriod(itemId: string, start: KDate, end: KDate): Command {
  return { name: 'updateItems', label: 'movePeriod', patches: [{ itemId, patch: { start, end } }] };
}

export function resizePeriod(itemId: string, start: KDate, end: KDate): Command {
  return { name: 'updateItems', label: 'resizePeriod', patches: [{ itemId, patch: { start, end } }] };
}

export function setLabel(itemId: string, label: string): Command {
  return { name: 'updateItems', label: 'setLabel', patches: [{ itemId, patch: { label } }] };
}

export function setColor(itemIds: readonly string[], color: string): Command {
  return {
    name: 'updateItems',
    label: 'setColor',
    patches: itemIds.map((itemId) => ({ itemId, patch: { color } })),
  };
}

export function setLane(itemIds: readonly string[], laneId: string): Command {
  return {
    name: 'updateItems',
    label: 'setLane',
    patches: itemIds.map((itemId) => ({ itemId, patch: { laneId } })),
  };
}

export function shiftItems(doc: KronoDocument, itemIds: readonly string[], years: number): Command {
  const wanted = new Set(itemIds);
  const patches = doc.items
    .filter((item) => wanted.has(item.id))
    .map((item) => ({
      itemId: item.id,
      patch:
        item.kind === 'event'
          ? { date: shiftDate(item.date, years) }
          : { start: shiftDate(item.start, years), end: shiftDate(item.end, years) },
    }));
  return { name: 'updateItems', label: 'shiftItems', patches };
}

export function setAxis(axis: Axis): Command {
  return { name: 'setAxis', axis };
}

export function addLane(doc: KronoDocument, lane: Lane): Command {
  return { name: 'insertLane', lane, at: doc.lanes.length };
}

export function renameLane(laneId: string, name: string): Command {
  return { name: 'updateLane', laneId, patch: { name } };
}

/**
 * Supprimer une bande = déplacer ses éléments vers la première bande restante,
 * puis retirer la bande. Composite, donc une seule étape d'annulation
 * (docs/format.md §4 et §6).
 */
export function deleteLane(doc: KronoDocument, laneId: string): Command | null {
  const at = doc.lanes.findIndex((lane) => lane.id === laneId);
  const lane = doc.lanes[at];
  if (lane === undefined || doc.lanes.length <= 1) return null; // une frise garde ≥ 1 bande
  const fallback = doc.lanes.find((candidate) => candidate.id !== laneId);
  if (fallback === undefined) return null;
  const orphanIds = doc.items.filter((item) => item.laneId === laneId).map((item) => item.id);
  const steps: Command[] = [];
  if (orphanIds.length > 0) steps.push(setLane(orphanIds, fallback.id));
  steps.push({ name: 'removeLane', lane, at });
  return { name: 'batch', label: 'deleteLane', commands: steps };
}

/* ------------------------------------------------------------------ */
/* Internes                                                            */
/* ------------------------------------------------------------------ */

const OPTIONAL_KEYS = new Set(['fillStyle', 'description', 'image', 'pinnedRow', 'fuzzyStart', 'fuzzyEnd']);

function applyPatch(item: Item, patch: ItemPatch): void {
  const target = item as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete target[key];
    } else if (value !== undefined) {
      target[key] = value;
    }
  }
}

function inversePatch(item: Item | undefined, patch: ItemPatch): ItemPatch {
  const source = item as unknown as Record<string, unknown> | undefined;
  const inverse: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    const previous = source?.[key];
    inverse[key] = previous === undefined && OPTIONAL_KEYS.has(key) ? null : previous;
  }
  return inverse;
}

function shiftDate(date: KDate, years: number): KDate {
  return { ...date, year: date.year + years };
}

/** Utilitaire partagé : une période reste valide après édition. */
export function isValidPeriodRange(start: KDate, end: KDate): boolean {
  return compareDates(start, end) < 0;
}
