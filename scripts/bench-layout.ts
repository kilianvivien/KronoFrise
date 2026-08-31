/* Mesure de la mise en page — exécuter avec `pnpm vite-node scripts/bench-layout.ts`. */
import { stress } from '../src/core/fixtures/index';
import { layout } from '../src/layout/layout';
import { makeScale } from '../src/layout/scale';
import { sceneToSvg } from '../src/renderer/renderToSvgString';

function time(label: string, runs: number, fn: () => unknown): void {
  fn();
  const start = performance.now();
  for (let i = 0; i < runs; i++) fn();
  console.log(`${label.padEnd(42)} ${((performance.now() - start) / runs).toFixed(2)} ms`);
}

const scale = makeScale(stress.axis, 1200);
console.log(`stress : ${stress.items.length} éléments, ${stress.lanes.length} bandes`);
time('layout (zoom 1)', 50, () => layout(stress, scale, { height: 700 }));
for (const zoom of [10, 100, 1000]) {
  const zoomed = makeScale(stress.axis, 1200, 0, zoom);
  time(`layout (zoom ${zoom})`, 50, () => layout(stress, zoomed, { height: 700 }));
}
const scene = layout(stress, scale, { height: 700 });
time('sceneToSvg (export partagé)', 10, () => sceneToSvg(scene, stress.meta.title));
