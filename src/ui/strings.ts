// SPEC? Shared pure data keeps core/layout independent of ui; see docs/spec-gaps.md §1.
import { DATES } from "../shared/strings";
export * from "../shared/strings";

export const EDITOR = {
  open: 'Ouvrir…', save: 'Enregistrer', fileType: 'Frise KronoFrise',
  importTypes: 'Frise, export MiCetF ou tableau',
  imported: (count: number, skipped: number): string =>
    skipped === 0
      ? `${count} élément${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''}.`
      : `${count} élément${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''}, ${skipped} ligne${skipped > 1 ? 's' : ''} ignorée${skipped > 1 ? 's' : ''}.`,
  pasted: (count: number, skipped: number): string =>
    skipped === 0
      ? `${count} élément${count > 1 ? 's' : ''} collé${count > 1 ? 's' : ''} dans la frise.`
      : `${count} élément${count > 1 ? 's' : ''} collé${count > 1 ? 's' : ''}, ${skipped} ligne${skipped > 1 ? 's' : ''} ignorée${skipped > 1 ? 's' : ''}.`, defaultFilename: 'frise',
  title: 'Titre de la frise', renameTitle: 'Renommer la frise', label: 'Libellé', event: 'Nouvel événement', period: 'Nouvelle période',
  canvas: 'Frise chronologique', sidebar: 'Structure', inspector: 'Inspecteur',
  sidebarHint: 'Les bandes et le plan de la frise seront disponibles ici.',
  inspectorHint: 'Double-cliquez sur un élément pour modifier son libellé. Faites glisser ses bords pour ajuster une période.',
  sidebarToggle: 'Afficher ou masquer la structure', inspectorToggle: 'Afficher ou masquer l’inspecteur',
  duplicate: 'Dupliquer', selectAll: 'Tout sélectionner',
  hint: 'Glisser : naviguer · E : événement · P : période · ← → : décaler · Maj + glisser : sélectionner · ⌥ : sans aimantation',
  touchHint: 'Glisser le fond : naviguer · Pincer : zoomer · Touchez un élément pour le sélectionner · Pencil : créer et déplacer',
  toolbarOverflow: 'Autres commandes',
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
  circa: 'Approximative', fuzzyStart: 'Début flou', fuzzyEnd: 'Fin floue',
  shape: 'Forme', bar: 'Barre', bracket: 'Accolade', arrow: 'Flèche',
  lane: 'Bande', lanes: 'Bandes', addLane: 'Ajouter une bande', laneName: 'Nom de la bande',
  unnamedLane: 'Bande sans nom', newLane: 'Nouvelle bande', deleteLane: 'Supprimer la bande',
  collapse: 'Replier la bande', expand: 'Déplier la bande', moveUp: 'Monter la bande', moveDown: 'Descendre la bande',
  laneColor: 'Couleur de la bande', color: 'Couleur', defaultColor: 'Couleur par défaut',
  search: 'Rechercher dans la frise', noResults: 'Aucun élément trouvé.',
  emptyOutline: 'Les événements et périodes que vous créez apparaîtront ici.',
  theme: 'Thème', manuel: 'Manuel scolaire', craie: 'Craie', parchemin: 'Parchemin', journal: 'Journal',
  axis: 'Axe du temps', split: 'Scinder à cette date', splitAt: 'Date de coupure',
  segment: 'Segment', boundary: 'Modifier la coupure', removeBreak: 'Supprimer la coupure',
  addBreak: 'Ajouter une coupure', splitHint: 'Scinde l’axe à cette date : chaque segment reçoit ensuite sa propre largeur.', apply: 'Appliquer', weight: 'Largeur relative',
  maxSegments: 'Une frise peut contenir jusqu’à huit segments.', invalidAxis: 'La coupure doit se trouver entre les deux bornes du segment.',
  resizeBoundary: (index: number): string => `Déplacer la coupure ${index}`,
  segmentName: (index: number): string => `Segment ${index}`,
  preset: 'Grandes périodes', presetAction: 'Insérer les cinq périodes',
  titleBlock: 'Bloc de titre', showTitleBlock: 'Afficher le titre sur la frise',
  titleBlockHint: 'Place le titre au-dessus de la frise, dans l’image exportée comme à l’impression.',
  subtitle: 'Sous-titre', showAuthor: 'Auteur', showDate: 'Date',
  align: 'Position', alignLeft: 'À gauche', alignCenter: 'Centré',
  placement: 'Emplacement', backToDocument: 'Revenir au document', replaceImage: 'Remplacer l’image…',
  selectionCount: (count: number): string => `${count} éléments`, presetHint: 'Ajoute les cinq périodes dans une nouvelle bande et ajuste l’axe, sans effacer vos éléments.',
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

/**
 * Aide à la saisie d'une date — demande de Kilian (31 août 2026).
 *
 * Écrire « 52 av. J.-C. » suppose de connaître la convention ; les deux
 * boutons d'ère et les décalages de siècle/millénaire la rendent inutile.
 */
export const DATE_INPUT = {
  tools: 'Aide à la saisie de la date',
  era: 'Ère',
  bc: DATES.bcSuffix,
  ad: 'apr. J.-C.',
  bcLong: 'Avant Jésus-Christ',
  adLong: 'Après Jésus-Christ',
  shift: 'Décaler la date',
  century: '100 ans',
  millennium: '1000 ans',
  earlier: (years: number): string => `Reculer de ${years} ans`,
  later: (years: number): string => `Avancer de ${years} ans`,
  hint: 'Écrivez « 1515 », « 52 av. J.-C. », « v. 800 » ou « 14/07/1789 ».',
  showTools: 'Afficher l’aide à la saisie',
  hideTools: 'Masquer l’aide à la saisie',
} as const;

/**
 * Mise en route d'une frise vide — demande de Kilian (31 août 2026).
 * Deux bornes et un titre : le reste se règle dans l'inspecteur.
 */
export const SETUP = {
  title: 'Votre nouvelle frise',
  intro: 'Posez le titre et les deux bornes de l’axe. Tout reste modifiable ensuite dans l’inspecteur.',
  name: 'Titre',
  namePlaceholder: 'La Révolution française',
  start: 'Début',
  end: 'Fin',
  suggestions: 'Périodes courantes',
  suggestionsHint: 'Remplit les deux bornes ; aucun élément n’est ajouté.',
  summary: (range: string, span: string): string => `${range} · ${span}`,
  endBeforeStart: 'La fin doit être postérieure au début.',
  create: 'Créer la frise',
  skip: 'Passer',
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
  hide: 'Masquer', selected: 'Élément sélectionné',
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

/** Navigateur de frises — les documents conservés sur cet appareil. */
export const LIBRARY = {
  title: 'Mes frises',
  subtitle: 'Les frises enregistrées sur cet appareil.',
  examples: 'Exemples',
  examplesHint: 'Trois frises complètes pour découvrir l’éditeur ; les ouvrir n’efface rien.',
  open: 'Ouvrir le navigateur de frises',
  close: 'Fermer le navigateur',
  current: 'Ouverte',
  newDocument: 'Nouvelle frise',
  openDocument: 'Ouvrir cette frise',
  duplicate: 'Dupliquer',
  copySuffix: (title: string): string => `${title} (copie)`,
  delete: 'Supprimer',
  confirmDelete: (title: string): string => `Supprimer « ${title} » ?`,
  confirmHint: 'Cette frise sera effacée de cet appareil. Enregistrez un fichier .krono pour la conserver.',
  importFile: 'Importer un fichier .krono…',
  drop: 'Déposez un fichier .krono pour l’ouvrir.',
  loading: 'Lecture des frises enregistrées…',
  unreadable: 'Cette frise enregistrée est illisible. Ouvrez votre fichier .krono ou supprimez-la.',
  storageUnavailable: 'Les frises enregistrées ne sont pas accessibles sur cet appareil.',
  modified: (when: string): string => `Modifié ${when}`,
  justNow: 'à l’instant',
  counted: (items: number, lanes: number): string =>
    `${items} élément${items > 1 ? 's' : ''} · ${lanes} bande${lanes > 1 ? 's' : ''}`,
  noThumbnail: 'Aperçu en préparation',
} as const;

/** Export — PLAN.md §3.6, docs/format.md §9. */
export const EXPORT = {
  title: 'Exporter la frise',
  open: 'Exporter…',
  format: 'Format', pdf: 'PDF', svg: 'SVG', png: 'PNG',
  size: (width: number, height: number): string => `${width} × ${height} px`,
  pageSize: 'Format de page', a4: 'A4', a3: 'A3',
  orientation: 'Orientation', portrait: 'Portrait', landscape: 'Paysage',
  wall: 'Frise murale (plusieurs pages à assembler)',
  wallHint: 'La frise garde sa taille de lecture et se répartit sur des pages qui se recouvrent de 1 cm.',
  pages: (count: number): string => count === 1 ? '1 page' : `${count} pages`,
  resolution: 'Résolution', transparent: 'Fond transparent',
  answerKey: 'Ajouter le corrigé à la suite',
  answerKeyPage: 'Corrigé',
  answerKeyHint: 'La fiche puis la même frise complète : un seul PDF, prêt en recto/verso.',
  exercise: 'Fiche d’exercice à découper',
  exerciseHint: 'La frise sans les libellés, puis les étiquettes mélangées à découper et à replacer.',
  exerciseTitle: 'Découpez les étiquettes et placez-les au bon endroit sur la frise.',
  worksheetHint: 'La fiche élève est exportée telle qu’elle s’affiche, masques compris.',
  html: 'Page web interactive',
  htmlHint: 'Un fichier .html autonome : la frise s’y explore à la souris et au clavier, sans connexion.',
  gradientHint: 'Le PDF n’a pas de dégradé : les remplissages dégradés y sont rendus en seize bandes, à la même place. Le SVG et le PNG gardent le dégradé continu.',
  action: 'Exporter', cancel: 'Annuler', done: 'Fichier exporté',
  assembly: (index: number, total: number): string => `page ${index} / ${total}`,
  failed: 'L’export a échoué. Réessayez, ou enregistrez un fichier .krono pour ne rien perdre.',
  working: 'Export en cours…',
} as const;

/** Chaînes embarquées dans la page web exportée (elle vit sans l'application). */
export const VIEWER = {
  previous: 'Élément précédent',
  next: 'Élément suivant',
  overview: 'Vue d’ensemble',
  zoomIn: 'Zoomer',
  zoomOut: 'Dézoomer',
  fit: 'Ajuster à la fenêtre',
  fullscreen: 'Plein écran',
  help: 'Glissez pour naviguer · molette pour zoomer · ← → pour parcourir la frise',
  position: (index: number, total: number): string => `${index} / ${total}`,
  madeWith: 'Frise réalisée avec KronoFrise',
} as const;

export const APP_LINKS = {
  github: 'KronoFrise sur GitHub (nouvel onglet)',
  agentSkill: 'Créer une frise avec une IA',
} as const;

export const AGENT_SKILL = {
  title: 'Créer une frise avec une IA',
  intro: 'Un « skill » est un fichier d’instructions qui explique à votre assistant IA comment créer une frise compatible avec KronoFrise, entièrement modifiable.',
  steps: [
    'Téléchargez le fichier SKILL.md ci-dessous, puis joignez-le à une conversation avec votre assistant IA. Si les pièces jointes ne sont pas prises en charge, copiez-collez son contenu.',
    'Demandez à l’assistant de suivre ces instructions et de créer un fichier .krono, en précisant le sujet, les dates et les éléments souhaités.',
    'Récupérez le fichier .krono généré, puis ouvrez-le dans KronoFrise avec « Ouvrir… » ou « Mes frises → Importer un fichier… ». Vous pourrez ensuite tout modifier.',
  ],
  exampleTitle: 'Exemple de demande',
  example: '« En suivant le skill joint, crée un fichier .krono sur la Révolution française de 1789 à 1799, avec dix événements clés et leurs sources. »',
  note: 'Vérifiez les dates et les sources proposées par l’IA avant d’utiliser votre frise.',
  download: 'Télécharger SKILL.md',
} as const;

export const PWA = {
  installTitle: 'Installer KronoFrise',
  installHint: 'Retrouvez vos frises dans une fenêtre dédiée, même hors connexion.',
  install: 'Installer', later: 'Plus tard', alreadyInstalled: 'Déjà installée',
  iosHint: 'Dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».',
  safariHint: 'Dans Safari, choisissez Fichier → Ajouter au Dock…',
  manualDataHint: 'Avant de passer à l’application, enregistrez votre frise en fichier .krono pour pouvoir l’y ouvrir.',
  updateTitle: 'Une mise à jour est prête',
  updateHint: 'Votre frise sera enregistrée sur cet appareil, puis l’application redémarrera.',
  update: 'Mettre à jour', updating: 'Enregistrement et mise à jour…',
  saveError: 'La frise n’a pas pu être enregistrée. La mise à jour est suspendue pour préserver votre travail.',
  updateError: 'La mise à jour n’a pas abouti. Vous pouvez réessayer ou fermer puis rouvrir l’application après avoir enregistré votre frise.',
  installError: 'L’installation n’a pas abouti. Utilisez le menu de votre navigateur pour installer KronoFrise.',
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
  gradient: 'Dégradé',
  bracketHint: 'Les accolades n’ont pas de surface à remplir. Choisissez une barre ou une flèche pour afficher le motif.',
  mixed: 'Plusieurs remplissages : choisissez un style pour l’appliquer à la sélection.',
} as const;

/** Tutoriel d'accueil — PLAN.md M4 (ajout 1). Vouvoiement, verbes d'abord. */
export const TUTORIAL = {
  title: 'Prise en main',
  step: (index: number, total: number): string => `Étape ${index} sur ${total}`,
  skip: 'Passer',
  finish: 'Terminer',
  restart: 'Revoir la prise en main',
  completed: 'Terminé',
  doneTitle: 'Vous savez construire une frise',
  done: 'Il ne reste qu’à l’exporter : ⌘E propose le PDF, la page web, le SVG et le PNG.',
  placeTitle: 'Placez un premier événement',
  placeBody: 'Choisissez l’outil Événement, puis cliquez sur la frise à la date voulue.',
  moveTitle: 'Déplacez-le dans le temps',
  moveBody: 'Faites-le glisser le long de l’axe, ou utilisez les flèches ← et →. La date s’affiche pendant le déplacement.',
  nameTitle: 'Donnez-lui un nom',
  nameBody: 'Double-cliquez sur l’événement pour le renommer, puis validez avec Entrée.',
  presentTitle: 'Projetez votre frise',
  presentBody: 'Le mode Présentation passe la frise en plein écran et la parcourt événement par événement.',
} as const;
