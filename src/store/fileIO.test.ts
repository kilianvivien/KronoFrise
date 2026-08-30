import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocument } from '../core/document';
import { openFile, saveFile } from './fileIO';

afterEach(() => vi.unstubAllGlobals());
describe('file IO adapters', () => {
  it('opens a native file and rejects invalid input before returning it', async () => {
    const doc = createDocument();
    const getFile = vi.fn().mockResolvedValue(new File([JSON.stringify(doc)], 'frise.krono'));
    vi.stubGlobal('window', { showOpenFilePicker: vi.fn().mockResolvedValue([{ getFile }]) });
    expect(await openFile()).toEqual(doc);
    getFile.mockResolvedValue(new File(['{'], 'broken.krono'));
    await expect(openFile()).rejects.toThrow(/n’est pas une frise/);
  });
  it('writes validated JSON then closes the native writable', async () => {
    const write = vi.fn().mockResolvedValue(undefined), close = vi.fn().mockResolvedValue(undefined);
    const picker = vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue({ write, close }) });
    vi.stubGlobal('window', { showSaveFilePicker: picker });
    const doc = createDocument(); expect(await saveFile(doc)).toBe(true);
    expect(write).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
    expect(JSON.parse(write.mock.calls[0]![0] as string) as unknown).toMatchObject({ id: doc.id, schema: 'krono/1' });
  });
  it('treats picker cancellation as a no-op, but surfaces write failures', async () => {
    vi.stubGlobal('window', { showOpenFilePicker: () => Promise.reject(new DOMException('cancel', 'AbortError')), showSaveFilePicker: () => Promise.reject(new DOMException('cancel', 'AbortError')) });
    expect(await openFile()).toBeNull(); expect(await saveFile(createDocument())).toBe(false);
    vi.stubGlobal('window', { showSaveFilePicker: () => Promise.reject(new Error('permission')) });
    await expect(saveFile(createDocument())).rejects.toThrow('permission');
  });
  it('downloads a .krono file when File System Access is unavailable', async () => {
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { createElement: () => link, body: { append: vi.fn() } });
    expect(await saveFile(createDocument({ title: 'Mon cours' }))).toBe(true);
    expect(link.download).toBe('Mon cours.krono'); expect(link.href).toMatch(/^blob:/);
    expect(link.click).toHaveBeenCalledOnce(); expect(link.remove).toHaveBeenCalledOnce();
  });
  it('reads an uploaded file through the input fallback', async () => {
    const doc = createDocument();
    const callbacks = new Map<string, () => void>();
    const input = { type: '', accept: '', hidden: false, files: [new File([JSON.stringify(doc)], 'cours.krono')],
      addEventListener: (name: string, fn: () => void) => { callbacks.set(name, fn); },
      click: () => callbacks.get('change')?.(), remove: vi.fn(),
    };
    vi.stubGlobal('window', {}); vi.stubGlobal('document', { createElement: () => input, body: { append: vi.fn() } });
    expect(await openFile()).toEqual(doc); expect(input.remove).toHaveBeenCalledOnce();
  });
});
