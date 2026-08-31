/**
 * Bloc de titre — PLAN.md M4 (ajout 4).
 *
 * Le point du bloc est qu'il fait partie du `SceneGraph` : l'écran, le SVG, le
 * PNG et le PDF le posent aux mêmes lignes de base. Les tests portent donc sur
 * la scène, pas sur un composant.
 */
import { describe, expect, it } from 'vitest';
import { apply, invert, type Command } from '../core/commands';
import { createDocument, linearAxis } from '../core/document';
import { parseDocument } from '../core/schema';
import type { KronoDocument, TitleBlock } from '../core/types';
import { layout } from './layout';
import { makeScale } from './scale';

const WIDTH = 1000;

function docWith(block?: TitleBlock): KronoDocument {
  const doc = createDocument({ axis: linearAxis({ year: 1700 }, { year: 1900 }) });
  doc.meta.title = 'La Révolution française';
  doc.meta.author = 'Kilian Vivien';
  doc.meta.createdAt = '2026-08-31T10:00:00.000Z';
  doc.items = [{ id: 'e1', laneId: doc.lanes[0]!.id, kind: 'event', date: { year: 1789 }, label: 'Bastille', color: 'brique' }];
  if (block) doc.titleBlock = block;
  return doc;
}
const sceneOf = (doc: KronoDocument, height = 700) =>
  layout(doc, makeScale(doc.axis, WIDTH), { height });

describe('bloc de titre', () => {
  it('est absent tant que le document n’en demande pas', () => {
    // Un document d'avant M4 se charge et se dessine exactement comme avant.
    const scene = sceneOf(docWith());
    expect(scene.title).toBeUndefined();
    expect(() => parseDocument(docWith())).not.toThrow();
  });

  it('repousse les bandes au lieu de se poser par-dessus', () => {
    const without = sceneOf(docWith());
    const with_ = sceneOf(docWith({ align: 'left', subtitle: 'Chronologie de 1789 à 1799' }));
    expect(with_.lanes[0]!.y).toBeGreaterThan(without.lanes[0]!.y);
    // La dernière ligne du bloc reste au-dessus de la première bande.
    const lastBaseline = with_.title!.metaY ?? with_.title!.subtitleY ?? with_.title!.titleY;
    expect(lastBaseline).toBeLessThan(with_.lanes[0]!.y);
  });

  it('n’écrit que les lignes demandées', () => {
    const minimal = sceneOf(docWith({ align: 'left' })).title!;
    expect(minimal.title).toBe('La Révolution française');
    expect(minimal.subtitle).toBeUndefined();
    expect(minimal.meta).toBeUndefined();

    const full = sceneOf(docWith({ align: 'left', subtitle: 'De 1789 à 1799', author: true, date: true })).title!;
    expect(full.subtitle).toBe('De 1789 à 1799');
    // Auteur et date sur une seule ligne, à la française.
    expect(full.meta).toBe('Kilian Vivien · 31 août 2026');
    expect(full.height).toBeGreaterThan(minimal.height);
  });

  it('omet l’auteur quand le document n’en porte pas', () => {
    const doc = docWith({ align: 'left', author: true });
    delete doc.meta.author;
    expect(sceneOf(doc).title!.meta).toBeUndefined();
  });

  it('centre le texte sur la largeur, ou le cale à gauche', () => {
    const left = sceneOf(docWith({ align: 'left' })).title!;
    expect(left.anchor).toBe('start');
    const centered = sceneOf(docWith({ align: 'center' })).title!;
    expect(centered.anchor).toBe('middle');
    expect(centered.x).toBe(WIDTH / 2);
  });

  it('décale aussi les coupures, qui longent les bandes', () => {
    const elastic = docWith({ align: 'left', subtitle: 'Deux échelles' });
    elastic.axis = { start: { year: -3000 }, end: { year: 2000 }, segments: [{ until: { year: 1900 }, weight: 1 }, { until: { year: 2000 }, weight: 6 }] };
    const scene = layout(elastic, makeScale(elastic.axis, WIDTH), { height: 700 });
    expect(scene.coupures.length).toBeGreaterThan(0);
    // Une coupure qui partirait du haut du canevas traverserait le titre.
    expect(scene.coupures[0]!.top).toBeGreaterThanOrEqual(scene.title!.height);
  });

  it('s’ajoute et se retire par une commande exactement inversible', () => {
    const before = docWith();
    const add: Command = { name: 'setTitleBlock', block: { align: 'center', subtitle: 'Cycle 3', date: true } };
    const after = apply(before, add);
    expect(after.titleBlock).toEqual({ align: 'center', subtitle: 'Cycle 3', date: true });
    expect(apply(after, invert(before, add))).toEqual(before);
    // Retirer le bloc rend le document identique à celui qui n'en a jamais eu.
    const remove: Command = { name: 'setTitleBlock', block: null };
    expect(apply(after, remove)).toEqual(before);
    expect('titleBlock' in apply(after, remove)).toBe(false);
  });

  it('reste un document valide, relisible tel quel', () => {
    const doc = docWith({ align: 'center', subtitle: 'Cycle 3', author: true, date: true });
    expect(() => parseDocument(JSON.parse(JSON.stringify(doc)))).not.toThrow();
    expect(() => parseDocument({ ...doc, titleBlock: { align: 'diagonal' } })).toThrow();
  });
});

describe('modification partielle du bloc', () => {
  it('ne perd pas un réglage validé juste avant', () => {
    // Chaque contrôle de l'inspecteur écrit l'objet entier ; construit sur une
    // valeur capturée au rendu, le sous-titre disparaissait dès qu'on cochait
    // « Auteur » dans la foulée. Le patch repart de l'état courant.
    let doc = docWith({ align: 'left' });
    const patch = (partial: Partial<TitleBlock>): void => {
      const current = doc.titleBlock!;
      const block: TitleBlock = { ...current, ...partial };
      for (const key of Object.keys(partial) as (keyof TitleBlock)[]) {
        if (partial[key] === undefined) delete block[key];
      }
      doc = apply(doc, { name: 'setTitleBlock', block });
    };
    patch({ subtitle: 'Cycle 3' });
    patch({ author: true });
    patch({ align: 'center' });
    expect(doc.titleBlock).toEqual({ align: 'center', subtitle: 'Cycle 3', author: true });
    // Vider le sous-titre retire la clé au lieu de laisser une chaîne vide.
    patch({ subtitle: undefined });
    expect('subtitle' in doc.titleBlock!).toBe(false);
  });
});
