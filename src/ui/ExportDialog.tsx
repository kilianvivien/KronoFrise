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
import { exportExercise } from '../export/exercise';
import { paginate, sceneHeightFor, sceneWidthFor, type Orientation, type PageSize } from '../export/paper';
import { canvasMeasurer } from './measureText';
import { Check, Choices } from './fields';
import { Icon, type IconName } from './icons';
import { EXPORT } from './strings';
import styles from './Editor.module.css';

type Format = 'pdf' | 'html' | 'svg' | 'png';

/** Largeur de scène des exports d'image, en pixels CSS (DESIGN.md §3.6). */
const IMAGE_WIDTH = 1600;

const FORMATS: { value: Format; label: string; icon: IconName }[] = [
  { value: 'pdf', label: EXPORT.pdf, icon: 'pdf' },
  { value: 'html', label: EXPORT.html, icon: 'web' },
  { value: 'svg', label: EXPORT.svg, icon: 'vector' },
  { value: 'png', label: EXPORT.png, icon: 'raster' },
];

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
  const [answerKey, setAnswerKey] = useState(false);
  const [exercise, setExercise] = useState(false);
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
        const settings = { ...paper, pages, worksheet, answerKey, measurer: canvasMeasurer };
        const bytes = exercise ? await exportExercise(doc, settings) : await exportPdf(doc, settings);
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
        const blob = await exportPng(doc, { width: IMAGE_WIDTH, ratio, worksheet, measurer: canvasMeasurer, ...(transparent ? { transparent: true } : {}) });
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
      <fieldset className="exportFormats">
        <legend className="srOnly">{EXPORT.format}</legend>
        {FORMATS.map(({ value, label, icon }) =>
          <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)}>
            <Icon name={icon} />{label}
          </button>)}
      </fieldset>

      {format === 'pdf' && <>
        <Choices label={EXPORT.pageSize} value={size} onChange={setSize}
          options={[{ value: 'a4' as const, label: EXPORT.a4, text: EXPORT.a4 }, { value: 'a3' as const, label: EXPORT.a3, text: EXPORT.a3 }]} />
        <Choices label={EXPORT.orientation} value={orientation} onChange={setOrientation}
          options={[{ value: 'landscape' as const, label: EXPORT.landscape, text: EXPORT.landscape }, { value: 'portrait' as const, label: EXPORT.portrait, text: EXPORT.portrait }]} />
        <Check wide label={EXPORT.wall} value={wall} onChange={setWall} />
        {wall && <>
          <label className="field"><span>{EXPORT.pages(pages)}</span>
            <input type="range" aria-label={EXPORT.pages(pages)} min={2} max={12} value={pages} onChange={(event) => setPages(Number(event.target.value))} />
          </label>
          <p className="note"><Icon name="wall" />{EXPORT.wallHint}</p>
        </>}
        <Check wide label={EXPORT.exercise} value={exercise} onChange={setExercise} />
        {exercise && <p className="note"><Icon name="scissors" />{EXPORT.exerciseHint}</p>}
        {worksheet && !exercise && <>
          <Check wide label={EXPORT.answerKey} value={answerKey} onChange={setAnswerKey} />
          {answerKey && <p className="note"><Icon name="check" />{EXPORT.answerKeyHint}</p>}
        </>}
      </>}

      {format === 'png' && <>
        <Choices label={EXPORT.resolution} value={String(ratio)} onChange={(value) => setRatio(Number(value))}
          options={[1, 2, 3].map((value) => ({ value: String(value), label: `${value}×`, text: `${value}×` }))} />
        <Check wide label={EXPORT.transparent} value={transparent} onChange={setTransparent} />
      </>}

      {format === 'html' && <p className="note"><Icon name="web" />{EXPORT.htmlHint}</p>}
      {worksheet && <p className="note"><Icon name="mask" />{EXPORT.worksheetHint}</p>}
      <p className="summary" role="status">{format === 'pdf'
        ? EXPORT.pages(sheet.pages.length * (answerKey && worksheet && !exercise ? 2 : 1) + (exercise ? 1 : 0))
        : scene === null ? '' : EXPORT.size(Math.round(scene.width * (format === 'png' ? ratio : 1)), Math.round(scene.height * (format === 'png' ? ratio : 1)))}</p>
      {error !== null && <p className="exportError" role="alert">{error}</p>}
    </div>
    <div className={styles.dialogActions}>
      <button className={styles.button} onClick={onClose}>{EXPORT.cancel}</button>
      <button className={styles.primary} disabled={busy} onClick={() => { void run(); }}>{busy ? EXPORT.working : EXPORT.action}</button>
    </div>
  </dialog>;
}
