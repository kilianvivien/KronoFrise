/**
 * Mode présentation — PLAN.md §3.5.
 *
 * Plein écran, sans chrome : la frise est projetée telle qu'elle sera
 * imprimée, puisque c'est le même rendu (docs/format.md §9). La flèche droite
 * avance dans l'ordre chronologique, la caméra se déplace en 600 ms
 * (DESIGN.md §8) et le mode « révéler » fait apparaître les éléments un par un,
 * comme une frise écrite au tableau pendant la leçon.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type JSX } from 'react';
import { useStore } from 'zustand';
import { chronological, itemEnd, itemStart } from '../core/document';
import { formatDate } from '../core/dates';
import { fitInsets } from '../layout/fit';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import type { SceneGraph } from '../layout/scene';
import { Frise } from '../renderer/Frise';
import { editorStore } from '../store/editor';
import { themeById } from '../themes';
import { canvasMeasurer } from './measureText';
import { focusCamera, interpolate, OVERVIEW, type Camera } from './presentationCamera';
import { Icon } from './icons';
import { EDITOR, PRESENT } from './strings';
import { resolveToken } from './tokenValues';
import styles from './Presentation.module.css';

/** DESIGN.md §8 : un pas de présentation dure 600 ms. */
const STEP_MS = 600;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Presentation({ onExit }: { onExit: () => void }): JSX.Element {
  const doc = useStore(editorStore, (state) => state.document);
  const theme = themeById(doc.themeId);
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1200, height: 700 });
  const [step, setStep] = useState(-1);
  const [reveal, setReveal] = useState(false);
  const [full, setFull] = useState(false);
  const [camera, setCamera] = useState<Camera>(OVERVIEW);
  const animation = useRef<number | undefined>(undefined);
  const cameraRef = useRef<Camera>(OVERVIEW);
  cameraRef.current = camera;

  const items = useMemo(() => chronological(doc.items), [doc]);
  const current = step >= 0 ? items[step] : undefined;
  const insets = useMemo(() => fitInsets(doc, size.width, canvasMeasurer), [doc, size.width]);
  const scene = useMemo(() => {
    const scale = makeScale(doc.axis, size.width, camera.pan, camera.zoom, insets);
    return layout(doc, scale, { measurer: canvasMeasurer, height: size.height });
  }, [doc, size, camera, insets]);

  // « Révéler » ne change pas la mise en page : on masque des nœuds déjà posés,
  // si bien que rien ne se déplace quand un élément apparaît.
  const shown = useMemo<SceneGraph>(() => {
    if (!reveal) return scene;
    const visible = new Set(items.slice(0, step + 1).map((item) => item.id));
    return {
      ...scene,
      events: scene.events.filter((event) => visible.has(event.itemId)),
      periods: scene.periods.filter((period) => visible.has(period.itemId)),
    };
  }, [scene, reveal, items, step]);

  const highlight = useMemo(() => {
    if (!current) return null;
    const event = shown.events.find((event) => event.itemId === current.id);
    if (event) return { x: event.chip.x, y: event.chip.y, width: event.chip.width, height: event.chip.height };
    const period = shown.periods.find((period) => period.itemId === current.id);
    return period ? { x: period.x0, y: period.y, width: Math.max(period.x1 - period.x0, 2), height: period.height } : null;
  }, [current, shown]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Un pas = un mouvement de caméra ; le mouvement réduit saute directement.
  useEffect(() => {
    const target = current ? focusCamera(doc, current, size.width, insets) : OVERVIEW;
    if (animation.current !== undefined) cancelAnimationFrame(animation.current);
    if (reducedMotion()) { setCamera(target); return; }
    const from = cameraRef.current;
    const start = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / STEP_MS);
      setCamera(interpolate(from, target, progress));
      if (progress < 1) animation.current = requestAnimationFrame(tick);
    };
    animation.current = requestAnimationFrame(tick);
    return () => { if (animation.current !== undefined) cancelAnimationFrame(animation.current); };
  }, [current, doc, size.width, insets]);

  const go = (next: number): void => setStep(Math.max(-1, Math.min(items.length - 1, next)));
  const exit = (): void => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onExit();
  };
  const toggleFullscreen = (): void => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void host.current?.parentElement?.requestFullscreen().catch(() => {});
  };
  useEffect(() => {
    const change = (): void => setFull(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.target instanceof Element && event.target.closest('input,textarea,select')) return;
      const keys: Record<string, () => void> = {
        arrowright: () => go(step + 1), ' ': () => go(step + 1), pagedown: () => go(step + 1),
        arrowleft: () => go(step - 1), pageup: () => go(step - 1),
        home: () => go(-1), end: () => go(items.length - 1),
        escape: exit,
      };
      const action = keys[event.key.toLowerCase()];
      if (action) { event.preventDefault(); action(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const description = current?.description;
  return <div className={styles.stage} style={{ '--paper': resolveToken(theme.paper) } as CSSProperties}>
    <div ref={host} className={styles.canvas} role="region" aria-label={EDITOR.canvas}>
      <Frise scene={shown} title={doc.meta.title} theme={theme}>
        {highlight && <rect className={styles.highlight} x={highlight.x - 3} y={highlight.y - 3} width={highlight.width + 6} height={highlight.height + 6} rx={7} />}
      </Frise>
    </div>
    {items.length === 0 && <aside className={styles.card}><p>{PRESENT.empty}</p></aside>}
    {current && <aside className={styles.card} aria-live="polite">
      <h2>{current.label}</h2>
      <p className={styles.dates}>{current.kind === 'event' ? formatDate(current.date, { monthStyle: 'long' })
        : EDITOR.range(formatDate(itemStart(current)), formatDate(itemEnd(current)))}</p>
      {current.image && <img src={current.image.src} alt={current.label} />}
      {description !== undefined && description !== '' && <p>{description}</p>}
    </aside>}
    <nav className={styles.bar} aria-label={PRESENT.controls}>
      <button className={styles.icon} onClick={() => go(-1)} disabled={step < 0} aria-label={PRESENT.overview} title={PRESENT.overview}><Icon name="first" /></button>
      <button className={styles.icon} onClick={() => go(step - 1)} disabled={step < 0} aria-label={PRESENT.previous} title={PRESENT.previous}><Icon name="back" /></button>
      <span className={styles.counter} role="status">{step < 0 ? PRESENT.overview : PRESENT.position(step + 1, items.length)}</span>
      <button className={styles.icon} onClick={() => go(step + 1)} disabled={step >= items.length - 1} aria-label={PRESENT.next} title={PRESENT.next}><Icon name="chevronRight" /></button>
      <span className={styles.separator} />
      <button aria-pressed={reveal} onClick={() => setReveal(!reveal)} title={PRESENT.revealHint}><Icon name="mask" />{PRESENT.reveal}</button>
      <button aria-pressed={full} onClick={toggleFullscreen}><Icon name="present" />{PRESENT.fullscreen}</button>
      <button onClick={exit}><Icon name="close" />{PRESENT.exit}</button>
    </nav>
  </div>;
}
