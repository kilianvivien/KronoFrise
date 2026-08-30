/**
 * Arithmétique et formatage des dates — docs/format.md §1.
 *
 * La conversion « année astronomique → année historique » n'existe qu'ici :
 * règle, puces, inspecteur et exports passent tous par `formatYear`.
 * Aucune dépendance : core/dates.ts *est* notre bibliothèque de dates
 * (PLAN.md §8.4).
 */
import { DATES } from '../shared/strings';
import type { KDate, Year } from './types';

export type DatePrecision = 'year' | 'month' | 'day';

const DAYS_IN_YEAR = 365;

/* ------------------------------------------------------------------ */
/* Conversions                                                         */
/* ------------------------------------------------------------------ */

/** Année historique affichée : 1 pour l'an 1, 52 pour « 52 av. J.-C. » (année -51). */
export function historicalYear(year: Year): number {
  return year <= 0 ? 1 - year : year;
}

/** Inverse de `historicalYear` pour une année avant J.-C. (52 → -51). */
export function yearFromBc(bcYear: number): Year {
  return 1 - bcYear;
}

export function isBc(year: Year): boolean {
  return year <= 0;
}

export function precisionOf(date: KDate): DatePrecision {
  if (date.day !== undefined) return 'day';
  if (date.month !== undefined) return 'month';
  return 'year';
}

/**
 * Position sur l'axe : début de l'année / du mois quand la précision manque
 * (docs/format.md §1 — le *placement* utilise les valeurs de début).
 */
export function toFractionalYear(date: KDate): number {
  const month = date.month ?? 1;
  const day = date.day ?? 1;
  return date.year + (month - 1) / 12 + (day - 1) / DAYS_IN_YEAR;
}

/** Réciproque approchée, utilisée par le glissement : x → date à la précision voulue. */
export function fromFractionalYear(t: number, precision: DatePrecision = 'year'): KDate {
  const year = floorEps(t);
  if (precision === 'year') return { year };
  const monthFloat = (t - year) * 12;
  const month = clamp(floorEps(monthFloat) + 1, 1, 12);
  if (precision === 'month') return { year, month };
  const dayFloat = (monthFloat - (month - 1)) * daysInMonth(year, month);
  const day = clamp(floorEps(dayFloat) + 1, 1, daysInMonth(year, month));
  return { year, month, day };
}

/**
 * Ordre chronologique : (year, month ?? 6, day ?? 15) — une précision absente
 * se classe au milieu de l'année / du mois (docs/format.md §1).
 */
export function compareDates(a: KDate, b: KDate): number {
  if (a.year !== b.year) return a.year - b.year;
  const am = a.month ?? 6;
  const bm = b.month ?? 6;
  if (am !== bm) return am - bm;
  return (a.day ?? 15) - (b.day ?? 15);
}

export function datesEqual(a: KDate, b: KDate): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    (a.circa ?? false) === (b.circa ?? false)
  );
}

/* ------------------------------------------------------------------ */
/* Formatage                                                           */
/* ------------------------------------------------------------------ */

/** « 1804 », « 52 av. J.-C. », « 3 000 000 av. J.-C. » — DESIGN.md §4. */
export function formatYear(year: Year): string {
  const value = groupThousands(historicalYear(year));
  return isBc(year) ? `${value} ${DATES.bcSuffix}` : value;
}

/**
 * Usage français : une année s'écrit sans séparateur jusqu'à quatre chiffres
 * (1789), avec une espace fine insécable au-delà (10 000, 3 000 000).
 */
function groupThousands(value: number): string {
  const text = String(value);
  if (text.length <= 4) return text;
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
}

export interface FormatDateOptions {
  /** mois en toutes lettres (puces, inspecteur) ou abrégés (règle) */
  monthStyle?: 'long' | 'short';
  /** ajoute « v. » pour les dates approximatives ; vrai par défaut */
  circa?: boolean;
}

