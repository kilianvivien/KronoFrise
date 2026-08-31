/**
 * Choix de l'importateur — docs/format.md §8.
 *
 * Un fichier déposé peut être une frise `.krono`, un export MiCetF ou un
 * tableau collé depuis un tableur : on reconnaît la forme plutôt que
 * l'extension, qui ment souvent.
 */
import { ERRORS } from '../../shared/strings';
import { migrate } from '../migrations';
import { parseDocument } from '../schema';
import { SCHEMA_VERSION, type KronoDocument } from '../types';
import { csvItems, importCsv, type CsvImport, type CsvRows } from './csv';
import { importMicetf, isMicetf } from './micetf';

export { csvItems, importCsv, importMicetf, isMicetf };
export type { CsvImport, CsvRows };

export interface ImportResult {
  document: KronoDocument;
  /** lignes ignorées lors d'un import tabulaire */
  skipped: number[];
  source: 'krono' | 'micetf' | 'csv';
}

export function importText(text: string): ImportResult {
  const trimmed = text.trim();
  if (trimmed === '') throw new Error(ERRORS.notAKronoFile);
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let json: unknown;
    try { json = JSON.parse(trimmed); } catch { throw new Error(ERRORS.notAKronoFile); }
    if (json !== null && typeof json === 'object' && 'schema' in json) {
      return { document: parseDocument(migrate(json)), skipped: [], source: 'krono' };
    }
    if (isMicetf(json)) return { document: parseDocument(importMicetf(json)), skipped: [], source: 'micetf' };
    // Un JSON sans schéma ni forme MiCetF n'est pas une frise.
    if (!('schema' in Object(json))) throw new Error(ERRORS.notAKronoFile);
  }
  const csv = importCsv(trimmed);
  return { document: parseDocument(csv.document), skipped: csv.skipped, source: 'csv' };
}

export { SCHEMA_VERSION };
