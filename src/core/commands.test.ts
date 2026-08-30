import { describe, expect, it } from 'vitest';
import {
  addItems,
  apply,
  deleteItems,
  deleteLane,
  invert,
  moveEvent,
  renameLane,
  resizePeriod,
  setColor,
  setLabel,
  setLane,
  setAxis,
  shiftItems,
  type Command,
} from './commands';
import { createDocument, linearAxis } from './document';
import { execute, redo, undo, HISTORY_LIMIT, emptyHistory, type HistoryState } from './history';
import { parseDocument } from './schema';
import type { EventItem, KronoDocument, PeriodItem } from './types';

function baseDoc(): KronoDocument {
  const doc = createDocument({
    title: 'Test',
    axis: linearAxis({ year: 1700 }, { year: 1900 }),
    now: new Date('2026-01-01T00:00:00.000Z'),
  });
  const laneId = doc.lanes[0]!.id;
  const event: EventItem = {
    id: 'e1', kind: 'event', laneId, label: 'Prise de la Bastille',
    color: 'brique', date: { year: 1789, month: 7, day: 14 },
  };
  const period: PeriodItem = {
    id: 'p1', kind: 'period', laneId, label: 'Consulat', color: 'ardoise',
    start: { year: 1799 }, end: { year: 1804 }, shape: 'bar',
  };
  return apply(doc, addItems(doc, [event, period]));
}

/** L'invariant central : apply(doc, invert(doc, c)) ramène exactement doc. */
function expectExactInverse(doc: KronoDocument, command: Command): KronoDocument {
  const inverse = invert(doc, command);
  const after = apply(doc, command);
  expect(apply(after, inverse)).toEqual(doc);
  return after;
}

describe('commandes : chaque mutation a un inverse exact', () => {
  const doc = baseDoc();

  it('déplace un événement', () => {
    const after = expectExactInverse(doc, moveEvent('e1', { year: 1790 }));
    expect((after.items[0] as EventItem).date).toEqual({ year: 1790 });
  });

  it('redimensionne une période', () => {
    const after = expectExactInverse(doc, resizePeriod('p1', { year: 1799 }, { year: 1815 }));
    expect((after.items[1] as PeriodItem).end).toEqual({ year: 1815 });
  });

  it('renomme un élément', () => {
    expectExactInverse(doc, setLabel('e1', 'Bastille'));
  });

  it('recolore une sélection', () => {
    expectExactInverse(doc, setColor(['e1', 'p1'], 'foret'));
  });

  it('décale une sélection dans le temps', () => {
    const after = expectExactInverse(doc, shiftItems(doc, ['e1', 'p1'], 10));
    expect((after.items[0] as EventItem).date).toEqual({ year: 1799, month: 7, day: 14 });
    expect((after.items[1] as PeriodItem).start).toEqual({ year: 1809 });
  });

  it('ajoute des éléments', () => {
    const item: EventItem = {
      id: 'e2', kind: 'event', laneId: doc.lanes[0]!.id,
      label: 'Sacre', color: 'ocre', date: { year: 1804 },
    };
    const after = expectExactInverse(doc, addItems(doc, [item]));
    expect(after.items).toHaveLength(3);
  });

  it('supprime des éléments et les remet à leur place exacte', () => {
    const after = expectExactInverse(doc, deleteItems(doc, ['e1']));
    expect(after.items.map((i) => i.id)).toEqual(['p1']);
  });

  it('remet chaque élément à son index d’origine', () => {
    const three = apply(doc, addItems(doc, [{
      id: 'e3', kind: 'event', laneId: doc.lanes[0]!.id, label: 'Trois', color: 'ocre', date: { year: 1850 },
    }]));
    const command = deleteItems(three, ['p1']);
    const after = apply(three, command);
    expect(apply(after, invert(three, command)).items.map((i) => i.id)).toEqual(['e1', 'p1', 'e3']);
  });

  it('change l’axe', () => {
    expectExactInverse(doc, setAxis(linearAxis({ year: 1600 }, { year: 2000 })));
  });

  it('renomme une bande', () => {
    expectExactInverse(doc, renameLane(doc.lanes[0]!.id, 'Politique'));
  });

  it('efface un champ optionnel puis le restaure', () => {
    const withDescription = apply(doc, {
      name: 'updateItems', label: 'setDescription',
      patches: [{ itemId: 'e1', patch: { description: 'Journée fondatrice' } }],
    });
    expectExactInverse(withDescription, {
      name: 'updateItems', label: 'setDescription',
      patches: [{ itemId: 'e1', patch: { description: null } }],
    });
  });
});

describe('suppression d’une bande', () => {
  it('déplace les éléments au lieu de les supprimer, en une seule étape', () => {
    const doc = apply(baseDoc(), { name: 'insertLane', lane: { id: 'l2', name: 'Arts' }, at: 1 });
    const withArts = apply(doc, setLane(['e1'], 'l2'));
    const command = deleteLane(withArts, 'l2')!;
    const after = apply(withArts, command);
    expect(after.lanes).toHaveLength(1);
    expect(after.items).toHaveLength(2);
    expect(after.items[0]!.laneId).toBe(withArts.lanes[0]!.id);
    expect(apply(after, invert(withArts, command))).toEqual(withArts);
  });

  it('refuse de supprimer la dernière bande', () => {
    const doc = baseDoc();
    expect(deleteLane(doc, doc.lanes[0]!.id)).toBeNull();
  });
});

describe('historique', () => {
  const start: HistoryState = { document: baseDoc(), history: emptyHistory };

  it('annule et rétablit', () => {
    const moved = execute(start, moveEvent('e1', { year: 1800 }));
    expect((moved.document.items[0] as EventItem).date).toEqual({ year: 1800 });

    const undone = undo(moved);
    expect(undone.document).toEqual(start.document);

    const redone = redo(undone);
    expect(redone.document).toEqual(moved.document);
  });

  it('vide la pile « rétablir » après une nouvelle commande', () => {
    const after = redo(undo(execute(start, setLabel('e1', 'A'))));
    const next = execute(undo(after), setLabel('e1', 'B'));
    expect(next.history.future).toHaveLength(0);
  });

  it('plafonne la pile à 200 entrées', () => {
    let state = start;
    for (let i = 0; i < HISTORY_LIMIT + 25; i++) {
      state = execute(state, setLabel('e1', `Étape ${i}`));
    }
    expect(state.history.past).toHaveLength(HISTORY_LIMIT);
  });

  it('reste sérialisable (JSON) pour l’autosauvegarde', () => {
    const state = execute(start, moveEvent('e1', { year: 1800 }));
    const roundTripped = JSON.parse(JSON.stringify(state.history)) as typeof state.history;
    expect(roundTripped).toEqual(state.history);
    const restored: HistoryState = { document: state.document, history: roundTripped };
    expect(undo(restored).document).toEqual(start.document);
  });

  it('produit toujours un document valide', () => {
    const state = execute(execute(start, moveEvent('e1', { year: 1800 })), setColor(['p1'], 'prune'));
    expect(() => parseDocument(JSON.parse(JSON.stringify(state.document)))).not.toThrow();
  });
});