/** « 14 juillet 1789 », « juillet 1789 », « v. 800 », « 52 av. J.-C. ». */
export function formatDate(date: KDate, options: FormatDateOptions = {}): string {
  const { monthStyle = 'long', circa = true } = options;
  const months = monthStyle === 'long' ? DATES.monthsLong : DATES.monthsShort;
  const year = formatYear(date.year);
  let text: string;
  if (date.month === undefined) {
    text = year;
  } else {
    const month = months[date.month - 1] ?? '';
    text =
      date.day === undefined
        ? `${month} ${year}`
        : `${date.day === 1 ? DATES.firstDayOfMonth : String(date.day)} ${month} ${year}`;
  }
  return circa && date.circa === true ? `${DATES.circaPrefix} ${text}` : text;
}

/** Numéro de siècle historique : 1804 → 19 ; année -199 (200 av. J.-C.) → 2. */
export function centuryOf(year: Year): number {
  return Math.floor((historicalYear(year) - 1) / 100) + 1;
}

/** Première année astronomique du siècle historique donné. */
export function centuryStartYear(century: number, bc = false): Year {
  return bc ? yearFromBc(century * 100) : (century - 1) * 100 + 1;
}

/** « XVIIᵉ siècle », « Iᵉʳ siècle », « IIᵉ siècle av. J.-C. » — DESIGN.md §4. */
export function formatCentury(year: Year): string {
  const century = centuryOf(year);
  const ordinal = century === 1 ? 'ᵉʳ' : 'ᵉ';
  const roman = `${toRoman(century)}${ordinal} ${DATES.century}`;
  return isBc(year) ? `${roman} ${DATES.bcSuffix}` : roman;
}

const ROMAN: readonly [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(value: number): string {
  let remaining = Math.max(0, Math.trunc(value));
  let out = '';
  for (const [amount, numeral] of ROMAN) {
    while (remaining >= amount) {
      out += numeral;
      remaining -= amount;
    }
  }
  return out;
}

export function fromRoman(input: string): number | null {
  const text = input.toUpperCase();
  if (!/^[MDCLXVI]+$/.test(text)) return null;
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const current = values[text[i] as string] ?? 0;
    const next = i + 1 < text.length ? (values[text[i + 1] as string] ?? 0) : 0;
    total += current < next ? -current : current;
  }
  return toRoman(total) === text ? total : null;
}

/* ------------------------------------------------------------------ */
/* Analyse de saisie                                                   */
/* ------------------------------------------------------------------ */

/**
 * Analyse ce que tape un enseignant : « 1515 », « -52 » (52 av. J.-C.),
 * « 52 av. J.-C. », « v. 800 », « 14/07/1789 », « juillet 1789 »,
 * « XVIe siècle ». Retourne `null` si rien ne colle (l'appelant affiche
 * `ERRORS.unparsableDate`).
 */
export function parseDateInput(input: string): KDate | null {
  const raw = input.trim();
  if (raw === '') return null;

  let text = normalize(raw);
  let circa = false;

  // « v. 800 », « vers 800 », « environ 800 », « ~800 », « c. 800 »
  const circaMatch = /^(?:vers|environ|v\.|c\.|~)\s*/.exec(text);
  if (circaMatch !== null) {
    circa = true;
    text = text.slice(circaMatch[0].length).trim();
  }

  // « av. J.-C. » / « avant J.-C. » / « bc », en suffixe
  let bc = false;
  const bcStripped = text.replace(/\s*(?:av(?:ant)?\.?\s*j\.?\s*-?\s*c\.?|bc|bce)\s*$/, '');
  if (bcStripped !== text) {
    bc = true;
    text = bcStripped.trim();
  }
  // « apr. J.-C. » : simplement ignoré
  text = text.replace(/\s*(?:ap(?:res|r)?\.?\s*j\.?\s*-?\s*c\.?|ad|ce)\s*$/, '').trim();

  const date = parseBody(text, bc);
  if (date === null) return null;
  return circa || date.circa === true ? { ...date, circa: true } : date;
}

