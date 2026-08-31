import { describe, expect, it } from 'vitest';
import { apply } from '../core/commands';
import { antiquite, grandesPeriodes, revolution } from '../core/fixtures/index';
import { maskAll } from '../core/pedagogy';
import { createDocument } from '../core/document';
import { exportFilename, exportScene, exportSvg } from './render';

describe('exports vectoriels', () => {
  it('rend chaque fixture en SVG autonome', async () => {
    for (const doc of [revolution, antiquite, grandesPeriodes]) {
      const svg = await exportSvg(doc, { width: 1000 });
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain(doc.meta.title);
      expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      // Les jetons voyagent avec le fichier : il s'ouvre hors de l'application.
      expect(svg).toContain(':root');
    }
  });

  it('exporte la scène à la largeur demandée, sans rogner les libellés', () => {
    const narrow = exportScene(revolution, { width: 800 });
    const wide = exportScene(revolution, { width: 2400 });
    expect(narrow.width).toBe(800);
    expect(wide.width).toBe(2400);
    for (const scene of [narrow, wide]) {
      for (const event of scene.events) {
        expect(event.chip.x).toBeGreaterThan(-1);
        expect(event.chip.x + event.chip.width).toBeLessThan(scene.width + 1);
      }
    }
  });

  it('exporte la fiche élève sans souffler les réponses', async () => {
    const masked = apply(revolution, maskAll(revolution, 'both'));
    const worksheet = await exportSvg(masked, { width: 1000, worksheet: true });
    for (const item of revolution.items) expect(worksheet).not.toContain(item.label);
    const key = await exportSvg(masked, { width: 1000 });
    expect(key).toContain(revolution.items[0]!.label);
  });

  it('n’imprime le papier du thème que si le fond n’est pas transparent', async () => {
    const opaque = await exportSvg(revolution, { width: 800 });
    const transparent = await exportSvg(revolution, { width: 800, transparent: true });
    expect(opaque).toContain('background');
    expect(transparent).not.toContain('background:');
    // Le dessin, lui, ne change pas : seuls le fond et le rectangle de papier.
    expect(transparent.length).toBeLessThan(opaque.length);
    expect(transparent).toContain(revolution.items[0]!.label);
  });

  it('nomme le fichier d’après le titre, sans caractère interdit', () => {
    expect(exportFilename(revolution, 'svg', 'frise')).toBe('La Révolution française.svg');
    expect(exportFilename({ ...revolution, meta: { ...revolution.meta, title: 'a/b:c' } }, 'pdf', 'frise')).toBe('a_b_c.pdf');
    expect(exportFilename({ ...createDocument(), meta: { ...revolution.meta, title: '   ' } }, 'png', 'frise')).toBe('frise.png');
  });
});

describe('bloc de titre dans les exports vectoriels', () => {
  it('écrit le titre, le sous-titre et la ligne d’auteur dans le SVG', async () => {
    const doc = structuredClone(revolution);
    doc.meta.author = 'Kilian Vivien';
    doc.titleBlock = { align: 'left', subtitle: 'Chronologie de 1789 à 1799', author: true, date: true };
    // Le vrai chemin d'export, pas un rendu monté pour l'occasion.
    const svg = await exportSvg(doc, { width: 1200 });
    expect(svg).toContain('Chronologie de 1789');
    expect(svg).toContain('Kilian Vivien');
    expect(svg).not.toMatch(/NaN|undefined/);
  });
});
