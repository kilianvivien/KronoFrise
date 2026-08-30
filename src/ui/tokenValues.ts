/**
 * Valeurs calculées des jetons de `tokens.css`.
 *
 * Les exports (SVG autonome, PNG, PDF) ont besoin de couleurs réelles, pas de
 * `var(--…)`. Plutôt que de recopier les hexadécimaux — interdit par
 * DESIGN.md §1.2 — on lit la feuille de jetons elle-même : elle reste la
 * source unique, y compris hors du navigateur.
 */
import tokensCss from './tokens.css?inline';

/** Bloc `:root` du thème clair : l'export imprime toujours sur papier clair. */
function parseRootTokens(source: string): Record<string, string> {
  // Les commentaires disparaissent d'abord : sinon celui qui suit une
  // déclaration se colle au nom de la suivante.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = css.indexOf(':root');
  if (start === -1) return {};
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  if (open === -1 || close === -1) return {};
  const body = css.slice(open + 1, close);
  const tokens: Record<string, string> = {};
  for (const declaration of body.split(';')) {
    const [name, ...rest] = declaration.split(':');
    const key = name?.trim();
    if (key === undefined || !key.startsWith('--')) continue;
    tokens[key] = rest.join(':').trim();
  }
  return tokens;
}

export const TOKENS: Readonly<Record<string, string>> = parseRootTokens(tokensCss);

/** « var(--text-primary) » → « #2C2925 ». Une valeur déjà littérale ressort telle quelle. */
export function resolveToken(value: string): string {
  const match = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
  if (match === null) return value;
  const token = TOKENS[match[1] as string];
  return token === undefined ? value : resolveToken(token);
}

/** Composantes 0–1, prêtes pour pdf-lib. */
export function toRgb01(color: string): { r: number; g: number; b: number } {
  const hex = resolveToken(color).trim();
  const body = hex.startsWith('#') ? hex.slice(1) : '000000';
  const full = body.length === 3 ? body.replace(/./g, (c) => c + c) : body.padEnd(6, '0');
  const value = Number.parseInt(full.slice(0, 6), 16);
  return {
    r: ((value >> 16) & 0xff) / 255,
    g: ((value >> 8) & 0xff) / 255,
    b: (value & 0xff) / 255,
  };
}
