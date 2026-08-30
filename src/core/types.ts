/**
 * Modèle de document `.krono` — contrat de docs/format.md.
 * Types uniquement : la validation vit dans `schema.ts`.
 */

/** Année astronomique : 1 = 1 apr. J.-C., 0 = 1 av. J.-C., -1 = 2 av. J.-C. */
export type Year = number;

export const YEAR_MIN = -10_000_000;
export const YEAR_MAX = 10_000;

export interface KDate {
  year: Year;
  /** 1–12, seulement si la précision le permet */
  month?: number;
  /** 1–31, exige `month` */
  day?: number;
  /** affiche « v. 800 » */
  circa?: boolean;
}

export interface Segment {
  /** le segment couvre [`until` précédent (ou `axis.start`), `until`) */
  until: KDate;
  /** > 0 ; part de la largeur = weight / somme des weights */
  weight: number;
}

export interface Axis {
  start: KDate;
  end: KDate;
  /** ≥ 1, contigus, ordonnés ; le dernier `until` vaut `end` */
  segments: Segment[];
}

export interface Lane {
  id: string;
  /** « » autorisé (bande unique sans nom) */
  name: string;
  collapsed?: boolean;
  /** Optional palette color, added in M2; old documents remain valid. */
  color?: string;
}

export interface ItemImage {
  /** data URL — un `.krono` est autonome */
  src: string;
}

export const FILL_STYLES = ['tint', 'solid', 'none', 'hatch', 'crosshatch', 'dots', 'lines', 'grid'] as const;
export type FillStyle = typeof FILL_STYLES[number];

export interface ItemBase {
  id: string;
  laneId: string;
  label: string;
  description?: string;
  /** identifiant de palette (« brique »), ou hex personnalisé préfixé « # » */
  color: string;
  /** Absent = original light tint. Patterns remain vector geometry. */
  fillStyle?: FillStyle;
  image?: ItemImage;
  /** empilement manuel ; absent = disposition automatique */
  pinnedRow?: number;
}

export interface EventItem extends ItemBase {
  kind: 'event';
  date: KDate;
}

export type PeriodShape = 'bar' | 'bracket' | 'arrow';

export interface PeriodItem extends ItemBase {
  kind: 'period';
  start: KDate;
  end: KDate;
  shape: PeriodShape;
  fuzzyStart?: boolean;
  fuzzyEnd?: boolean;
}

export type Item = EventItem | PeriodItem;

export type MaskKind = 'label' | 'date' | 'both';

export interface Pedagogy {
  maskedItems: { itemId: string; hide: MaskKind }[];
}

export interface DocumentMeta {
  title: string;
  author?: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601, mis à jour à chaque enregistrement */
  modifiedAt: string;
}

export const SCHEMA_VERSION = 'krono/1';

export interface KronoDocument {
  schema: typeof SCHEMA_VERSION;
  id: string;
  meta: DocumentMeta;
  axis: Axis;
  themeId: string;
  /** ≥ 1 */
  lanes: Lane[];
  items: Item[];
  pedagogy: Pedagogy;
}

export const MAX_SEGMENTS = 8;
