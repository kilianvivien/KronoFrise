// SPEC? Shared pure data keeps core/layout independent of ui; see docs/spec-gaps.md §1.
export * from "../shared/strings";

export const EDITOR = {
  open: 'Ouvrir…', save: 'Enregistrer', fileType: 'Frise KronoFrise', defaultFilename: 'frise',
  title: 'Titre de la frise', label: 'Libellé', event: 'Nouvel événement', period: 'Nouvelle période',
  canvas: 'Frise chronologique', sidebar: 'Structure', inspector: 'Inspecteur',
  sidebarHint: 'Les bandes et le plan de la frise seront disponibles ici.',
  inspectorHint: 'Double-cliquez sur un élément pour modifier son libellé. Faites glisser ses bords pour ajuster une période.',
  sidebarToggle: 'Afficher ou masquer la structure', inspectorToggle: 'Afficher ou masquer l’inspecteur',
  duplicate: 'Dupliquer', selectAll: 'Tout sélectionner',
  hint: 'E : événement · P : période · Maj + glisser : sélectionner · Espace + glisser : naviguer · ⌥ : sans aimantation',
  saved: 'Enregistré sur cet appareil', saving: 'Enregistrement…', loading: 'Ouverture de la frise…',
  fileSaved: 'Fichier .krono enregistré',
  storageError: 'L’enregistrement local a échoué. Enregistrez un fichier .krono pour conserver votre travail.',
  restoreError: 'La sauvegarde locale est illisible. Ouvrez votre fichier .krono pour récupérer votre frise.',
  fileTooLarge: 'Ce fichier dépasse 20 Mo. Réduisez les images avant de l’ouvrir ou de l’enregistrer.',
  fileError: 'Le fichier n’a pas pu être ouvert ou enregistré. Vérifiez les autorisations puis réessayez.',
  close: 'Fermer', examples: 'Ouvrir un exemple', chooseExample: 'Exemples…',
  selected: (count: number): string => `${count} élément${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`,
  eventAccessible: (label: string, date: string): string => `Événement : ${label}, ${date}`,
  periodAccessible: (label: string, date: string): string => `Période : ${label}, ${date}`,
  axisStart: 'Modifier le début de la frise', axisEnd: 'Modifier la fin de la frise',
  invalidDate: 'Date incomprise. Essayez « 1515 », « -52 » ou « 14/07/1789 ».',
  resizeStart: 'Déplacer le début', resizeEnd: 'Déplacer la fin',
  zoomPercent: (zoom: number): string => `${Math.round(zoom * 100)} %`,
  range: (start: string, end: string): string => `${start} – ${end}`,
} as const;
