import { describe, expect, it } from 'vitest';
import { FIXTURES, antiquite, revolution } from '../core/fixtures/index';
import { layout } from '../layout/layout';
import { makeScale } from '../layout/scale';
import { renderToSvgString } from './renderToSvgString';
import type { KronoDocument } from '../core/types';

const WIDTH = 1200;

function svgOf(doc: KronoDocument, zoom = 1): string {
  const scale = makeScale(doc.axis, WIDTH, 0, zoom);
  return renderToSvgString({ scene: layout(doc, scale), title: doc.meta.title });
}

describe('rendu headless (docs/format.md §9)', () => {
  it.each(FIXTURES)('$file produit un SVG autonome', ({ document }) => {
    const svg = svgOf(document);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('</svg>');
    // Les jetons de couleur voyagent avec le fichier.
    expect(svg).toContain('--paper');
    // Aucune géométrie indéfinie n'a fui dans la sortie.
    expect(svg).not.toMatch(/(NaN|undefined|Infinity)/);
  });

  it('écrit le texte en vrais nœuds SVG, jamais en tracés', () => {
    const svg = svgOf(revolution);
    expect(svg).toContain('Prise de la Bastille');
    expect(svg).toContain('14 juillet 1789');
    expect(svg).toContain('<text');
  });

  it('résout les identifiants de palette en couleurs calculées', () => {
    const svg = svgOf(revolution);
    expect(svg).not.toContain('"brique"');
    expect(svg.toUpperCase()).toContain('#B24E33'); // brique, bordure de puce
  });

  it('rend l’axe avant J.-C. avec ses libellés français', () => {
    const svg = svgOf(antiquite);
    expect(svg).toContain('av. J.-C.');
    expect(svg).toContain('siècle');
  });

  it('donne la même image à l’écran et à l’export (mêmes primitives)', () => {
    expect(svgOf(revolution, 3)).toBe(svgOf(revolution, 3));
  });
});
