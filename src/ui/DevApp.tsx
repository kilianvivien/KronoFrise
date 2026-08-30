/**
 * Page de développement M0 — critère de sortie du jalon : afficher les
 * fixtures de docs/format.md §10 à n'importe quel zoom, règle adaptative
 * comprise. L'éditeur (M1) la remplacera.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { FIXTURES } from '../core/fixtures/index';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { Frise } from '../renderer/Frise';
import { themeById } from '../themes/index';
import styles from './DevApp.module.css';
import { canvasMeasurer } from './measureText';
import { APP_NAME, DEV, TOOLBAR } from './strings';

const ZOOM_STEPS = [1, 1.5, 2, 3, 5, 8, 12, 20, 40, 80, 160, 320];

export function DevApp(): JSX.Element {
  const [fixtureIndex, setFixtureIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(600);
  const canvasRef = useRef<HTMLDivElement>(null);

  const entry = FIXTURES[fixtureIndex] ?? FIXTURES[0]!;
  const doc = entry.document;

  useEffect(() => {
    const element = canvasRef.current;
    if (element === null) return;
    const observer = new ResizeObserver(([box]) => {
      if (box === undefined) return;
      setWidth(box.contentRect.width);
      setHeight(box.contentRect.height);
    });
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, []);

  const scale = useMemo(() => makeScale(doc.axis, width, pan, zoom), [doc.axis, width, pan, zoom]);
  const scene = useMemo(
    () => layout(doc, scale, { measurer: canvasMeasurer, height }),
    [doc, scale, height],
  );

  const clampPan = useCallback(
    (value: number, atZoom: number) => {
      const maxPan = Math.max(0, width * atZoom - width);
      return Math.min(Math.max(value, 0), maxPan);
    },
    [width],
  );

  const zoomAt = useCallback(
    (nextZoom: number, cursorX: number) => {
      const bounded = Math.min(Math.max(nextZoom, 1), 5000);
      const time = scale.xToTime(cursorX);
      const unpanned = makeScale(doc.axis, width, 0, bounded);
      setZoom(bounded);
      setPan(clampPan(unpanned.timeToX(time) - cursorX, bounded));
    },
    [clampPan, doc.axis, scale, width],
  );

  const onWheel = useCallback(
    (nativeEvent: WheelEvent) => {
      nativeEvent.preventDefault();
      if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const cursorX = nativeEvent.clientX - (rect?.left ?? 0);
        zoomAt(zoom * Math.exp(-nativeEvent.deltaY / 180), cursorX);
        return;
      }
      const delta = Math.abs(nativeEvent.deltaX) > Math.abs(nativeEvent.deltaY)
        ? nativeEvent.deltaX
        : nativeEvent.deltaY;
      setPan((current) => clampPan(current + delta, zoom));
    },
    [clampPan, zoom, zoomAt],
  );

  useEffect(() => {
    const element = canvasRef.current;
    if (element === null) return;
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => { element.removeEventListener('wheel', onWheel); };
  }, [onWheel]);

  const stepZoom = (direction: 1 | -1): void => {
    const index = ZOOM_STEPS.findIndex((step) => step > zoom + 1e-6);
    const next = direction === 1
      ? (ZOOM_STEPS[index === -1 ? ZOOM_STEPS.length - 1 : index] ?? zoom)
      : ([...ZOOM_STEPS].reverse().find((step) => step < zoom - 1e-6) ?? 1);
    zoomAt(next, width / 2);
  };

  return (
    <div className={styles.app}>
      <div className={styles.toolbar}>
        <span className={styles.title}>{APP_NAME}</span>
        <span className={styles.subtitle}>{DEV.subtitle}</span>
        <span className={styles.separator} />
        <div className={styles.segmented} role="group">
          {FIXTURES.map((fixture, index) => (
            <button
              key={fixture.file}
              type="button"
              className={styles.segment}
              aria-pressed={index === fixtureIndex}
              onClick={() => { setFixtureIndex(index); setZoom(1); setPan(0); }}
            >
              {fixture.document.meta.title}
            </button>
          ))}
        </div>
        <span className={styles.spacer} />
        <button type="button" className={styles.button} onClick={() => { stepZoom(-1); }}>−</button>
        <span className={styles.zoomValue}>{Math.round(zoom * 100)} %</span>
        <button type="button" className={styles.button} onClick={() => { stepZoom(1); }}>+</button>
        <button
          type="button"
          className={styles.button}
          onClick={() => { setZoom(1); setPan(0); }}
        >
          {TOOLBAR.zoomFit}
        </button>
      </div>

      <div className={styles.canvas} ref={canvasRef}>
        <Frise scene={scene} theme={themeById(doc.themeId)} title={doc.meta.title} />
      </div>

      <div className={styles.hint}>{DEV.hint}</div>
    </div>
  );
}
