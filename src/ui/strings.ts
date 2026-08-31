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
  hint: 'Glisser : naviguer · E : événement · P : période · Maj + glisser : sélectionner · ⌥ : sans aimantation',
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

export const M2 = {
  navigate: 'Naviguer et sélectionner', navigation: 'Naviguer',
  document: 'Document', item: 'Élément', event: 'Événement', period: 'Période',
  appearance: 'Apparence', details: 'Détails', title: 'Titre', author: 'Auteur',
  label: 'Libellé', description: 'Description', date: 'Date', start: 'Début', end: 'Fin',
  circa: 'Date approximative', fuzzyStart: 'Début approximatif', fuzzyEnd: 'Fin approximative',
  shape: 'Forme', bar: 'Barre', bracket: 'Accolade', arrow: 'Flèche',
  lane: 'Bande', lanes: 'Bandes', addLane: 'Ajouter une bande', laneName: 'Nom de la bande',
  unnamedLane: 'Bande sans nom', newLane: 'Nouvelle bande', deleteLane: 'Supprimer la bande',
  collapse: 'Replier la bande', expand: 'Déplier la bande', moveUp: 'Monter la bande', moveDown: 'Descendre la bande',
  laneColor: 'Couleur de la bande', color: 'Couleur', defaultColor: 'Couleur par défaut',
  search: 'Rechercher dans la frise', noResults: 'Aucun élément trouvé.',
  theme: 'Thème', manuel: 'Manuel scolaire', craie: 'Craie', parchemin: 'Parchemin', journal: 'Journal',
  axis: 'Axe du temps', split: 'Scinder à cette date', splitAt: 'Date de coupure',
  segment: 'Segment', boundary: 'Modifier la coupure', removeBreak: 'Supprimer la coupure',
  addBreak: 'Ajouter une coupure', apply: 'Appliquer', weight: 'Largeur relative',
  maxSegments: 'Une frise peut contenir jusqu’à huit segments.', invalidAxis: 'La coupure doit se trouver entre les deux bornes du segment.',
  resizeBoundary: (index: number): string => `Déplacer la coupure ${index}`,
  segmentName: (index: number): string => `Segment ${index}`,
  preset: 'Insérer les grandes périodes', presetHint: 'Ajoute les cinq périodes dans une nouvelle bande et ajuste l’axe, sans effacer vos éléments.',
  periodNames: ['Préhistoire', 'Antiquité', 'Moyen Âge', 'Époque moderne', 'Époque contemporaine'],
  presetLane: 'Grandes périodes',
  image: 'Image', addImage: 'Ajouter une image…', removeImage: 'Retirer l’image',
  imageHint: 'Déposez une image sur un événement ou choisissez un fichier.',
  invalidImage: 'Cette image ne peut pas être lue. Choisissez un fichier PNG, JPEG ou WebP.',
  imageTooLarge: 'L’image est trop volumineuse. Choisissez un fichier de moins de 20 Mo.',
  row: 'Rangée', automatic: 'Automatique', pinned: 'Fixer la rangée',
  minimap: 'Navigateur de la frise', viewPosition: 'Position de la vue',
  resizeSidebar: 'Redimensionner la structure',
  multiHint: 'La couleur et la bande s’appliquent à tous les éléments sélectionnés.',
  selectLane: 'Modifier cette bande',
} as const;

/** Mode fiche élève — PLAN.md §3.5, docs/format.md §5. */
export const WORKSHEET = {
  blank: 'à compléter',
  masking: 'Masques',
  maskLabels: 'Masquer tous les libellés',
  maskDates: 'Masquer toutes les dates',
  maskHalf: 'Masquer la moitié au hasard',
  showAll: 'Tout afficher',
  answerKey: 'Afficher le corrigé',
  answerKeyHint: 'Le corrigé montre la frise complète ; vos masques sont conservés.',
  hide: 'Masquer',
  hideNothing: 'Rien',
  hideLabel: 'Le libellé',
  hideDate: 'La date',
  hideBoth: 'Le libellé et la date',
  hint: 'Choisissez un élément de la frise pour masquer son libellé ou sa date.',
  counted: (masked: number, total: number): string =>
    masked === 0
      ? `Aucun élément masqué sur ${total}.`
      : `${masked} élément${masked > 1 ? 's' : ''} masqué${masked > 1 ? 's' : ''} sur ${total}.`,
  mode: 'Mode de la frise',
} as const;

/** Mode présentation — PLAN.md §3.5. */
export const PRESENT = {
  controls: 'Commandes de la présentation',
  previous: 'Élément précédent', next: 'Élément suivant',
  overview: 'Vue d’ensemble',
  position: (index: number, total: number): string => `${index} / ${total}`,
  reveal: 'Révéler',
  revealHint: 'Les éléments apparaissent un par un, au rythme de la leçon.',
  fullscreen: 'Plein écran',
  exit: 'Quitter',
  empty: 'Cette frise ne contient encore aucun élément à présenter.',
} as const;

export const APPEARANCE = {
  title: 'Apparence de l’interface', label: 'Interface',
  terracotta: 'Terre cuite', light: 'Clair', dark: 'Sombre', system: 'Système',
  hint: 'Le thème de votre frise reste inchangé.',
  terracottaHint: 'Une palette chaude qui suit le mode de votre appareil.',
  systemHint: 'Suit le réglage clair ou sombre de votre appareil.',
  storageWarning: 'Ce choix s’applique ici, mais votre navigateur ne permet pas de le mémoriser.',
} as const;

export const FILLS = {
  title: 'Remplissage', tint: 'Léger', solid: 'Plein', none: 'Sans fond',
  hatch: 'Hachures', crosshatch: 'Croisillons', dots: 'Points', lines: 'Lignes', grid: 'Quadrillage',
  bracketHint: 'Les accolades n’ont pas de surface à remplir. Choisissez une barre ou une flèche pour afficher le motif.',
  mixed: 'Plusieurs remplissages : choisissez un style pour l’appliquer à la sélection.',
} as const;
