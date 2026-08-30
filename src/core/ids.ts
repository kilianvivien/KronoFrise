import { v4 as uuidv4 } from 'uuid';

/** Identifiant d'un document, d'une bande ou d'un élément (uuid v4). */
export function newId(): string {
  return uuidv4();
}
