import { importText } from '../core/importers';
import { migrate } from '../core/migrations';
import { parseDocument } from '../core/schema';
import type { KronoDocument } from '../core/types';
import { EDITOR, ERRORS } from '../ui/strings';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
interface FileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}
interface PickerWindow {
  showOpenFilePicker?: (options: object) => Promise<FileHandle[]>;
  showSaveFilePicker?: (options: object) => Promise<FileHandle>;
}
const pickerOptions = { types: [{ description: EDITOR.fileType, accept: { 'application/json': ['.krono'] } }] };
/** À l'ouverture, on accepte aussi un export MiCetF et un tableau (format.md §8). */
const openOptions = { types: [{ description: EDITOR.importTypes, accept: { 'application/json': ['.krono', '.json'], 'text/csv': ['.csv', '.tsv', '.txt'] } }] };

export function decodeFile(text: string): KronoDocument {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw new Error(EDITOR.fileTooLarge);
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error(ERRORS.notAKronoFile); }
  return parseDocument(migrate(json));
}
export async function readFile(file: File): Promise<KronoDocument> {
  return (await readAnyFile(file)).document;
}

/** Ouverture tolérante : `.krono`, export MiCetF ou tableau (docs/format.md §8). */
export async function readAnyFile(file: File): Promise<{ document: KronoDocument; skipped: number[]; source: string }> {
  if (file.size > MAX_FILE_BYTES) throw new Error(EDITOR.fileTooLarge);
  const text = await file.text();
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw new Error(EDITOR.fileTooLarge);
  return importText(text);
}
export function serializeFile(doc: KronoDocument, now = new Date()): string {
  const text = JSON.stringify(parseDocument({ ...doc, meta: { ...doc.meta, modifiedAt: now.toISOString() } }), null, 2);
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw new Error(EDITOR.fileTooLarge);
  return text;
}
export async function openFile(): Promise<KronoDocument | null> {
  const picker = (window as PickerWindow).showOpenFilePicker;
  if (picker) {
    try {
      const [handle] = await picker(openOptions);
      return handle ? readFile(await handle.getFile()) : null;
    } catch (error) { if (isCancelled(error)) return null; throw error; }
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.krono,.json,.csv,.tsv,.txt,application/json,text/csv';
    input.addEventListener('cancel', () => { input.remove(); resolve(null); }, { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0]; input.remove();
      if (file) void readFile(file).then(resolve, reject); else resolve(null);
    }, { once: true });
    input.hidden = true; document.body.append(input); input.click();
  });
}
export async function saveFile(doc: KronoDocument): Promise<boolean> {
  const text = serializeFile(doc);
  const filename = `${doc.meta.title.replace(/[<>:"/\\|?*]/g, '_') || EDITOR.defaultFilename}.krono`;
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ ...pickerOptions, suggestedName: filename });
      const writable = await handle.createWritable(); await writable.write(text); await writable.close();
      return true;
    } catch (error) { if (isCancelled(error)) return false; throw error; }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
function isCancelled(error: unknown): boolean { return error instanceof DOMException && error.name === 'AbortError'; }
