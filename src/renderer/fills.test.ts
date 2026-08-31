import { describe, expect, it } from 'vitest';
import { apply, invert, type Command } from '../core/commands';
import { createDocument, linearAxis } from '../core/document';
import { parseDocument } from '../core/schema';
import { FILL_STYLES, type FillStyle } from '../core/types';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { contrastRatio, PALETTE } from '../shared/palette';
import { THEMES, MANUEL_SCOLAIRE } from '../themes';
import { renderToSvgString } from './renderToSvgString';
import { fillPaint, gradientPaint } from './FillPattern';
import { themeColors } from './themeColors';
import { GRADIENT_BANDS, gradientLayers, leftRoundedPath } from './shapes';

function fixture(fillStyle?: FillStyle) {
  const doc = createDocument({ axis: linearAxis({ year: 1700 }, { year: 1900 }) });
  doc.items = [
    { id: 'event', laneId: doc.lanes[0]!.id, kind: 'event', date: { year: 1789 }, label: 'Bastille', color: 'brique', ...(fillStyle ? { fillStyle } : {}) },
    { id: 'period', laneId: doc.lanes[0]!.id, kind: 'period', start: { year: 1700 }, end: { year: 1900 }, label: 'Période', color: 'canard', shape: 'arrow', fuzzyStart: true, ...(fillStyle ? { fillStyle } : {}) },
  ];
  return doc;
}
describe('item fills', () => {
  it.each(FILL_STYLES)('%s survives JSON and exact undo for a multi-selection', (fillStyle) => {
    const doc = fixture();
    const command: Command = { name: 'updateItems', label: 'fill', patches: doc.items.map((item) => ({ itemId: item.id, patch: { fillStyle } })) };
    const next = apply(doc, command);
    expect(parseDocument(JSON.parse(JSON.stringify(next)))).toEqual(next);
    expect(apply(next, invert(doc, command))).toEqual(doc);
    expect(layout(next, makeScale(next.axis, 800)).events[0]!.fillStyle).toBe(fillStyle);
  });
  it('rejects unrecognized fill styles and keeps old files unchanged', () => {
    expect(parseDocument(fixture()).items[0]).not.toHaveProperty('fillStyle');
    const raw = { ...fixture(), items: fixture().items.map((item) => ({ ...item, fillStyle: 'external-image' })) };
    expect(() => parseDocument(raw)).toThrow();
  });
  it.each(['hatch', 'crosshatch', 'dots', 'lines', 'grid'] as const)('%s renders self-contained unique vector patterns under all document themes', (fillStyle) => {
    for (const theme of THEMES) {
      const doc = fixture(fillStyle), scene = layout(doc, makeScale(doc.axis, 800));
      const svg = renderToSvgString({ scene, title: 'Fills', theme });
      const ids = [...svg.matchAll(/<pattern id="([^"]+)"/g)].map((match) => match[1]!);
      expect(ids).toHaveLength(2); expect(new Set(ids).size).toBe(2);
      for (const id of ids) expect(svg).toContain(`fill="url(#${id})"`);
      expect(svg).toContain('patternUnits="userSpaceOnUse"');
      expect(svg).toContain('mask="url(#fuzzy-period)"');
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it('uses transparent paint without losing the event hit area', () => {
    const doc = fixture('none');
    const svg = renderToSvgString({ scene: layout(doc, makeScale(doc.axis, 800)), title: 'Fills' });
    expect(svg).toContain('fill="transparent"'); expect(svg).not.toContain('<pattern');
  });
  it('chooses readable solid-fill text, while keeping outside period labels dark', () => {
    for (const theme of THEMES) for (const color of PALETTE) {
      const paint = fillPaint(color.id, theme, 'solid', 'test');
      expect(contrast(paint.fill, paint.text)).toBeGreaterThanOrEqual(4.5);
    }
    const doc = fixture('solid');
    const period = doc.items[1]!; if (period.kind === 'period') period.end = { year: 1701 };
    const svg = renderToSvgString({ scene: layout(doc, makeScale(doc.axis, 800)), title: 'Fills' });
    expect(svg).toContain(`fill:${themeColors('canard', MANUEL_SCOLAIRE).text}`);
  });
});
function contrast(a: string, b: string) {
  const light = (hex: string) => {
    const rgb = hex.slice(1).match(/../g)!.map((pair) => parseInt(pair, 16) / 255).map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0]! + .7152 * rgb[1]! + .0722 * rgb[2]!;
  };
  const x = light(a), y = light(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

describe('remplissage en dégradé (PLAN.md M4, ajout 3)', () => {
  it('produit un vrai linearGradient dans le SVG, pas un motif', () => {
    const svg = renderToSvgString({
      scene: layout(fixture('gradient'), makeScale(linearAxis({ year: 1700 }, { year: 1900 }), 1000)),
      title: 'Dégradé',
    });
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('stop-color');
    expect(svg).not.toMatch(/NaN|undefined/);
  });

  it('garde le libellé lisible d’un bout à l’autre de la barre', () => {
    // L'encre est calculée contre l'extrémité la plus soutenue — le pire cas.
    // À l'autre bout, plus clair, elle contraste forcément davantage.
    for (const theme of THEMES) {
      for (const entry of PALETTE) {
        const { from, to, text } = gradientPaint(entry.id, theme);
        for (const stop of [from, to]) {
          const ratio = contrastRatio(text, stop);
          expect(`${theme.id}/${entry.id} ${ratio >= 4.5}`).toBe(`${theme.id}/${entry.id} true`);
        }
      }
    }
  });

  it('empile ses couches de la plus large à la plus étroite', () => {
    const layers = gradientLayers();
    expect(layers).toHaveLength(GRADIENT_BANDS);
    // La première couche porte la forme réelle : c'est elle qui donne la
    // silhouette (coins arrondis, pointe de flèche) à tout l'empilement.
    expect(layers[0]).toMatchObject({ full: true, width: 1 });
    expect(layers.slice(1).every((layer) => !layer.full)).toBe(true);
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i]!.width).toBeLessThan(layers[i - 1]!.width);
      expect(layers[i]!.mix).toBeLessThan(layers[i - 1]!.mix);
    }
    // Les positions couvrent le dégradé sans sortir de [0, 1].
    expect(layers.at(-1)!.mix).toBeCloseTo(0.5 / GRADIENT_BANDS, 6);
    expect(layers[0]!.mix).toBeCloseTo(1 - 0.5 / GRADIENT_BANDS, 6);
  });

  it('donne aux couches intermédiaires un bord droit franc', () => {
    // Arrondi à droite, chaque jointure laisserait un feston clair.
    const path = leftRoundedPath(10, 20, 100, 24, 4);
    expect(path).toContain('M 14 20');
    expect(path).toContain('H 110');
    // Deux arcs seulement : les deux coins de gauche.
    expect(path.match(/A /g)).toHaveLength(2);
  });

  it('reste une valeur de format valide, annulable comme les autres', () => {
    const doc = fixture('gradient');
    expect(() => parseDocument(doc)).not.toThrow();
    expect(FILL_STYLES).toContain('gradient');
    const command: Command = { name: 'updateItems', label: 'setFill', patches: [{ itemId: 'event', patch: { fillStyle: 'gradient' } }] };
    const before = fixture();
    const after = apply(before, command);
    expect(after.items[0]!.fillStyle).toBe('gradient');
    expect(apply(after, invert(before, command))).toEqual(before);
  });
});

describe('le dégradé reste visible et borné', () => {
  it('s’écarte franchement sur un thème à remplissage clair', () => {
    const { from, to } = gradientPaint('brique', MANUEL_SCOLAIRE);
    expect(to).not.toBe(from);
    // Assez d'écart pour se voir : au moins un ton de différence.
    expect(contrastRatio(from, to)).toBeGreaterThan(1.15);
  });
  it('ne dépasse jamais la couleur pleine de l’élément', () => {
    for (const theme of THEMES) {
      for (const entry of PALETTE) {
        const { from, to } = gradientPaint(entry.id, theme);
        // `to` est entre le remplissage du thème et la couleur pleine.
        const between = contrastRatio(to, entry.base) <= contrastRatio(from, entry.base) + 1e-9;
        expect(`${theme.id}/${entry.id} ${between}`).toBe(`${theme.id}/${entry.id} true`);
      }
    }
  });
});
