/**
 * Fontes du document — PLAN.md M4 (ajout 2), seconde facette : « qu'un thème
 * puisse nommer sa typographie ».
 *
 * Données pures : ni DOM, ni React, ni fichier de police. Le nom de famille
 * CSS sert à l'écran et au SVG exporté ; `export/fonts.ts` fait le lien avec
 * les fichiers, et `layout/measure.ts` avec les tables de chasses.
 *
 * Une fonte change la **géométrie** : la largeur d'un libellé décide de la
 * largeur de sa puce. C'est pourquoi le choix est connu du moteur de mise en
 * page, et non du seul rendu — sinon l'écran mesurerait une police et en
 * dessinerait une autre, ce qui est exactement le défaut de spec-gaps §12.7.
 */

export type FaceId = 'ui' | 'garamond' | 'craie';

export interface Face {
  id: FaceId;
  /**
   * Pile CSS. La face d'interface reprend le jeton de DESIGN.md §2 ; les
   * autres nomment la fonte livrée puis un repli système, pour que le texte
   * reste lisible si le fichier n'a pas encore été chargé.
   */
  family: string;
  /** clé de la table engendrée ; absente pour la fonte du système */
  table?: 'garamond' | 'craie';
}

export const FACES: Record<FaceId, Face> = {
  ui: {
    id: 'ui',
    family: 'var(--font-ui)',
  },
  garamond: {
    id: 'garamond',
    family: "'EB Garamond', Georgia, 'Times New Roman', serif",
    table: 'garamond',
  },
  craie: {
    id: 'craie',
    family: "'Caveat', 'Bradley Hand', 'Segoe Script', cursive",
    table: 'craie',
  },
};

export const DEFAULT_FACE: FaceId = 'ui';

export function faceById(id: string | undefined): Face {
  return FACES[id as FaceId] ?? FACES[DEFAULT_FACE];
}
