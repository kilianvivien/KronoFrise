/**
 * Exporter — PLAN.md §3.6 et docs/format.md §9.
 *
 * Le PDF vectoriel est la sortie phare : A4/A3, portrait ou paysage, et la
 * frise murale répartie sur plusieurs feuilles à assembler. SVG et PNG sortent
 * de la même scène. La fiche élève s'exporte telle qu'elle s'affiche.
 */
import { useEffect, useRef, useState, type JSX } from 'react';
import { useStore } from 'zustand';
import { editorStore } from '../store/editor';
import { downloadBlob } from '../export/download';
import { exportFilename, exportPng, exportScene, exportSvg } from '../export/render';
import { exportHtml } from '../export/html';
import { exportPdf } from '../export/pdf';
import { paginate, sceneHeightFor, sceneWidthFor, type Orientation, type PageSize } from '../export/paper';
import { canvasMeasurer } from './measureText';
import { EXPORT } from './strings';
import styles from './Editor.module.css';

type Format = 'pdf' | 'html' | 'svg' | 'png';

/** Largeur de scène des exports d'image, en pixels CSS (DESIGN.md §3.6). */
const IMAGE_WIDTH = 1600;

export function ExportDialog({ worksheet, onClose, onDone }: {
  worksheet: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}): JSX.Element {
  const doc = useStore(editorStore, (state) => state.document);
  const dialog = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<Format>('pdf');
  const [size, setSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [wall, setWall] = useState(false);
  const [pages, setPages] = useState(3);
  const [ratio, setRatio] = useState(2);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { dialog.current?.showModal(); }, []);

  const paper = { size, orientation, wall };
  const sheet = paginate(
    sceneWidthFor(paper, wall ? pages : 1),
    sceneHeightFor(paper),
    paper,
  );

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      if (format === 'pdf') {
        const bytes = await exportPdf(doc, { ...paper, pages, worksheet, measurer: canvasMeasurer });
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
        if (await downloadBlob(blob, exportFilename(doc, 'pdf', 'frise'), EXPORT.pdf, 'application/pdf', '.pdf')) onDone(EXPORT.done);
      } else if (format === 'html') {
        const html = await exportHtml(doc, { width: IMAGE_WIDTH, worksheet, measurer: canvasMeasurer });
        const blob = new Blob([html], { type: 'text/html' });
        if (await downloadBlob(blob, exportFilename(doc, 'html', 'frise'), EXPORT.html, 'text/html', '.html')) onDone(EXPORT.done);
      } else if (format === 'svg') {
        const svg = await exportSvg(doc, { width: IMAGE_WIDTH, worksheet, measurer: canvasMeasurer });
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        if (await downloadBlob(blob, exportFilename(doc, 'svg', 'frise'), EXPORT.svg, 'image/svg+xml', '.svg')) onDone(EXPORT.done);
      } else {
        const blob = await exportPng(doc, { width: IMAGE_WIDTH, ratio, transparent, worksheet, measurer: canvasMeasurer });
        if (await downloadBlob(blob, exportFilename(doc, 'png', 'frise'), EXPORT.png, 'image/png', '.png')) onDone(EXPORT.done);
      }
      onClose();
    } catch { setError(EXPORT.failed); }
    finally { setBusy(false); }
  };

  const scene = format === 'pdf' || format === 'html' ? null : exportScene(doc, { width: IMAGE_WIDTH, worksheet, measurer: canvasMeasurer });

  return <dialog ref={dialog} className={styles.dialog} onCancel={onClose} aria-labelledby="export-title">
    <h2 id="export-title">{EXPORT.title}</h2>
    <div className="exportForm">
      <fieldset>
        <legend>{EXPORT.format}</legend>
        {([['pdf', EXPORT.pdf], ['html', EXPORT.html], ['svg', EXPORT.svg], ['png', EXPORT.png]] as const).map(([value, label]) =>
          <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)}>{label}</button>)}
      </fieldset>

      {format === 'pdf' && <>
        <fieldset>
          <legend>{EXPORT.pageSize}</legend>
          {([['a4', EXPORT.a4], ['a3', EXPORT.a3]] as const).map(([value, label]) =>
            <button key={value} type="button" aria-pressed={size === value} onClick={() => setSize(value)}>{label}</button>)}
        </fieldset>
        <fieldset>
          <legend>{EXPORT.orientation}</legend>
          {([['landscape', EXPORT.landscape], ['portrait', EXPORT.portrait]] as const).map(([value, label]) =>
            <button key={value} type="button" aria-pressed={orientation === value} onClick={() => setOrientation(value)}>{label}</button>)}
        </fieldset>
        <label className="check"><input type="checkbox" checked={wall} onChange={(event) => setWall(event.target.checked)} />{EXPORT.wall}</label>
        {wall && <>
          <label className="field">{EXPORT.pages(pages)}
            <input type="range" min={2} max={12} value={pages} onChange={(event) => setPages(Number(event.target.value))} />
          </label>
          <p>{EXPORT.wallHint}</p>
        </>}
        <p role="status">{EXPORT.pages(sheet.pages.length)}</p>
      </>}

      {format === 'png' && <>
        <fieldset>
          <legend>{EXPORT.resolution}</legend>
          {[1, 2, 3].map((value) =>
            <button key={value} type="button" aria-pressed={ratio === value} onClick={() => setRatio(value)}>{value}×</button>)}
        </fieldset>
        <label className="check"><input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} />{EXPORT.transparent}</label>
      </>}

      {scene !== null && <p role="status">{`${Math.round(scene.width * (format === 'png' ? ratio : 1))} × ${Math.round(scene.height * (format === 'png' ? ratio : 1))} px`}</p>}
      {format === 'html' && <p>{EXPORT.htmlHint}</p>}
      {worksheet && <p>{EXPORT.worksheetHint}</p>}
      {error !== null && <p className="exportError" role="alert">{error}</p>}
    </div>
    <div className={styles.dialogActions}>
      <button className={styles.button} onClick={onClose}>{EXPORT.cancel}</button>
      <button className={styles.primary} disabled={busy} onClick={() => { void run(); }}>{busy ? EXPORT.working : EXPORT.action}</button>
    </div>
  </dialog>;
}
