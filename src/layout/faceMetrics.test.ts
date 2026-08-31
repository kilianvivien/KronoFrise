/**
 * Les tables de chasses engendrées — PLAN.md M4 (ajout 2), seconde facette.
 *
 * Une table fausse ne se voit pas : elle décale une puce de quelques pixels,
 * et le texte finit dehors *à l'impression*, là où personne ne regarde. Ces
 * tests confrontent donc la table au **fichier de police lui-même**, celui que
 * le navigateur affiche et que le PDF incorpore.
 */
import { describe, expect, it } from 'vitest';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'node:fs';
import { formatDate } from '../core/dates';
import { antiquite, grandesPeriodes, revolution, stress } from '../core/fixtures/index';
import { FACES, type FaceId } from '../shared/faces';
import { THEMES } from '../themes';
import { approximateMeasurer, foldForFace, forFace, missingChars } from './measure';

interface Face {
  unitsPerEm: number;
  layout(text: string): { advanceWidth: number };
  hasGlyphForCodePoint(code: number): boolean;
}
const open = (name: string): Face => fontkit.create(readFileSync(`assets/fonts/${name}.ttf`));

/** Fonte livrée → fichiers, comme `export/fonts.ts` les associe. */
const FILES: Record<string, { regular: string; bold: string }> = {
  garamond: { regular: 'EBGaramond-Regular', bold: 'EBGaramond-SemiBold' },
  craie: { regular: 'Caveat-Regular', bold: 'Caveat-Bold' },
};

/** Tout ce que l'application peut écrire sur une frise. */
const TEXTS = new Set<string>(['XVIIᵉ siècle', '12 000 av. J.-C.', 'Moyen Âge', 'Œuvres & idées']);
for (const doc of [antiquite, grandesPeriodes, revolution, stress]) {
  for (const item of doc.items) {
    TEXTS.add(item.label);
    TEXTS.add(formatDate(item.kind === 'event' ? item.date : item.start));
  }
}

describe('tables de chasses engendrées', () => {
  for (const [id, files] of Object.entries(FILES)) {
    describe(id, () => {
      const faces = { 400: open(files.regular), 600: open(files.bold) } as const;
      const real = (weight: 400 | 600, text: string, size: number): number =>
        faces[weight].layout(text).advanceWidth / faces[weight].unitsPerEm * size;

      it('ne sous-estime jamais la largeur réelle du fichier', () => {
        for (const weight of [400, 600] as const) {
          for (const text of TEXTS) {
            for (const size of [24, 13, 11]) {
              const folded = foldForFace(text, id as FaceId);
              const table = approximateMeasurer.measure(folded, size, weight, id as FaceId);
              const actual = real(weight, folded, size);
              // Une largeur trop petite fait un défaut visible ; trop grande,
              // un blanc. On n'accepte que le second.
              expect(`${weight} ${JSON.stringify(text)} ${table >= actual}`).toBe(`${weight} ${JSON.stringify(text)} true`);
            }
          }
        }
      });

      it('ne surestime que de la crénelure, et surtout pas sur les longs libellés', () => {
        // La table additionne des chasses ; le rendu réel applique en plus la
        // crénelure, qui **resserre**. La table est donc toujours un majorant,
        // d'autant plus lâche que le texte est court — sur « v. 30 », deux
        // paires crénées pèsent quelques pour cent. Ce qui compte est le
        // libellé long : c'est lui qui ferait flotter une puce trop large.
        const worst = { short: { text: '', ratio: 0 }, long: { text: '', ratio: 0 } };
        for (const weight of [400, 600] as const) {
          for (const text of TEXTS) {
            const folded = foldForFace(text, id as FaceId);
            if (folded === '') continue;
            const ratio = approximateMeasurer.measure(folded, 13, weight, id as FaceId) / real(weight, folded, 13);
            const bucket = folded.length > 12 ? worst.long : worst.short;
            if (ratio > bucket.ratio) { bucket.text = `${folded} @${weight}`; bucket.ratio = ratio; }
          }
        }
        expect(`long ${worst.long.ratio < 1.04} (${worst.long.ratio.toFixed(3)} — ${worst.long.text})`)
          .toBe(`long ${true} (${worst.long.ratio.toFixed(3)} — ${worst.long.text})`);
        expect(`court ${worst.short.ratio < 1.08} (${worst.short.ratio.toFixed(3)} — ${worst.short.text})`)
          .toBe(`court ${true} (${worst.short.ratio.toFixed(3)} — ${worst.short.text})`);
      });

      it('couvre toute la typographie française employée', () => {
        for (const weight of [400, 600] as const) {
          for (const char of 'àâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ’–—…«»°') {
            expect(`${id}/${weight}/${char} ${faces[weight].hasGlyphForCodePoint(char.codePointAt(0)!)}`)
              .toBe(`${id}/${weight}/${char} true`);
          }
        }
      });
    });
  }

  it('mesure différemment selon la fonte : c’est bien le sujet', () => {
    const ui = approximateMeasurer.measure('Moyen Âge', 13, 500, 'ui');
    const garamond = approximateMeasurer.measure('Moyen Âge', 13, 500, 'garamond');
    const craie = approximateMeasurer.measure('Moyen Âge', 13, 500, 'craie');
    // Un serif de la Renaissance et une écriture manuscrite sont plus étroits
    // qu'une grotesque d'interface : mesurer l'une pour dessiner l'autre
    // laisserait un blanc — ou ferait déborder, dans l'autre sens.
    expect(garamond).toBeLessThan(ui);
    expect(craie).toBeLessThan(garamond);
  });

  it('fige la fonte une fois pour toutes avec `forFace`', () => {
    const bound = forFace(approximateMeasurer, 'garamond');
    expect(bound.measure('Moyen Âge', 13, 500)).toBe(approximateMeasurer.measure('Moyen Âge', 13, 500, 'garamond'));
  });

  it('déclare honnêtement ce que chaque fonte ne porte pas', () => {
    // La fonte du système ne manque de rien : rien n'est remplacé.
    expect(missingChars('ui')).toBe('');
    expect(foldForFace('XVIIᵉ siècle', 'ui')).toBe('XVIIᵉ siècle');

    // Caveat, comme presque toutes les manuscrites, n'a pas les lettres
    // modificatives : « XVIIᵉ » y afficherait un caractère manquant.
    expect(missingChars('craie')).toContain('ᵉ');
    expect(foldForFace('XVIIᵉ siècle', 'craie')).toBe('XVIIe siècle');
    expect(foldForFace('Iᵉʳ siècle', 'craie')).toBe('Ier siècle');

    // Les deux sous-ensembles d'affichage n'ont pas l'espace fine insécable,
    // que le français emploie pour les milliers.
    for (const face of ['garamond', 'craie'] as const) {
      expect(missingChars(face)).toContain('\u202F');
      expect(foldForFace('3\u202F000\u202F001', face)).toBe('3 000 001');
    }
    // EB Garamond, elle, écrit bien l'exposant ordinal.
    expect(foldForFace('XVIIᵉ siècle', 'garamond')).toBe('XVIIᵉ siècle');
  });

  it('donne une fonte à chaque thème, et une table à chaque fonte livrée', () => {
    for (const theme of THEMES) expect(FACES[theme.face]).toBeDefined();
    for (const face of Object.values(FACES)) {
      if (face.table !== undefined) expect(FILES[face.table]).toBeDefined();
    }
    // Les deux fontes de thème sont réellement employées.
    expect(THEMES.map((theme) => theme.face)).toContain('garamond');
    expect(THEMES.map((theme) => theme.face)).toContain('craie');
  });
});
