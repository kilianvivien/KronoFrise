import { describe, expect, it } from 'vitest';
import {
  centuryOf,
  compareDates,
  formatCentury,
  formatDate,
  formatYear,
  fromFractionalYear,
  fromRoman,
  parseDateInput,
  toFractionalYear,
  toRoman,
} from './dates';
import type { KDate } from './types';

describe('formatYear (convention astronomique → affichage)', () => {
  it('affiche les années après J.-C. telles quelles', () => {
    expect(formatYear(1804)).toBe('1804');
    expect(formatYear(1)).toBe('1');
  });

  it('convertit les années négatives en « av. J.-C. »', () => {
    expect(formatYear(-51)).toBe('52 av. J.-C.'); // format.md §1
    expect(formatYear(0)).toBe('1 av. J.-C.');
    expect(formatYear(-2999)).toBe('3000 av. J.-C.');
  });
});

describe('formatDate', () => {
  it('respecte la précision de la date', () => {
    expect(formatDate({ year: 1789 })).toBe('1789');
    expect(formatDate({ year: 1789, month: 7 })).toBe('juillet 1789');
    expect(formatDate({ year: 1789, month: 7, day: 14 })).toBe('14 juillet 1789');
  });

  it('écrit « 1er » pour le premier jour du mois', () => {
    expect(formatDate({ year: 1789, month: 7, day: 1 })).toBe('1er juillet 1789');
  });

  it('préfixe les dates approximatives', () => {
    expect(formatDate({ year: 800, circa: true })).toBe('v. 800');
    expect(formatDate({ year: 800, circa: true }, { circa: false })).toBe('800');
  });

  it('abrège les mois pour la règle', () => {
    expect(formatDate({ year: 1804, month: 1 }, { monthStyle: 'short' })).toBe('janv. 1804');
  });
});

describe('siècles', () => {
  it('calcule le siècle historique', () => {
    expect(centuryOf(1804)).toBe(19);
    expect(centuryOf(1900)).toBe(19);
    expect(centuryOf(1901)).toBe(20);
    expect(centuryOf(-199)).toBe(2); // 200 av. J.-C.
  });

  it('formate à la française', () => {
    expect(formatCentury(1650)).toBe('XVIIᵉ siècle');
    expect(formatCentury(50)).toBe('Iᵉʳ siècle');
    expect(formatCentury(-199)).toBe('IIᵉ siècle av. J.-C.');
  });

  it('aller-retour des chiffres romains', () => {
    for (let n = 1; n <= 40; n++) expect(fromRoman(toRoman(n))).toBe(n);
    expect(fromRoman('XVI')).toBe(16);
    expect(fromRoman('IIII')).toBeNull();
    expect(fromRoman('bonjour')).toBeNull();
  });
});

describe('compareDates (précision manquante = milieu)', () => {
  it('classe par année puis mois puis jour', () => {
    expect(compareDates({ year: 1789 }, { year: 1790 })).toBeLessThan(0);
    expect(compareDates({ year: 1789, month: 7 }, { year: 1789, month: 8 })).toBeLessThan(0);
    expect(compareDates({ year: 1789, month: 7, day: 14 }, { year: 1789, month: 7, day: 15 })).toBeLessThan(0);
  });

  it('place une année sans mois au milieu de l’année', () => {
    expect(compareDates({ year: 1789 }, { year: 1789, month: 1 })).toBeGreaterThan(0);
    expect(compareDates({ year: 1789 }, { year: 1789, month: 12 })).toBeLessThan(0);
  });

  it('trie correctement de part et d’autre de l’an 1', () => {
    const dates: KDate[] = [{ year: 476 }, { year: -51 }, { year: 1 }, { year: -2999 }];
    expect([...dates].sort(compareDates).map((d) => d.year)).toEqual([-2999, -51, 1, 476]);
  });
});

describe('toFractionalYear (placement : défauts en début de période)', () => {
  it('utilise le début de l’année quand la précision manque', () => {
    expect(toFractionalYear({ year: 1789 })).toBe(1789);
  });

  it('progresse avec le mois et le jour', () => {
    expect(toFractionalYear({ year: 1789, month: 7 })).toBeCloseTo(1789 + 6 / 12, 10);
    expect(toFractionalYear({ year: 1789, month: 7, day: 14 })).toBeCloseTo(1789 + 6 / 12 + 13 / 365, 10);
  });

  it('est monotone à travers l’an 0', () => {
    const series = [-2, -1, 0, 1, 2].map((year) => toFractionalYear({ year }));
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!).toBeGreaterThan(series[i - 1]!);
    }
  });

  it('fait l’aller-retour à la précision demandée', () => {
    const date: KDate = { year: 1789, month: 7, day: 14 };
    expect(fromFractionalYear(toFractionalYear(date), 'day')).toEqual(date);
    expect(fromFractionalYear(toFractionalYear({ year: -51, month: 3 }), 'month')).toEqual({ year: -51, month: 3 });
    expect(fromFractionalYear(1789.9, 'year')).toEqual({ year: 1789 });
  });
});

describe('parseDateInput', () => {
  const cases: [string, KDate | null][] = [
    ['1515', { year: 1515 }],
    ['-52', { year: -51 }], // format.md §1 : « -52 » = 52 av. J.-C.
    ['52 av. J.-C.', { year: -51 }],
    ['52 av JC', { year: -51 }],
    ['52 avant J.-C.', { year: -51 }],
    ['v. 800', { year: 800, circa: true }],
    ['vers 800', { year: 800, circa: true }],
    ['14/07/1789', { year: 1789, month: 7, day: 14 }],
    ['1789-07-14', { year: 1789, month: 7, day: 14 }],
    ['juillet 1789', { year: 1789, month: 7 }],
    ['14 juillet 1789', { year: 1789, month: 7, day: 14 }],
    ['1er juillet 1789', { year: 1789, month: 7, day: 1 }],
    ['janv. 1804', { year: 1804, month: 1 }],
    ['XVIe siècle', { year: 1501, circa: true }], // format.md §8.2
    ['IIe siècle av. J.-C.', { year: -199, circa: true }],
    ['16e siècle', { year: 1501, circa: true }],
    ['1804 apr. J.-C.', { year: 1804 }],
    ['  1789  ', { year: 1789 }],
    ['', null],
    ['bonjour', null],
    ['32/01/1789', null],
    ['14/13/1789', null],
  ];

  it.each(cases)('« %s »', (input, expected) => {
    expect(parseDateInput(input)).toEqual(expected);
  });

  it('fait l’aller-retour avec formatDate', () => {
    const dates: KDate[] = [
      { year: 1789, month: 7, day: 14 },
      { year: 1515 },
      { year: -51 },
      { year: 800, circa: true },
      { year: 1804, month: 1 },
    ];
    for (const date of dates) {
      expect(parseDateInput(formatDate(date))).toEqual(date);
    }
  });
});
