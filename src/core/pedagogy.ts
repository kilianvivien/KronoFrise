/**
 * Mode « fiche élève » — docs/format.md §5.
 *
 * Masquer ne mute jamais un élément : `pedagogy.maskedItems` est un drapeau de
 * rendu, et le corrigé n'est rien d'autre que le même document rendu sans
 * masques. Ce module ne produit que des commandes (§6), donc tout est
 * annulable en une étape, y compris un masquage aléatoire.
 */
import { chronological } from './document';
import type { Command } from './commands';
import type { KronoDocument, MaskKind } from './types';

export type MaskField = 'label' | 'date';

/** Le champ `field` est-il caché pour cet élément ? */
export function hides(hide: MaskKind | undefined, field: MaskField): boolean {
  return hide === 'both' || hide === field;
}

export function setMask(itemId: string, hide: MaskKind | null): Command {
  return { name: 'setMask', itemId, hide };
}

/** Masque le même champ sur tous les éléments — « masquer tous les libellés ». */
export function maskAll(doc: KronoDocument, hide: MaskKind): Command {
  return {
    name: 'restoreMasks',
    masks: doc.items.map((item) => ({ itemId: item.id, hide })),
  };
}

export function clearMasks(): Command {
  return { name: 'restoreMasks', masks: [] };
}

/**
 * Masque une part des éléments, tirée au sort. Le tirage est injectable pour
 * que les tests soient déterministes ; l'ordre chronologique sert de base afin
 * que deux documents identiques donnent la même fiche avec le même tirage.
 */
export function maskRandom(
  doc: KronoDocument,
  ratio: number,
  hide: MaskKind = 'label',
  random: () => number = Math.random,
): Command {
  const items = chronological(doc.items);
  const count = Math.max(0, Math.min(items.length, Math.round(items.length * ratio)));
  // Mélange de Fisher-Yates : chaque élément a la même chance d'être masqué.
  const order = items.map((item) => item.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = order[i] as string;
    order[i] = order[j] as string;
    order[j] = a;
  }
  const chosen = new Set(order.slice(0, count));
  return {
    name: 'restoreMasks',
    masks: items.filter((item) => chosen.has(item.id)).map((item) => ({ itemId: item.id, hide })),
  };
}

/** Nombre d'éléments portant un masque — affiché dans le panneau fiche élève. */
export function maskedCount(doc: KronoDocument): number {
  return doc.pedagogy.maskedItems.length;
}
