/**
 * Toutes les chaînes visibles par l'utilisateur — DESIGN.md §1.3 et §9.
 * Français, vouvoiement, casse de phrase, verbes en tête des boutons.
 * Aucun littéral de texte visible ailleurs dans l'application.
 *
 * SPEC? Ce fichier (et palette.ts) sont importables depuis core/ et layout/
 * alors que PLAN.md §4.2 interdit `ui/` à ces couches : ce sont des modules de
 * données purs (ni React ni DOM), et DESIGN.md §1.3 exige une source unique
 * pour les chaînes, y compris les messages d'erreur de core/. Voir
 * docs/spec-gaps.md §1. L'exception est appliquée par ESLint, elle ne s'étend
 * à aucun autre fichier de ui/.
 */

export const APP_NAME = 'KronoFrise';
export const APP_TAGLINE = 'L’éditeur de frises chronologiques.';

/** Vocabulaire des dates — utilisé par core/dates.ts (formatage et analyse). */
export const DATES = {
  bcSuffix: 'av. J.-C.',
  circaPrefix: 'v.',
  century: 'siècle',
  /** Abréviations utilisées sur la règle (niveau mois). */
  monthsShort: [
    'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
  ],
  /** Noms pleins — puces, inspecteur, infobulle de glissement. */
  monthsLong: [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ],
  /** Le 1er du mois s'écrit « 1er », les autres jours en chiffres. */
  firstDayOfMonth: '1er',
} as const;

export const DOC = {
  untitled: 'Frise sans titre',
  defaultLaneName: '',
  importedTitle: 'Frise importée',
} as const;

export const TOOLBAR = {
  undo: 'Annuler',
  redo: 'Rétablir',
  addEvent: '+ Événement',
  addPeriod: '+ Période',
  zoomOut: 'Dézoomer',
  zoomIn: 'Zoomer',
  zoomFit: 'Ajuster à la fenêtre',
  modeEdit: 'Édition',
  modePresent: 'Présentation',
  modeWorksheet: 'Fiche élève',
  export: 'Exporter',
  share: 'Partager',
} as const;

export const CANVAS = {
  emptyHint:
    'Cliquez sur la frise pour ajouter un événement, ou faites glisser pour tracer une période.',
} as const;

export const START = {
  empty: 'Aucune frise pour l’instant. Créez votre première frise ou importez un fichier.',
  newDocument: 'Nouvelle frise',
} as const;

export const CONFIRM = {
  /** « Supprimer 3 éléments ? » */
  deleteItems: (count: number): string =>
    count === 1 ? 'Supprimer cet élément ?' : `Supprimer ${count} éléments ?`,
  delete: 'Supprimer',
  cancel: 'Annuler',
} as const;

/** Les erreurs nomment le correctif (DESIGN.md §9). */
export const ERRORS = {
  notAKronoFile:
    'Ce fichier n’est pas une frise KronoFrise (.krono). Vérifiez le fichier ou importez un export MiCetF.',
  invalidDocument: (detail: string): string =>
    `Ce fichier .krono est incomplet ou abîmé (${detail}). Vérifiez le fichier ou repartez d’une nouvelle frise.`,
  unknownSchema: (schema: string): string =>
    `Cette frise a été créée avec une version plus récente de KronoFrise (${schema}). Mettez l’application à jour pour l’ouvrir.`,
  axisEndBeforeStart: 'la fin de l’axe doit être postérieure à son début',
  segmentsNotSorted: 'les segments de l’axe doivent être classés par date croissante',
  lastSegmentMismatch: 'le dernier segment doit se terminer à la fin de l’axe',
  segmentWeight: 'chaque segment doit avoir une largeur strictement positive',
  tooManySegments: 'l’axe ne peut pas dépasser 8 segments',
  noLane: 'une frise contient au moins une bande',
  unknownLane: (id: string): string => `l’élément renvoie à une bande inexistante (${id})`,
  periodEndBeforeStart: 'une période doit se terminer après son début',
  unparsableDate: (input: string): string =>
    `Date incomprise : « ${input} ». Essayez « 1515 », « -52 », « v. 800 » ou « 14/07/1789 ».`,
  imageTooLarge:
    'Cette image dépasse 300 Ko : la frise sera plus lente à ouvrir et à exporter.',
} as const;

/** Page de développement M0 — retirée quand l'éditeur (M1) la remplace. */
export const DEV = {
  title: 'Aperçu des fixtures',
  subtitle: 'M0 — modèle de document, échelle segmentée et règle adaptative.',
  zoom: 'Zoom',
  reset: 'Réinitialiser la vue',
  hint: 'Molette pour naviguer, ⌘/Ctrl + molette pour zoomer.',
} as const;
