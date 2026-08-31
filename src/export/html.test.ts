/**
 * Page web interactive : elle doit vivre seule, sans réseau, et ne pas laisser
 * du texte de document devenir du balisage.
 */
import { describe, expect, it } from 'vitest';
import { apply } from '../core/commands';
import { antiquite, grandesPeriodes, revolution } from '../core/fixtures/index';
import { maskAll } from '../core/pedagogy';
import { chronological } from '../core/document';
import { escapeHtml, escapeJson, exportHtml, viewerItems } from './html';
import { exportScene } from './render';

describe('export HTML interactif', () => {
  it('produit une page autonome pour chaque fixture', async () => {
    for (const doc of [revolution, antiquite, grandesPeriodes]) {
      const html = await exportHtml(doc, { width: 1600 });
      expect(html.startsWith('<!doctype html>')).toBe(true);
      expect(html).toContain('<svg');
      expect(html).toContain(doc.meta.title);
      // Aucune ressource distante : ni script, ni police, ni image en ligne.
      expect(html).not.toMatch(/(src|href)\s*=\s*["']https?:/);
      expect(html).not.toContain('<link');
      expect(html).not.toMatch(/NaN|Infinity/);
    }
  });

  it('embarque tous les éléments, dans l’ordre chronologique', async () => {
    const scene = exportScene(revolution, { width: 1600 });
    const items = viewerItems(revolution, scene, false);
    expect(items).toHaveLength(revolution.items.length);
    expect(items.map((item) => item.id)).toEqual(chronological(revolution.items).map((item) => item.id));
    const html = await exportHtml(revolution, { width: 1600 });
    for (const item of revolution.items) expect(html).toContain(item.label);
  });

  it('n’écrit jamais de balisage venu du document', async () => {
    const doc = structuredClone(revolution);
    doc.items[0]!.label = '<script>alert(1)</script>';
    doc.items[0]!.description = '</script><img onerror=alert(1)>';
    const html = await exportHtml(doc, { width: 1200 });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('</script><img');
    expect(escapeHtml('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;');
    expect(escapeJson({ a: '</script>' })).not.toContain('</script>');
  });

  it('respecte les masques de la fiche élève', async () => {
    const masked = apply(revolution, maskAll(revolution, 'both'));
    const html = await exportHtml(masked, { width: 1200, worksheet: true });
    for (const item of revolution.items) expect(html).not.toContain(item.label);
  });
});
