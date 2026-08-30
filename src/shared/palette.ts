/**
 * Palette des éléments — DESIGN.md §6, et dérivation des couleurs §4.
 *
 * Avec tokens.css, ce fichier est le seul endroit du projet où un littéral
 * hexadécimal est autorisé (règle DESIGN.md §1.2).
 *
 * Pas d'import React, pas de DOM : les exporteurs headless utilisent
 * exactement les mêmes fonctions que l'écran.
 */

export interface PaletteEntry {
  /** identifiant stocké dans le document (`item.color`) */
  readonly id: PaletteId;
  /** nom affiché dans le sélecteur, en français */
  readonly name: string;
  /** couleur de base, hex #RRGGBB */
  readonly base: string;
}

export type PaletteId =
  | 'brique' | 'ocre' | 'ble' | 'olive'
  | 'foret' | 'canard' | 'ardoise' | 'encre'
  | 'prune' | 'lie-de-vin' | 'terre' | 'pierre';

/** Ordre = ordre du sélecteur (grille 6×2). */
export const PALETTE: readonly PaletteEntry[] = [
  { id: 'brique',     name: 'Brique',     base: '#B24E33' },
  { id: 'ocre',       name: 'Ocre',       base: '#C4872E' },
  { id: 'ble',        name: 'Blé',        base: '#B5A048' },
  { id: 'olive',      name: 'Olive',      base: '#7C8143' },
  { id: 'foret',      name: 'Forêt',      base: '#4E7A55' },
  { id: 'canard',     name: 'Canard',     base: '#2F7E83' },
  { id: 'ardoise',    name: 'Ardoise',    base: '#4A6D8C' },
  { id: 'encre',      name: 'Encre',      base: '#535A8C' },
  { id: 'prune',      name: 'Prune',      base: '#7A4A6D' },
  { id: 'lie-de-vin', name: 'Lie-de-vin', base: '#96404F' },
  { id: 'terre',      name: 'Terre',      base: '#8A6248' },
  { id: 'pierre',     name: 'Pierre',     base: '#7B776E' },
];

/** Couleur du premier élément créé dans un document neuf (DESIGN.md §6). */
export const DEFAULT_COLOR: PaletteId = 'brique';

/** Préréglage « grandes périodes » — couleurs fixes, hors palette (DESIGN.md §6). */
export const GREAT_PERIOD_COLORS = {
  prehistoire: '#8A6248',
  antiquite: '#C4872E',
  'moyen-age': '#4A6D8C',
  'epoque-moderne': '#4E7A55',
  'epoque-contemporaine': '#B24E33',
} as const;

const WHITE = '#FFFFFF';
const INK_BLACK = '#201B17';

const BY_ID = new Map<string, PaletteEntry>(PALETTE.map((e) => [e.id, e]));

export function isPaletteId(value: string): value is PaletteId {
  return BY_ID.has(value);
}

export function paletteEntry(id: PaletteId): PaletteEntry {
  const entry = BY_ID.get(id);
  if (entry === undefined) throw new Error(`Couleur inconnue : ${id}`);
  return entry;
}

/**
 * Résout la valeur `color` d'un élément : identifiant de palette, ou hex
 * personnalisé préfixé « # » (docs/format.md §4). Toute valeur inconnue
 * retombe sur la couleur par défaut plutôt que d'échouer au rendu.
 */
export function resolveBase(color: string): string {
  if (color.startsWith('#')) return normalizeHex(color);
  return (BY_ID.get(color) ?? paletteEntry(DEFAULT_COLOR)).base;
}

/** Interpolation sRGB par canal — DESIGN.md §4. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  return toHex(
    Math.round(ar + (br - ar) * t),
    Math.round(ag + (bg - ag) * t),
    Math.round(ab + (bb - ab) * t),
  );
}

/** Remplissage des puces et des barres. */
export function tint(base: string): string {
  return mix(base, WHITE, 0.85);
}

/** Texte posé sur un `tint(base)`. */
export function ink(base: string): string {
  return mix(base, INK_BLACK, 0.45);
}

function normalizeHex(hex: string): string {
  const body = hex.slice(1);
  if (body.length === 3) {
    const [r, g, b] = [body[0], body[1], body[2]];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return `#${body.slice(0, 6).toUpperCase()}`;
}

function toRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(normalizeHex(hex).slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => clampByte(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${c(r)}${c(g)}${c(b)}`;
}

function clampByte(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)));
}

/** Contrast-safe text for fully saturated fills (sRGB relative luminance). */
export function contrastText(background: string): string {
  const [r, g, b] = toRgb(background).map((value) => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * r! + .7152 * g! + .0722 * b!;
  return (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? '#000000' : WHITE;
}
