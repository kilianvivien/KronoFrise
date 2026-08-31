/**
 * La scène telle qu'elle doit être peinte pendant qu'elle se réorganise —
 * DESIGN.md §8 : « la mise en page qui se réorganise après un dépôt anime les
 * positions sur 140 ms ».
 *
 * Le mouvement est en JavaScript et non en CSS : la scène est posée en
 * coordonnées absolues, qu'aucune transition n'interpole (docs/spec-gaps.md
 * §13.14). Tout le calcul est dans `layout/reflow.ts`, fonction pure et
 * testée ; il ne reste ici que l'horloge.
 */
import { useEffect, useRef, useState } from 'react';
import { easeUi, interpolateScene, sameGeometry } from '../layout/reflow';
import type { SceneGraph } from '../layout/scene';
import { cssMilliseconds, TOKENS } from './tokenValues';

/**
 * Durée du mouvement, lue dans le jeton `--motion-ui` : une seule source, comme
 * pour les couleurs (DESIGN.md §1).
 *
 * `prefers-reduced-motion` annule les transitions CSS d'un coup dans base.css ;
 * une animation JavaScript, elle, n'obéit à rien — on la coupe donc ici, au
 * même endroit que le navigateur le ferait.
 */
export function reflowDuration(): number {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  return cssMilliseconds(TOKENS['--motion-ui'] ?? '');
}

/**
 * `settled` est la scène vraie — celle que le reste de l'éditeur mesure.
 *
 * Le mouvement ne se déclenche pas sur un changement de scène quelconque : un
 * panoramique, un zoom, un redimensionnement de la fenêtre en produisent un à
 * chaque image, et §8 dit que la caméra bouge, pas la frise. Il se déclenche
 * sur une modification **validée** du document — un dépôt, une annulation, une
 * suppression, un champ de l'inspecteur —, c'est-à-dire quand `change`, la
 * révision du magasin, avance.
 *
 * `change` vaut `null` pendant un geste : la scène y est déjà recalculée à
 * chaque image et suit le pointeur ; l'animer la ferait traîner derrière
 * (docs/spec-gaps.md §13.10). `subject` est le document lui-même : en ouvrir
 * un autre remplace la frise, cela ne la réorganise pas.
 */
export function useReflow(settled: SceneGraph, subject: string, change: number | null): SceneGraph {
  const [frame, setFrame] = useState<SceneGraph | null>(null);
  /** dernière scène réellement peinte : le mouvement repart de là, même s'il en interrompt un autre */
  const painted = useRef(settled);
  const last = useRef({ subject, change });

  useEffect(() => {
    const from = painted.current;
    const previous = last.current;
    painted.current = settled;
    last.current = { subject, change };
    const reorganizes = change !== null && previous.change !== null && change !== previous.change && subject === previous.subject;
    const duration = reflowDuration();
    if (!reorganizes || duration <= 0 || sameGeometry(from, settled)) {
      setFrame(null);
      return;
    }
    let handle = 0;
    const start = performance.now();
    const step = (): void => {
      const progress = (performance.now() - start) / duration;
      if (progress >= 1) {
        painted.current = settled;
        setFrame(null);
        return;
      }
      const next = interpolateScene(from, settled, easeUi(progress));
      painted.current = next;
      setFrame(next);
      handle = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(handle);
  }, [settled, subject, change]);

  return frame ?? settled;
}