function parseBody(text: string, bc: boolean): KDate | null {
  // Siècle : « xvie siecle », « 16e siecle », « xvi siecle »
  const century = /^([mdclxvi]+|\d{1,2})\s*(?:e|er|eme|ere|emes)?\s*siecles?$/.exec(text);
  if (century !== null) {
    const token = century[1] as string;
    const value = /^\d+$/.test(token) ? Number(token) : fromRoman(token);
    if (value === null || value < 1) return null;
    return { year: centuryStartYear(value, bc), circa: true };
  }

  // ISO « 1789-07-14 » / « 1789-07 » (jamais négatif : réservé à l'ISO)
  const iso = /^(\d{1,7})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(text);
  if (iso !== null) {
    return buildDate(signed(Number(iso[1]), bc), Number(iso[2]), iso[3] === undefined ? undefined : Number(iso[3]));
  }

  // « 14/07/1789 », « 07/1789 »
  const slash = /^(\d{1,2})[/.](\d{1,2})(?:[/.](-?\d{1,7}))?$/.exec(text);
  if (slash !== null && slash[3] !== undefined) {
    return buildDate(signed(Number(slash[3]), bc || slash[3].startsWith('-')), Number(slash[2]), Number(slash[1]));
  }
  const monthSlashYear = /^(\d{1,2})[/.](-?\d{3,7})$/.exec(text);
  if (monthSlashYear !== null) {
    const yearToken = monthSlashYear[2] as string;
    return buildDate(signed(Math.abs(Number(yearToken)), bc || yearToken.startsWith('-')), Number(monthSlashYear[1]), undefined);
  }

  // « 14 juillet 1789 », « juillet 1789 »
  const named = /^(?:(\d{1,2})(?:er)?\s+)?([a-z]+)\.?\s+(-?\d{1,7})$/.exec(text);
  if (named !== null) {
    const month = monthFromName(named[2] as string);
    if (month !== null) {
      const yearToken = named[3] as string;
      const day = named[1] === undefined ? undefined : Number(named[1]);
      return buildDate(signed(Math.abs(Number(yearToken)), bc || yearToken.startsWith('-')), month, day);
    }
  }

  // Année seule : « 1515 », « -52 » (= 52 av. J.-C.), « 0 »
  const year = /^(-?)(\d{1,8})$/.exec(text);
  if (year !== null) {
    const negative = year[1] === '-';
    return buildDate(signed(Number(year[2]), bc || negative), undefined, undefined);
  }

  return null;
}

/** Applique la convention astronomique : une année « avant J.-C. » N devient 1 − N. */
function signed(value: number, bc: boolean): Year {
  return bc ? yearFromBc(value) : value;
}

function buildDate(year: Year, month: number | undefined, day: number | undefined): KDate | null {
  if (!Number.isFinite(year) || !Number.isInteger(year)) return null;
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) return null;
  if (day !== undefined) {
    if (month === undefined) return null;
    if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) return null;
  }
  const date: KDate = { year };
  if (month !== undefined) date.month = month;
  if (day !== undefined) date.day = day;
  return date;
}

function monthFromName(name: string): number | null {
  const target = normalize(name).replace(/\.$/, '');
  for (let i = 0; i < 12; i++) {
    const long = normalize(DATES.monthsLong[i] as string);
    const short = normalize(DATES.monthsShort[i] as string).replace(/\.$/, '');
    if (target === long || target === short || (target.length >= 3 && long.startsWith(target))) {
      return i + 1;
    }
  }
  return null;
}

/** Minuscules, sans accents, espaces normalisés — pour l'analyse uniquement. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    // « 3 000 000 » (espaces fines de groupement) redevient « 3000000 »
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1')
    .trim();
}

export function daysInMonth(year: Year, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Grégorien proleptique — suffisant pour une frise scolaire. */
export function isLeapYear(year: Year): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Plancher tolérant : absorbe l'imprécision des flottants (1789 + 6/12 - 1789). */
function floorEps(value: number): number {
  const EPSILON = 1e-7;
  return Math.floor(value + EPSILON);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
