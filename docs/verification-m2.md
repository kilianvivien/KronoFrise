# Vérification M2 — 30 août 2026

## Automatisé

- `pnpm test` : **246 tests**, 17 fichiers, tous réussis.
- `pnpm lint` : aucune erreur ni avertissement.
- `pnpm build` : TypeScript et production Vite réussis.
- `git diff --check` : aucune erreur d'espacement.

Les nouveaux tests couvrent : navigation sans création, pan dans les deux sens
à 100 %, marges de fit pour les événements en bordure et les cartes illustrées,
projection inverse avec marges, séparation/fusion/redistribution de segments,
rejet des bornes invalides et limite de huit segments, conservation des poids,
annulation exacte du préréglage et des modifications de bandes/métadonnées,
bandes repliées, quatre rendus SVG autonomes et couleurs de Journal/Craie.

## Navigateur réel

Vérification dans le navigateur intégré sur le build de production `:4173`,
séparé du document utilisateur ouvert sur `:5173`. Les vues utilisées étaient
1280×720 puis 1159×863 ; le chrome suivait le mode sombre du système.

- Création depuis un document vide d'un axe linéaire 1788–1804, d'un événement
  nommé puis daté au jour, et d'une période Première République ; changement
  de couleur dans l'inspecteur.
- Nouvelle bande nommée et colorée, déplacement d'un événement entre bandes,
  puis annuler/rétablir. Recherche « Bastille » dans le plan et sélection.
- Import d'une image de test PNG 800×600 : carte affichée, puis mesure DOM de
  l'image intégrée **512×384 en data URL JPEG**. Annulation disponible et
  rétablissement disponible après annuler. Une image importée a aussi été
  retrouvée après rechargement et restauration IndexedDB.
- À 100 %, sur Antiquité : pan `0 → 150 → 0` par deux glissements opposés ;
  le nombre d'éléments reste **14**. Les premiers/derniers libellés sont entiers
  grâce aux marges de fit. Christianity/Pax Romana ne se chevauchent pas.
- Les quatre thèmes ont été affichés et inspectés visuellement. Craie présente
  un tableau sombre avec encre claire ; Journal des éléments monochromes ;
  Parchemin un papier chaud. La typographie et les formes restent communes.
- Axe cycle 3 créé depuis un document vide dans l'inspecteur : début préhistorique,
  coupures à 3300 av. J.-C., 476, 1492 ; poids saisis `1, 2, 2, 4`.
  Ajout des cinq périodes par le préréglage, puis annulation en une seule étape
  (5 → 0 périodes) et rétablissement (0 → 5).
- Clic droit sur la règle : ajout d'une quatrième coupure à 1789. Double-clic
  sur la poignée et suppression : retour à trois coupures.
- Glissement continu d'une poignée : part adjacente **54 % → 79 %**,
  libération validée, puis une seule annulation ramène à **54 %**.
  Flèche droite sur une poignée : ajustement de 2 points.
- Minimap au clavier : flèche droite déplace la vue ; Home ramène le pan à zéro.
- Aucun avertissement ni erreur console sur les dernières vérifications.

## Corrections issues des essais

Le glissement SVG initial perdait des événements après le premier déplacement
et pouvait laisser une prévisualisation ouverte. Les mouvements et la libération
sont maintenant suivis sur la fenêtre, filtrés par identifiant de pointeur.
Le bouton Ajuster tient compte des boîtes de texte et des images, et le pan ne
reste plus verrouillé à 100 %. Les boutons de bornes reprennent le papier du thème.

## Limites

- Les dialogues natifs Ouvrir/Enregistrer restent couverts par les tests
  d'adaptateurs de M1, pas par une automatisation du sélecteur système.
- Aucun test visuel du mode clair système ni de mouvement réduit dans cette
  session. Aucun test au doigt sur matériel tactile ; parcours vérifiés au pointeur
  et au clavier. Le transfert de fichier par glisser-déposer utilise le même
  importeur que le sélecteur vérifié, mais n'a pas été automatisé séparément.
- Un texte plus large que la fenêtre ne peut pas tenir sans retour à la ligne ;
  les marges réservent au moins 64 px à l'axe, puis la navigation permet sa lecture.
- Les fixtures existantes restent les documents complets de référence. La frise
  linéaire créée pendant la vérification est une petite frise d'essai ; le cycle 3
  emploie le préréglage pour remplir les périodes après construction de l'axe.
- L'export PDF complet, les modes pédagogiques et l'écran des documents récents
  appartiennent à M3. Les réserves M0/M1 sur MiCetF réel et les polices PDF restent ouvertes.

## Passe de finition — apparence de l'interface

Après la demande utilisateur de thèmes clairs/sombres :

- **249 tests** réussis (dont trois nouveaux tests de préférences), lint et build
  propres. Les tests de préférences vérifient restauration, priorité du choix
  explicite sur le système, réaction des choix adaptatifs, synchronisation des
  onglets, valeurs invalides et stockage refusé.
- Dans le navigateur intégré sur le build de production : sélecteur Terre cuite,
  Clair, Sombre, Système affiché ; modes clair et sombre inspectés visuellement ;
  préférence Clair retrouvée après rechargement.
- Navigation au clavier entre les choix, Home/End et fermeture par Échap vérifiés.
- Passage Sombre → Clair : SVG du document strictement inchangé dans le DOM.
  Système résout bien le mode sombre actuel. Les changements du système sont
  simulés dans les tests unitaires, pas effectués dans les réglages de la machine.
- Aucun avertissement ni erreur console pendant la vérification finale.
- Les documents de l'utilisateur sur `:5173` n'ont pas été remplacés pour ces essais.

## Remplissages et textures

- **265 tests** réussis. Lint et build propres. Les nouveaux tests couvrent les
  huit styles dans JSON et la commande groupée inverse, le rejet d'un style
  inconnu, la compatibilité des anciens documents, le passage au SceneGraph,
  les cinq motifs dans les quatre thèmes et les identifiants SVG distincts.
- Les motifs restent des primitives vectorielles autonomes, y compris sur une
  flèche à bord approximatif. Les 12 couleurs × 4 thèmes en remplissage plein
  ont un contraste texte/fond d'au moins 4,5:1 ; les textes hors d'une barre
  conservent leur couleur adaptée au papier.
- Navigateur, build `:4173` : période Époque moderne sélectionnée, Hachures
  appliquées et inspectées visuellement ; Plein appliqué puis annulation
  ramenant aux Hachures. Croisillons appliqués puis thème Journal : rendu
  monochrome inspecté visuellement. Après rechargement, Croisillons reste coché.
- Aucun avertissement ni erreur console dans ces contrôles. Les fichiers de
  l'utilisateur ouverts sur `:5173` n'ont pas été remplacés pendant les essais.
