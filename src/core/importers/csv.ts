/**
 * Import CSV / presse-papiers — docs/format.md §8.2.
 *
 * Les professeurs ont déjà leurs listes dans un tableur : on accepte `;`, `,`
 * ou une tabulation, on reconnaît les colonnes par leur en-tête (sans tenir
 * compte de la casse ni des accents), et on lit les dates avec le même
 * analyseur que l'inspecteur — « v. 800 », « -52 », « XVIe siècle ».
 *
 * Une ligne illisible n'interrompt jamais l'import : elle est signalée.
 */
import { DOC } from '../../shared/strings';
import { compareDates, parseDateInput, toFractionalYear } from '../dates';
import { linearAxis } from '../document';
import { newId } from '../ids';
import { SCHEMA_VERSION, type Item, type KDate, type KronoDocument, type Lane } from '../types';
import { paletteFor } from './micetfColors';
import { PALETTE, type PaletteId } from '../../shared/palette';

export interface CsvImport {
  document: KronoDocument;
  /** numéros des lignes ignorées (1 = première ligne de données) */
  skipped: number[];
}

const SEPARATORS = [';', '\t', ','] as const;

/** Le séparateur est celui qui découpe le plus la première ligne. */
export function detectSeparator(firstLine: string): string {
  let best: string = SEPARATORS[0];
  let count = -1;
  for (const separator of SEPARATORS) {
    const found = firstLine.split(separator).length;
    if (found > count) { count = found; best = separator; }
  }
  return best;
}

/** « Libellé », « libelle », « LIBELLÉ » — même colonne. */
function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^"|"$/g, '');
}

const COLUMNS: Record<'start' | 'end' | 'label' | 'description' | 'color', readonly string[]> = {
  start: ['date', 'debut', 'annee', 'an'],
  end: ['fin', 'jusqu_a', 'jusqua'],
  label: ['libelle', 'titre', 'nom', 'evenement', 'texte'],
  description: ['description', 'detail', 'details', 'note'],
  color: ['couleur', 'color'],
};

function splitLine(line: string, separator: string): string[] {
  // Guillemets simples : « "Louis XIV, roi"; 1643 » reste une seule cellule.
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i] as string;
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i++; }
      else quoted = !quoted;
    } else if (char === separator && !quoted) { cells.push(current); current = ''; }
    else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function paletteId(value: string): PaletteId {
  const wanted = normalizeHeader(value);
  const entry = PALETTE.find((color) => normalizeHeader(color.name) === wanted || color.id === wanted);
  return entry?.id ?? paletteFor(wanted);
}

export interface CsvRows {
  items: Item[];
  /** numéros des lignes ignorées (1 = première ligne de données) */
  skipped: number[];
}

/**
 * Lignes d'un tableau converties en éléments d'une bande donnée. Sert à
 * l'import d'un fichier comme au collage dans une frise déjà ouverte.
 */
export function csvItems(text: string, laneId: string): CsvRows {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) throw new Error(EMPTY);
  const separator = detectSeparator(lines[0] as string);
  const header = splitLine(lines[0] as string, separator).map(normalizeHeader);

  const index = { start: -1, end: -1, label: -1, description: -1, color: -1 };
  for (const key of Object.keys(index) as (keyof typeof index)[]) {
    index[key] = header.findIndex((cell) => (COLUMNS[key] ?? []).includes(cell));
  }
  // Sans en-tête reconnu, on suppose l'ordre canonique « date ; libellé ; description ».
  const hasHeader = index.start >= 0 || index.label >= 0;
  if (!hasHeader) { index.start = 0; index.label = 1; index.description = 2; }

  const items: Item[] = [];
  const skipped: number[] = [];
  const rows = hasHeader ? lines.slice(1) : lines;

  rows.forEach((line, offset) => {
    const cells = splitLine(line, separator);
    const cell = (position: number): string => (position >= 0 ? cells[position] ?? '' : '');
    const start = parseDateInput(cell(index.start));
    const label = cell(index.label).trim();
    if (start === null || label === '') { skipped.push(offset + 1); return; }
    const description = cell(index.description).trim();
    const color = cell(index.color).trim();
    const base = {
      id: newId(), laneId, label,
      color: color === '' ? 'brique' : paletteId(color),
      ...(description === '' ? {} : { description }),
    };
    const end = parseDateInput(cell(index.end));
    if (end !== null && compareDates(start, end) < 0) {
      items.push({ ...base, kind: 'period', start, end, shape: 'bar' });
    } else {
      items.push({ ...base, kind: 'event', date: start });
    }
  });

  return { items, skipped };
}

export function importCsv(text: string, now = new Date()): CsvImport {
  const lane: Lane = { id: newId(), name: DOC.defaultLaneName };
  const { items, skipped } = csvItems(text, lane.id);
  if (items.length === 0) throw new Error(EMPTY);

  const stamp = now.toISOString();
  return {
    document: {
      schema: SCHEMA_VERSION,
      id: newId(),
      meta: { title: DOC.importedTitle, createdAt: stamp, modifiedAt: stamp },
      axis: axisFor(items),
      themeId: 'manuel-scolaire',
      lanes: [lane],
      items,
      pedagogy: { maskedItems: [] },
    },
    skipped,
  };
}

/** L'axe encadre les éléments importés, arrondi à une décennie de marge. */
function axisFor(items: readonly Item[]): KronoDocument['axis'] {
  const years = items.flatMap((item) => item.kind === 'event'
    ? [toFractionalYear(item.date)]
    : [toFractionalYear(item.start), toFractionalYear(item.end)]);
  const min = Math.floor(Math.min(...years));
  const max = Math.ceil(Math.max(...years));
  const margin = Math.max(1, Math.round((max - min) * 0.05));
  const start: KDate = { year: min - margin };
  const end: KDate = { year: max + margin };
  return linearAxis(start, end);
}

/** Message d'erreur d'un collage vide ou incompréhensible. */
export const EMPTY = 'Aucune ligne exploitable. Attendu : une date, un libellé, et éventuellement une fin, une description et une couleur.';
