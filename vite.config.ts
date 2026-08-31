import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Émet `sw.js` avec la **vraie** liste des fichiers construits.
 *
 * Un service worker écrit à la main ne peut pas deviner les noms hachés, et
 * les morceaux chargés paresseusement (l'export PDF) ne seraient jamais mis en
 * cache avant d'avoir servi au moins une fois : hors ligne, exporter aurait
 * échoué. Le greffon lit donc le bundle final et fige la liste, plus l'entrée
 * `./` et les ressources statiques nommées par le manifeste.
 *
 * Aucune dépendance ajoutée (PLAN.md §8.4) : c'est un `generateBundle` de
 * Rollup et une substitution de chaîne.
 */
function kronofrisePwa(): Plugin {
  return {
    name: 'kronofrise-pwa',
    apply: 'build',
    generateBundle(_options, bundle) {
      const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8')) as { icons: { src: string }[] };
      const assets = Object.keys(bundle).filter((name) => !name.endsWith('.map'));
      const precache = [
        './',
        'site.webmanifest',
        'favicon.ico',
        'apple-touch-icon.png',
        ...manifest.icons.map((icon) => icon.src),
        ...assets,
      ];
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);
      const source = readFileSync('src/pwa/sw.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify([...new Set(precache)], null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), kronofrisePwa()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    // Les jetons de tokens.css sont lus par ui/tokenValues.ts et incorporés
    // dans le SVG exporté : les tests doivent voir la vraie feuille.
    css: true,
  },
});
