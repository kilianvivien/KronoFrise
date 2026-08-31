# Vérification M3 — 31 août 2026

## Automatisé

- `pnpm test` : **329 tests**, tous réussis.
- `pnpm lint` : aucune erreur ni avertissement. `pnpm build` : TypeScript strict
  et build de production réussis.

Nouveaux tests : masques (commande inverse exacte, tirage reproductible,
bornes), rendu de la fiche élève (la scène masquée ne contient plus aucun
libellé, le corrigé est la même scène sans le drapeau, ligne à compléter d'au
moins 48 px), caméra de présentation (centrage, zoom borné, interpolation),
pagination A4/A3 (recouvrement de 10 mm, hauteur jamais dépassée), export PDF
(page par fixture, **chaque libellé retrouvé en texte dans le flux du PDF**,
images limitées à celles des événements, corrigé à la suite, fiche d'exercice),
export SVG/HTML (autonomie, aucune ressource distante, échappement du texte du
document), importateurs MiCetF et CSV, bibliothèque de documents,
temps relatif.

## Navigateur réel

Build de production sur `:4173`, séparé du document utilisateur.

- **Fiche élève** : masquage de tous les libellés (19/19) puis d'un élément
  au choix (« le libellé et la date » → deux lignes à compléter, carte en
  papier bordée de tirets, nom accessible « à compléter »). Corrigé affiché et
  masqué à nouveau. Tirage « la moitié au hasard » → 10 masques sur 19.
  Annuler ramène exactement l'état précédent, en une étape. En fiche élève, un
  glissement navigue au lieu de déplacer l'élément.
- **Présentation** : plein écran sans chrome, pas à pas au clavier, caméra
  fluide, mise en valeur de l'élément et fiche (libellé, date, image).
  « Révéler » n'affiche que les éléments déjà parcourus, sans rien déplacer.
  Échap quitte (vérifié par événement synthétique : la touche physique est
  interceptée par le panneau d'automatisation).
- **Exports** : boîte de dialogue vérifiée (PDF/page web/SVG/PNG, A4-A3,
  portrait-paysage, frise murale, fiche d'exercice, corrigé, nombre de pages
  mis à jour). Les fichiers d'exemple ont été produits pour les quatre
  fixtures ; le SVG a été ouvert tel quel dans le navigateur (rendu conforme,
  coupures et graduations comprises).
- **Page web interactive** : ouverte hors application, navigation au pointeur,
  zoom, parcours au clavier, fiche d'élément avec image, sans aucune requête.
- **Import** : un export MiCetF réel déposé dans le navigateur de frises donne
  7 éléments, axe 400–1600, couleurs ramenées à la palette, et « frise à
  compléter » retrouvée en masques. Un tableau collé (`date;libellé;…`) ajoute
  3 éléments à la frise ouverte, sélectionnés, annulables en une fois.
- **Navigateur de frises** : liste avec vignettes réelles, badge « Ouverte »,
  ouverture, duplication, suppression avec confirmation, dépôt de fichier.
- **Barre d'outils en icônes** : infobulles avec raccourci, groupes outils et
  modes, alignement à droite pour le dernier bouton, états au survol et actif.
- Aucun avertissement ni erreur console sur l'ensemble des parcours.

## Limites

- **Le rendu visuel du PDF n'a pas été inspecté à l'œil** : le panneau de
  navigation télécharge les PDF au lieu de les afficher, et aucun outil de
  rastérisation (poppler) n'est installé. Le contrôle est indirect : le PDF
  est dessiné à partir de la même scène et des mêmes fonctions de forme que le
  SVG, lequel a bien été inspecté, et le flux PDF est vérifié par tests
  (pages, texte réel, images). À contrôler à l'impression avant la bêta.
- Les exposants ordinaux (« XVIIᵉ ») sont repliés en « XVIIe » dans le PDF :
  les polices standard sont en WinAnsi (docs/spec-gaps.md §8). Le reste de la
  typographie française passe intact.
- Le visionneur HTML ne recalcule pas la mise en page : zoomer agrandit le
  texte et ne densifie pas les graduations (docs/spec-gaps.md §12.3).
- Les dialogues système Ouvrir/Enregistrer restent couverts par les tests
  d'adaptateurs, pas par une automatisation du sélecteur de fichiers.
- Le dépôt de fichier et le collage ont été déclenchés par événements
  synthétiques (`DragEvent`, `ClipboardEvent`) faute de presse-papiers réel
  dans l'automatisation ; le chemin de code est celui de l'utilisateur.
- Aucun essai sur matériel tactile, ni impression papier réelle.
