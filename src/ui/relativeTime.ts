/**
 * « Modifié il y a 2 j » — DESIGN.md §10.
 *
 * `Intl.RelativeTimeFormat` fournit la formulation française ; aucune chaîne
 * n'est écrite ici, seul l'habillage vient de `strings.ts`.
 */
import { LIBRARY } from './strings';

const FORMAT = new Intl.RelativeTimeFormat('fr', { numeric: 'auto', style: 'short' });

const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 365 * 24 * 3600 },
  { unit: 'month', seconds: 30 * 24 * 3600 },
  { unit: 'day', seconds: 24 * 3600 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
];

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return LIBRARY.justNow;
  const seconds = (then - now.getTime()) / 1000;
  for (const { unit, seconds: size } of UNITS) {
    if (Math.abs(seconds) >= size) return FORMAT.format(Math.round(seconds / size), unit);
  }
  // Moins d'une minute : « à l'instant » se lit mieux que « cette minute-ci ».
  return LIBRARY.justNow;
}
