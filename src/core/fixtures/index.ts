/**
 * Fixtures de référence — docs/format.md §10.
 * Utilisées par les tests, les tests de performance et la page de
 * développement. Elles sont écrites en TypeScript (donc vérifiées par le
 * compilateur) et validées par `parseDocument` dans `fixtures.test.ts` ;
 * `pnpm fixtures:emit` en produit les fichiers `.krono` correspondants.
 */
import type { KronoDocument } from '../types';
import { antiquite } from './antiquite';
import { grandesPeriodes } from './grandes-periodes';
import { revolution } from './revolution';
import { stress } from './stress';

export { antiquite, grandesPeriodes, revolution, stress };

export interface FixtureEntry {
  /** nom de fichier `.krono` correspondant */
  file: string;
  document: KronoDocument;
}

export const FIXTURES: FixtureEntry[] = [
  { file: 'revolution.krono', document: revolution },
  { file: 'grandes-periodes.krono', document: grandesPeriodes },
  { file: 'antiquite.krono', document: antiquite },
  { file: 'stress.krono', document: stress },
];
