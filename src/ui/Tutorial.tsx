/**
 * Tutoriel d'accueil — la bulle qui accompagne les premiers gestes.
 *
 * PLAN.md M4 (ajout 1) : « pas une vidéo » — chaque étape s'accroche au
 * **vrai** contrôle (attribut `data-tour`) et ne se franchit que lorsque le
 * geste est fait. Rien n'est mis en scène : on met en valeur le bouton
 * Événement, pas une image de bouton.
 *
 * SPEC? DESIGN.md ne décrit pas de bulle d'accompagnement. Elle reprend donc
 * la recette « Popovers/menus » de §3 (fond `--field-bg`, filet `--hairline`,
 * rayon `--radius-card`, ombre `--shadow-popover`) et l'anneau d'accent de §5
 * pour désigner la cible — aucun nouveau vocabulaire visuel.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react';
import { useStore } from 'zustand';
import { editorStore } from '../store/editor';
import { setTutorialDone } from '../store/appearance';
import { EDITOR, TUTORIAL } from './strings';
import { currentStep, TUTORIAL_STEPS, type TutorialState } from './tutorialSteps';
import { Icon } from './icons';
import type { Mode } from './mode';
import styles from './Tutorial.module.css';

const DEFAULT_LABELS = [EDITOR.event, EDITOR.period] as const;
/** Écart entre la cible mise en valeur et la bulle. */
const GAP = 12;
const BUBBLE_WIDTH = 300;

interface Box { top: number; left: number; width: number; height: number }

export function Tutorial({ mode, onClose }: { mode: Mode; onClose: () => void }): JSX.Element | null {
  const doc = useStore(editorStore, (value) => value.document);
  const [box, setBox] = useState<Box | null>(null);
  // `floor` est l'étape la plus avancée atteinte ; `start` l'instantané pris
  // à son entrée, qui sert de repère au « l'a-t-il déplacé ? ».
  const [floor, setFloor] = useState(0);
  const [start, setStart] = useState<TutorialState>(() => ({ document: doc, mode, defaultLabels: DEFAULT_LABELS }));

  const state: TutorialState = { document: doc, mode, defaultLabels: DEFAULT_LABELS };
  const index = currentStep(floor, state, start);
  const step = TUTORIAL_STEPS[index];

  // Avancer redéfinit le repère : la suite se juge à partir d'ici, jamais du
  // début. La suite converge — `index` ne fait que croître.
  useEffect(() => {
    if (index !== floor) { setFloor(index); setStart({ document: doc, mode, defaultLabels: DEFAULT_LABELS }); }
  }, [index, floor, doc, mode]);

  const finish = useCallback(() => { setTutorialDone(true); onClose(); }, [onClose]);

  // La cible est un élément réel de l'interface : on la remesure à chaque
  // étape et à chaque redimensionnement, jamais une position codée en dur.
  const anchor = step?.anchor;
  useLayoutEffect(() => {
    if (anchor === undefined) { setBox(null); return; }
    const measure = (): void => {
      const target = window.document.querySelector(`[data-tour="${anchor}"]`);
      if (!target) { setBox(null); return; }
      const rect = target.getBoundingClientRect();
      setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    measure();
    window.addEventListener('resize', measure);
    const timer = window.setInterval(measure, 500);
    return () => { window.removeEventListener('resize', measure); window.clearInterval(timer); };
  }, [anchor]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      // Échap passe le tutoriel sans rien casser du travail en cours.
      if (event.key === 'Escape') { event.stopPropagation(); finish(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [finish]);

  if (!step) return <Bubble
    box={null}
    title={TUTORIAL.doneTitle}
    body={TUTORIAL.done}
    index={TUTORIAL_STEPS.length}
    onSkip={finish}
    skipLabel={TUTORIAL.finish}
  />;

  return <Bubble box={box} title={step.title} body={step.body} index={index} onSkip={finish} skipLabel={TUTORIAL.skip} />;
}

function Bubble({ box, title, body, index, onSkip, skipLabel }: {
  box: Box | null; title: string; body: string; index: number; onSkip: () => void; skipLabel: string;
}): JSX.Element {
  const bubble = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(150);
  // La hauteur dépend de la longueur du texte : on la mesure au lieu de la
  // deviner, sinon la bulle sortait de l'écran au-dessus d'une grande cible.
  useLayoutEffect(() => { if (bubble.current) setHeight(bubble.current.offsetHeight); }, [title, body]);

  const left = box === null
    ? window.innerWidth / 2 - BUBBLE_WIDTH / 2
    : Math.max(GAP, Math.min(window.innerWidth - BUBBLE_WIDTH - GAP, box.left + box.width / 2 - BUBBLE_WIDTH / 2));
  // Sous la cible si la place le permet, au-dessus sinon ; et dans tous les
  // cas ramenée dans l'écran — une cible haute comme le canevas ne laisse de
  // place ni dessus ni dessous.
  const preferred = box === null
    ? window.innerHeight / 2 - height / 2
    : box.top + box.height + GAP + height < window.innerHeight
      ? box.top + box.height + GAP
      : box.top - GAP - height;
  const top = Math.max(GAP, Math.min(window.innerHeight - height - GAP, preferred));

  return <>
    {box && <div className={styles.spot} aria-hidden="true" style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }} />}
    <div ref={bubble} className={styles.bubble} role="dialog" aria-live="polite" aria-label={TUTORIAL.title} style={{ top, left, width: BUBBLE_WIDTH }}>
      <p className={styles.counter}>
        <Icon name={index < TUTORIAL_STEPS.length ? 'event' : 'check'} />
        {index < TUTORIAL_STEPS.length ? TUTORIAL.step(index + 1, TUTORIAL_STEPS.length) : TUTORIAL.completed}
      </p>
      <h2>{title}</h2>
      <p className={styles.body}>{body}</p>
      <div className={styles.actions}>
        <button type="button" onClick={onSkip}>{skipLabel}</button>
      </div>
    </div>
  </>;
}
