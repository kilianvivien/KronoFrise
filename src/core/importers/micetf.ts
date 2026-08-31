/**
 * Import d'un export MiCetF — docs/format.md §8.1.
 *
 * Format vérifié sur micetf.fr/frise (clé `micetf.frise.v1`) :
 * `{ debut, fin, principale, secondaire, oubli, evenements[], periodes[] }`,
 * un événement étant `{ date, text, couleur, distance }` et une période
 * `{ debut, fin, text, couleur, distance }`. La spécification annonçait un
 * champ `name` : les deux sont acceptés.
 *
 * Rien n'est fatal sauf l'absence des champs indispensables : un champ inconnu
 * (`distance`, `principale`…) est simplement ignoré, car il relève d'une mise
 * en page que KronoFrise recalcule.
 */
import { DOC, ERRORS } from '../../shared/strings';
import { linearAxis } from '../document';
import { newId } from '../ids';
import { SCHEMA_VERSION, type Item, type KronoDocument, type Lane } from '../types';
import { paletteFor } from './micetfColors';

interface MicetfEvent { date?: unknown; text?: unknown; name?: unknown; couleur?: unknown }
interface MicetfPeriod { debut?: unknown; fin?: unknown; text?: unknown; name?: unknown; couleur?: unknown }
interface MicetfFile {
  debut?: unknown; fin?: unknown; oubli?: unknown;
  evenements?: unknown; periodes?: unknown;
}

/** Reconnaît un export MiCetF sans le convertir — sert au choix d'importateur. */
export function isMicetf(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const file = value as MicetfFile;
  return typeof file.debut === 'number' && typeof file.fin === 'number'
    && (Array.isArray(file.evenements) || Array.isArray(file.periodes));
}

function label(entry: MicetfEvent | MicetfPeriod): string {
  const text = typeof entry.text === 'string' ? entry.text : typeof entry.name === 'string' ? entry.name : '';
  return text.trim();
}

export function importMicetf(value: unknown, now = new Date()): KronoDocument {
  if (!isMicetf(value)) throw new Error(ERRORS.notAKronoFile);
  const file = value as MicetfFile;
  const start = Math.round(file.debut as number);
  const end = Math.round(file.fin as number);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error(ERRORS.notAKronoFile);

  const lane: Lane = { id: newId(), name: DOC.defaultLaneName };
  const items: Item[] = [];

  for (const entry of asArray<MicetfEvent>(file.evenements)) {
    if (typeof entry?.date !== 'number' || !Number.isFinite(entry.date)) continue;
    items.push({
      id: newId(), kind: 'event', laneId: lane.id,
      label: label(entry) || String(Math.round(entry.date)),
      color: paletteFor(entry.couleur),
      date: { year: Math.round(entry.date) },
    });
  }
  for (const entry of asArray<MicetfPeriod>(file.periodes)) {
    if (typeof entry?.debut !== 'number' || typeof entry?.fin !== 'number') continue;
    const from = Math.round(entry.debut);
    const to = Math.round(entry.fin);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    items.push({
      id: newId(), kind: 'period', laneId: lane.id,
      label: label(entry) || `${from} – ${to}`,
      color: paletteFor(entry.couleur), shape: 'bar',
      start: { year: from }, end: { year: to },
    });
  }

  const stamp = now.toISOString();
  return {
    schema: SCHEMA_VERSION,
    id: newId(),
    meta: { title: DOC.importedTitle, createdAt: stamp, modifiedAt: stamp },
    axis: linearAxis({ year: start }, { year: end }),
    themeId: 'manuel-scolaire',
    lanes: [lane],
    items,
    // « Frise à compléter » de MiCetF = tous les libellés masqués (§5).
    pedagogy: {
      maskedItems: file.oubli === true ? items.map((item) => ({ itemId: item.id, hide: 'label' as const })) : [],
    },
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
