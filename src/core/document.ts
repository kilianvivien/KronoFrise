/**
 * Fabrique et accesseurs du document — docs/format.md §2.
 * Aucune mutation ici : toute modification passe par une commande (§6).
 */
import { DOC } from '../shared/strings';
import { compareDates, toFractionalYear } from './dates';
import { newId } from './ids';
import {
  SCHEMA_VERSION,
  type Axis,
  type Item,
  type KDate,
  type KronoDocument,
  type Lane,
} from './types';

export const DEFAULT_THEME_ID = 'manuel-scolaire';

export interface CreateDocumentOptions {
  title?: string;
  axis?: Axis;
  now?: Date;
}

/** Axe linéaire : un seul segment (docs/format.md §3). */
export function linearAxis(start: KDate, end: KDate): Axis {
  return { start, end, segments: [{ until: end, weight: 1 }] };
}

export function createDocument(options: CreateDocumentOptions = {}): KronoDocument {
  const now = (options.now ?? new Date()).toISOString();
  const currentYear = (options.now ?? new Date()).getUTCFullYear();
  const axis = options.axis ?? linearAxis({ year: currentYear - 100 }, { year: currentYear });
  const lane: Lane = { id: newId(), name: DOC.defaultLaneName };
  return {
    schema: SCHEMA_VERSION,
    id: newId(),
    meta: {
      title: options.title ?? DOC.untitled,
      createdAt: now,
      modifiedAt: now,
    },
    axis,
    themeId: DEFAULT_THEME_ID,
    lanes: [lane],
    items: [],
    pedagogy: { maskedItems: [] },
  };
}

export function findItem(doc: KronoDocument, itemId: string): Item | undefined {
  return doc.items.find((item) => item.id === itemId);
}

export function findLane(doc: KronoDocument, laneId: string): Lane | undefined {
  return doc.lanes.find((lane) => lane.id === laneId);
}

export function itemsOfLane(doc: KronoDocument, laneId: string): Item[] {
  return doc.items.filter((item) => item.laneId === laneId);
}

/** Date de début d'un élément, quel que soit son genre. */
export function itemStart(item: Item): KDate {
  return item.kind === 'event' ? item.date : item.start;
}

/** Date de fin ; pour un événement, c'est sa date. */
export function itemEnd(item: Item): KDate {
  return item.kind === 'event' ? item.date : item.end;
}

/** Étendue en années fractionnaires, pour la mise en page et l'échelle. */
export function itemSpan(item: Item): { from: number; to: number } {
  return { from: toFractionalYear(itemStart(item)), to: toFractionalYear(itemEnd(item)) };
}

/** Ordre chronologique canonique (ordre de tabulation, mode présentation). */
export function chronological(items: readonly Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byStart = compareDates(itemStart(a), itemStart(b));
    if (byStart !== 0) return byStart;
    return compareDates(itemEnd(a), itemEnd(b));
  });
}

/** Un élément peut vivre hors de l'axe : on ne le supprime ni ne le rogne jamais. */
export function isWithinAxis(doc: KronoDocument, item: Item): boolean {
  const axisStart = toFractionalYear(doc.axis.start);
  const axisEnd = toFractionalYear(doc.axis.end);
  const { from, to } = itemSpan(item);
  return to >= axisStart && from <= axisEnd;
}

export function maskOf(doc: KronoDocument, itemId: string): 'label' | 'date' | 'both' | undefined {
  return doc.pedagogy.maskedItems.find((m) => m.itemId === itemId)?.hide;
}
