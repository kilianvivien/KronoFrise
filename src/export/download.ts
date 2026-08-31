/**
 * Remise du fichier exporté à l'utilisateur.
 *
 * Même logique que `store/fileIO.ts` : le sélecteur système quand le
 * navigateur le propose, sinon un lien de téléchargement (PLAN.md §6, Safari).
 */
interface FileHandle {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
}
interface PickerWindow {
  showSaveFilePicker?: (options: object) => Promise<FileHandle>;
}

export async function downloadBlob(blob: Blob, filename: string, description: string, mime: string, extension: string): Promise<boolean> {
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: filename, types: [{ description, accept: { [mime]: [extension] } }] });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      throw error;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
