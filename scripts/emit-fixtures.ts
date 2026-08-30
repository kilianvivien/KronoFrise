/**
 * Écrit les fixtures TypeScript en fichiers `.krono` réels
 * (docs/format.md §10) : `pnpm fixtures:emit`.
 * Ces fichiers servent à tester l'ouverture de documents et à alimenter la
 * galerie de démarrage ; la source de vérité reste le TypeScript.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURES } from '../src/core/fixtures/index';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core', 'fixtures');
mkdirSync(outDir, { recursive: true });

for (const { file, document } of FIXTURES) {
  const path = join(outDir, file);
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  console.log(`écrit : ${file} (${document.items.length} éléments)`);
}
