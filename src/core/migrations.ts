/**
 * Migrations de schéma — docs/format.md §2 : « bump only with a migration ».
 *
 * `migrate` prend un JSON de n'importe quelle version connue et retourne un
 * JSON à la version courante, que `parseDocument` valide ensuite. Tant que
 * « krono/1 » est la seule version publiée, la table est vide : elle existe
 * pour que la première migration soit un ajout d'entrée, pas une refonte.
 */
import { SCHEMA_VERSION } from './types';

type Migration = (json: Record<string, unknown>) => Record<string, unknown>;

/** Clé = version d'entrée ; valeur = fonction vers la version suivante. */
const MIGRATIONS: Record<string, { to: string; run: Migration }> = {};

export function migrate(json: unknown): unknown {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return json;
  let current = json as Record<string, unknown>;
  let guard = 0;
  while (typeof current.schema === 'string' && current.schema !== SCHEMA_VERSION) {
    const step = MIGRATIONS[current.schema];
    if (step === undefined) return current; // version inconnue : parseDocument tranchera
    current = { ...step.run(current), schema: step.to };
    if (++guard > 32) return current;
  }
  return current;
}
