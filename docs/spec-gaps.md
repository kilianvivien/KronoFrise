# Écarts de spécification

Points non tranchés par PLAN.md / DESIGN.md / docs/format.md, résolus par
analogie avec la spécification la plus proche (PLAN.md §8.1). Chaque entrée est
signalée par un commentaire `// SPEC?` dans le code.

## 1. Source partagée des chaînes et de la palette — corrigé lors de M1

L'exception M0 autorisant des imports de `ui/strings.ts` et `ui/palette.ts`
depuis `core/` contredisait la frontière de PLAN.md §4.2. Les données pures
vivent maintenant dans `shared/strings.ts` et `shared/palette.ts`. Les entrées
publiques `ui/strings.ts` et `ui/palette.ts` les réexportent, sans duplication.
Les nouvelles chaînes propres à l'éditeur restent dans `ui/strings.ts`.
ESLint interdit toute remontée de `core/`, `layout/` **et** `shared/` vers
React, le DOM ou les couches supérieures ; il n'y a plus d'exception UI.

## 2. Densité de la règle : seuils de changement de niveau

DESIGN.md §4 fixe l'apparence des graduations et la règle « jamais plus de 10
graduations mineures entre deux majeures », mais pas la largeur minimale en
pixels d'un pas. Retenu : un pas majeur mesure au moins 72 px (largeur d'un
libellé « 3000 av. J.-C. » en 11 px + marge), sinon on passe au niveau
supérieur ; ce seuil est une constante nommée dans `layout/ticks.ts`.

## 3. Hauteur des bandes et gouttières du canevas

DESIGN.md §3 donne les métriques du chrome, §4 l'anatomie du canevas, mais pas
la hauteur d'une bande ni la position verticale de l'axe. Retenu, dérivé des
tailles d'éléments de §4 (puce 7 px, barre 24 px, puce de libellé ~22 px) et de
l'échelle d'espacement de §2 : bande = 120 px, rangée d'empilement = 28 px,
axe placé sous les bandes, marge de canevas = `--space-5` (24 px). Constantes
nommées dans `layout/metrics.ts`.

## 4. Fixture d'import MiCetF — relevée en M3

Le format réel a été relevé sur micetf.fr/frise (clé `micetf.frise.v1`) et
déposé dans `src/core/fixtures/micetf-export.json`. Il diffère de ce
qu'annonçait format.md §8.1 : le libellé est dans **`text`**, pas `name` (les
deux sont acceptés), et le fichier porte aussi `principale`, `secondaire`,
`distance` — des réglages de mise en page que KronoFrise recalcule et ignore.
`oubli: true` (« frise à compléter ») devient un masque `label` sur chaque
élément, ce qui reproduit exactement l'intention en mode fiche élève.

Les 50 couleurs sont des **noms CSS** (`orange`, `chocolate`…), pas des noms
français. La table 50 → 12 de `core/importers/micetfColors.ts` a été calculée
une fois à la teinte — la distance RVB brute écrasait tous les tons pâles sur
la même entrée — puis corrigée à la main ; elle est figée dans le code, comme
l'exige format.md §8.1.

## 5. Les commandes sont des données, pas des objets à méthodes

docs/format.md §6 décrit `Command` avec des méthodes `apply` / `invert`, mais
§7 exige que la pile d'annulation parte avec l'instantané d'autosauvegarde. Une
fermeture ne se sérialise pas. Retenu : une commande est un objet plat
(`{ name, …charge utile }`) et `apply(doc, cmd)` / `invert(before, cmd)` sont
des fonctions de `core/commands.ts`. La sémantique du contrat est intacte —
`apply(doc, invert(doc, c))` rend exactement `doc`, ce que vérifie
`commands.test.ts` — et l'historique traverse un `JSON.stringify` sans perte.

Ajout à la liste de §6 : une commande `batch` (composite, une seule étape
d'annulation) porte les mutations en plusieurs temps, comme « supprimer une
bande » = déplacer ses éléments puis retirer la bande.

## 6. Ligne d'ancrage des événements dans une frise à plusieurs bandes

DESIGN.md §4 dessine la pastille d'un événement « sur l'axe », mais la maquette
ne comporte qu'une bande, alors que le modèle en autorise plusieurs pour un
seul axe. Retenu : la pastille se pose sur le **bas de sa bande**, qui est déjà
un filet 1 px `--paper-line` (§4, « Lane boundary »). Pour une frise à une
bande — le cas par défaut — ce bas de bande *est* la ligne de base : le dessin
de §4 est reproduit à l'identique.

## 7. Graduations plus grossières que le millénaire

DESIGN.md §4 arrête l'échelle des niveaux au millénaire ; `grandes-periodes`
commence à -3 000 000. `layout/ticks.ts` prolonge donc l'échelle jusqu'à
5 000 000 d'années, avec les libellés d'années ordinaires (« 2 000 000 av.
J.-C. »), le niveau « siècle » restant seul à porter les chiffres romains.

Deux règles complémentaires y sont ajoutées, non spécifiées : les graduations
avant J.-C. sont calées sur les années historiques rondes (500 av. J.-C., et
non 501), et un segment ne reste jamais sans aucun libellé.

## 8. Police du PDF et exposants ordinaux

La sonde `export/pdfSpike.ts` (PLAN.md §7.6) montre que les polices standard
PDF (WinAnsi) ne contiennent pas « ᵉ » (U+1D49) des libellés de siècle. Deux
issues pour M3 : incorporer une vraie police, ce qui réclame `@pdf-lib/fontkit`
— **hors de la liste fermée de PLAN.md §8.4, à valider avec Kilian** — ou
replier « XVIIᵉ » sur « XVIIe » à l'export.

**Retenu en M3 : le repli**, pour ne pas ajouter de dépendance sans accord.
`export/pdfScene.ts` replie « ᵉ » et « ᵉʳ » et convertit l'espace fine
insécable. Tout le reste de la typographie française passe intact : Helvetica
standard est encodée en WinAnsi, qui contient bien « é », « ’ », « – » et
« œ » (vérifié par test sur le flux du PDF). À rouvrir si Kilian veut les
exposants ordinaux à l'impression.

Les couleurs, elles, sont résolues sans recopie : `ui/tokenValues.ts` lit les
valeurs directement dans `tokens.css`, qui reste la source unique (DESIGN.md
§1.2).

## 9. Interactions M1 non détaillées dans la spécification

- Un déplacement de 4 px distingue le clic du glissement. Maj + glisser sur
  le fond trace une sélection additive ; Maj + clic ajoute/retire un élément.
  E arme l'événement, P la période ; la création validée revient au mode auto.
- L'aimantation accroche une graduation à moins de 8 px. Alt la désactive ;
  la précision du document reste entière (année/mois/jour), jamais flottante.
- La molette avec Ctrl/⌘ zoome autour du pointeur (y compris le pincement du
  trackpad traduit par le navigateur). Les boutons zooment autour du centre.
  Les limites sont 100–500 000 %. Les bandes dépassant la hauteur disponible
  défilent verticalement ; la molette horizontale/Maj et Espace + glisser
  déplacent la vue horizontalement.
- Les bornes d'un **axe linéaire** s'éditent directement sous la règle, dans
  un champ temporaire. Cela permet de créer une frise sur une autre époque
  sans formulaire ni inspecteur. Les segments élastiques restent entièrement
  du ressort de M2 ; leurs bornes ne sont pas éditables ici.
- Le pied d'éditeur est une barre d'état de 40 px, pas le minimap de 64 px
  prévu en M2. L'inspecteur est masqué initialement ; les deux panneaux sont
  des emplacements réservés et se basculent avec ⌘1/⌘2 (DESIGN.md fait foi).
  Les modes Présentation/Fiche élève et l'export visuel attendent M3 ; seuls
  Ouvrir/Enregistrer `.krono` sont actifs dans cette barre M1.
- Les poignées de période sont des pilules 8×16 dans une zone de clic 24×24.
  Une période non sélectionnée se redimensionne aussi par ses 8 px de bord.
- Échap annule la création/le déplacement en cours. Entrée ou la perte de
  focus valide le libellé ; création + libellé forment une seule commande.
- Les fixtures M0 historiques portent des identifiants lisibles, pas des UUID.
  L'import reste compatible avec ces fichiers ; les nouvelles créations
  utilisent des UUID v4 et l'unicité est désormais vérifiée par le schéma.

## 10. Empilement des accolades

La mesure M0 ne réservait que les 24 px de la barre pour une accolade, alors
que son libellé est dessiné au-dessus. M1 réserve 20 px supplémentaires
(texte de 13 px, décalage et marge), ainsi que toute la largeur du libellé
centré. Ces dimensions font partie du layout commun, donc écran et export
bénéficient de la même correction. Le cas signalé « Naissance du
christianisme » / « Pax Romana » a été vérifié dans le navigateur.

## 11. Interactions et apparence M2

- À la demande de Kilian, Naviguer est l'outil initial : le glissement du fond
  ne crée plus de période, et se déplace seulement horizontalement. E/P arment
  explicitement les créations. Espace permet de saisir la vue sur un élément.
- Même à 100 %, une demi-largeur de vue reste disponible de chaque côté pour
  saisir la frise. « Ajuster » remet le pan à zéro et réserve des marges mesurées
  pour les libellés et images, sans modifier les dates ni les poids enregistrés.
  Un libellé plus large que la fenêtre elle-même ne peut pas tenir sans retour
  à la ligne : l'axe conserve au moins 64 px et la navigation reste disponible.
- Une coupure nouvelle conserve la densité de projection initiale ; elle peut
  donc ne pas présenter immédiatement le zigzag, mais sa poignée reste visible.
  Glisser conserve la somme des poids des deux voisins, chacun gardant au moins
  2 % de cette somme. Flèches gauche/droite : ±2 %. La saisie numérique conserve
  la règle du format (poids strictement positif, sans minimum de 2 %).
- Les poignées utilisent le suivi des événements du pointeur dans la fenêtre
  pour conserver la continuité malgré les repositionnements SVG en direct.
  La libération produit une seule commande ; Échap, perte de focus et annulation
  du pointeur restaurent le document.
- Les thèmes réutilisent la typographie mesurée pour conserver l'empilement.
  Craie utilise un tableau sombre et des traits clairs ; Parchemin un papier
  chaud ; Journal supprime les couleurs des éléments et désature les images.
  Les nouveaux hexadécimaux sont exclusivement des jetons dans `tokens.css`.
- `Lane.color` est un ajout optionnel documenté à `krono/1`, nécessaire au M2.
  Les anciens fichiers se chargent ; les anciens lecteurs stricts ne savent pas
  ouvrir un fichier contenant ce nouveau champ. Supprimer une bande transfère
  ses éléments vers la première bande restante, avec annulation exacte.
- Une bande repliée occupe 32 px et masque ses éléments sans les supprimer.
  L'inspecteur est ouvert initialement ; la structure varie entre 200 et 320 px.
- Les images PNG/JPEG/WebP sont décodées localement, ramenées à 512 px maximum,
  puis intégrées en JPEG à qualité 0,85 sur fond blanc (pas de métadonnées).
  L'entrée brute est limitée à 20 Mo ; le document enrichi doit aussi respecter
  les 20 Mo. La fin d'un import ne touche jamais un autre document ni un élément supprimé.
- Le préréglage crée une nouvelle bande et ajuste l'axe en une commande composée ;
  il conserve toute donnée existante, y compris une éventuelle bande vide.

## 12. Apparence de l'interface — demande utilisateur après M2

La demande explicite d'un choix clair/sombre remplace la règle initiale « suivre
uniquement le système ». Terre cuite conserve les surfaces chaudes et suit le
système ; Clair et Sombre imposent des surfaces neutres ; Système sélectionne
la variante neutre correspondant au système. L'accent terre cuite reste commun.
Les couleurs supplémentaires sont définies seulement dans `tokens.css`.

Le sélecteur se trouve dans la barre d'état, indépendamment des panneaux et du
thème du document. Le réglage validé est conservé dans localStorage et propagé
entre onglets ; un stockage indisponible ne bloque pas le changement de session.
Il ne crée aucune commande, ne salit pas le document et n'affecte pas les exports.
Les choix adaptatifs réagissent aux changements du système. Les contrôles natifs
utilisent également le `color-scheme` choisi.

Le panneau utilise le popover natif, avec fermeture explicite, Échap et retour
au déclencheur. Les quatre radios prennent en charge flèches, Home et End.
Le polissage conserve les dimensions générales de l'éditeur : champs à 30 px,
texte des champs à 13 px, sections mieux espacées et survols/états sélectionnés
cohérents. L'outil Événement n'est plus visuellement actif lorsqu'il n'est pas armé.

## 13. Remplissages et textures — demande utilisateur après M2

Les éléments disposent d'un `fillStyle` optionnel, documenté dans le contrat de
format. L'absence du champ conserve exactement le remplissage léger existant.
Les autres valeurs sont Plein, Sans fond, Hachures, Croisillons, Points, Lignes
et Quadrillage. Revenir à Léger enlève le champ ; l'annulation restitue la
valeur antérieure exacte. Les changements groupés restent une seule commande.

Les textures sont des motifs SVG à pas fixe de 8 ou 10 px, avec un trait à
30 % ou des points à 38 % d'opacité, au-dessus du fond léger du thème. Elles
partagent leur composant avec les aperçus de l'inspecteur et les SVG autonomes ;
aucune image externe ni nouvelle dépendance. Les identifiants sont uniques
par instance de composant. Les formes et les masques des bords approximatifs
continuent de délimiter le remplissage. Plein utilise le noir ou le blanc selon
le contraste sRGB ; le texte placé hors d'une période conserve son encre normale.
Sans fond emploie une peinture transparente pour conserver la zone de sélection.

Les accolades ne comportent aucune surface fermée. Le sélecteur est désactivé
si toute la sélection est composée d'accolades et une explication accompagne
les sélections concernées. Les bandes gardent leur fond léger : cette demande
porte sur les événements et périodes. L'export PDF final reste du ressort de M3.


## 12. Décisions M3

### 12.1 Une seule géométrie pour l'écran et le PDF

format.md §9 interdit tout code de dessin propre à l'export. Le rendu écran
est en composants React (interactivité, `data-item-id`, noms accessibles) ;
le PDF, lui, dessine avec pdf-lib. Pour qu'il n'existe malgré tout qu'une
seule géométrie, les formes et constantes de dessin sont sorties dans
`renderer/shapes.ts` (chemins de flèche et d'accolade, rayons, tirets,
glyphe de coupure, tuiles de motif, ancrage des libellés de règle). L'écran et
l'exporteur appellent **les mêmes fonctions** et les mêmes couleurs ; seul
l'ordre de parcours de la scène est écrit deux fois, et il est vérifié par
test (chaque libellé du document se retrouve en texte dans le PDF).

### 12.2 Mode présentation : apparence non spécifiée

DESIGN.md décrit la durée d'un pas (600 ms, §8) mais pas l'habillage du mode.
Retenu : plein écran sans chrome, barre de commandes discrète (opacité 0,55,
pleine au survol), fiche de l'élément en bas à gauche, mise en valeur par le
contour d'accent de §5. La caméra est une fonction pure et testée
(`ui/presentationCamera.ts`) : une période occupe au plus 62 % de la vue, un
événement en montre 16 %, le zoom ne descend jamais sous la vue d'ensemble.

### 12.3 Page web interactive (demande de Kilian, 31 août 2026)

Format d'export supplémentaire, hors PLAN.md §3.6 : un `.html` autonome. La
frise y est le SVG du rendu partagé, **figé** : le visionneur déplace une
fenêtre de vue (`viewBox`) mais ne recalcule jamais la mise en page. Le zoom
agrandit donc le texte au lieu de densifier les graduations — c'est un
visionneur, pas un éditeur. Aucune requête réseau, images comprises ; le texte
du document est échappé avant d'entrer dans le HTML et dans le JSON embarqué.

### 12.4 Navigateur de frises (demande de Kilian, 31 août 2026)

DESIGN.md §10 décrit un écran d'accueil ; la même grille sert ici de
navigateur permanent, ouvert depuis la barre d'outils. L'autosauvegarde tient
un index (`krono:documents`) écrit dans la même transaction que l'instantané ;
la liste se reconstruit depuis les clés réelles si l'index est perdu ou
incomplet. Supprimer efface document, vignette et entrée d'index ; la frise
ouverte ne peut pas être supprimée sous ses propres pieds.

### 12.5 Barre d'outils en icônes (demande de Kilian, 31 août 2026)

DESIGN.md §3 a été mis à jour : les commandes sont des icônes de 16 px
groupées par famille, chacune avec un nom accessible et une infobulle qui
rappelle le raccourci. Les libellés texte faisaient déborder la barre à chaque
fonction ajoutée.

### 12.6 Jeu d'icônes : fait maison ou paquet ? (question ouverte, Kilian)

L'application dessine ses icônes dans `ui/icons.tsx` : grille de 16, trait de
1,5 px, `currentColor`, aucun remplissage. Question posée le 31 août 2026 :
faut-il adopter un paquet (Radix Icons, Lucide) ?

Éléments de décision consignés ici pour ne pas les reperdre :

- **shadcn/ui est hors sujet** : ce n'est pas un jeu d'icônes mais une
  collection de composants Tailwind + Radix, exclue par DESIGN.md §1 (« pas de
  Tailwind, pas de bibliothèque de composants »). Son jeu d'icônes par défaut
  est Lucide, qui s'utilise seul.
- **Radix Icons** : grille de 15 px, trait fin, très proche de notre dessin ;
  environ 300 glyphes, MIT. **Lucide** : grille de 24 px, trait de 2 px,
  ~1 500 glyphes, ISC ; il faut passer `strokeWidth={1.5}` et `size={16}` pour
  retrouver notre densité.
- **Aucun paquet ne couvre le vocabulaire du domaine** : événement (pastille
  sur la ligne), période (barre sur la ligne), accolade, flèche, coupure ⫽,
  ligne à compléter, frise murale. Ces glyphes resteront faits maison ; le
  risque réel est un mélange de deux dessins, pire qu'un jeu homogène.
- **Coût** : une dépendance de plus, hors liste fermée (PLAN.md §8.4), pour
  une quinzaine de glyphes génériques (annuler, dossier, disquette, loupe,
  corbeille…) que nous dessinons déjà.

**Tranché par Kilian le 31 août 2026 : Lucide est adopté**, selon la
recommandation ci-dessus. `lucide-react` fournit les glyphes génériques ;
`ui/icons.tsx` garde les glyphes du métier — événement, période, barre,
accolade, flèche, bande, préréglage, fiche à compléter, frise murale — et les
**redessine sur la grille de Lucide** (`viewBox 0 0 24 24`, trait 2, bouts
arrondis), pour que les deux familles aient exactement le même trait à 16 px.
`lucide-react` est ajouté à la liste fermée de PLAN.md §8.4 ; il s'élague
correctement (environ 6 Ko pour la trentaine de glyphes utilisés).

### 12.7 Mesure du texte : une moyenne ne suffisait pas

Le texte débordait de sa puce sur les pages exportées (signalé par Kilian sur
« Naissance de l'écriture »). Cause : `layout/measure.ts` estimait la largeur
par une chasse moyenne, qui sous-estimait de plus de 10 % un mot riche en
lettres larges. La largeur d'une puce vient de cette mesure : une
sous-estimation se voit, une surestimation ne fait qu'un blanc.

`measure.ts` porte désormais la **chasse réelle de chaque glyphe**, relevée
dans le navigateur sur la police d'interface (SF Pro Text, graisse 500), plus :
un facteur de graisse pour 400 et 600, un terme d'**approche optique** (sous
13 px la police élargit d'environ 0,006 em par point manquant — sans lui les
dates en 11 px débordaient), une marge de sûreté de 1 %, et une largeur de
repli pour les caractères hors table. `measure.test.ts` compare la table à des
largeurs réelles : jamais en dessous, jamais plus de 4 % au-dessus.

Le navigateur continue de mesurer exactement (canvas) ; cette table sert aux
rendus sans DOM — tests, script d'exemples, et plus tard un export en ligne de
commande.

## 13. Décisions M4

### 13.1 Clavier : ce que « décaler d'une graduation » veut dire

PLAN.md §3.2 promet « les flèches décalent la date d'une graduation (⇧ = ×10) »
sans dire ce que vaut une graduation : le pas dépend du zoom **et** du segment
élastique. Retenu : `nudgeStep` relit l'écart entre deux graduations que la
règle dessine réellement à l'endroit de l'élément. Sur une même frise, ±1 an
sur l'époque contemporaine et ±500 ans sur la préhistoire — ce que l'œil
attend, puisque c'est ce que la règle montre.

Un décalage n'affine jamais la précision d'une date : « 1789 » reste une
année même si la règle est graduée au mois. ↑/↓ change de bande — non
spécifié, mais c'est l'équivalent clavier du glissement vertical de §3.3.4,
sans lequel une frise à plusieurs bandes n'était pas éditable au clavier.
⌘+ / ⌘− / ⌘0 reprennent les trois boutons de zoom de la barre d'outils.

### 13.2 Accessibilité : le focus et la sélection doivent coïncider

Les éléments du canevas portaient déjà `tabindex`, `role` et un nom accessible
(DESIGN.md §7), mais **le focus ne sélectionnait pas** : un élément atteint au
clavier ne pouvait être ni déplacé, ni dupliqué, ni supprimé. Le focus
sélectionne désormais.

Réciproquement, une commande qui vide la sélection (annuler, ajouter une bande)
laissait l'anneau de focus sur un élément devenu inerte. `keyboardSelection()`
rétablit la sélection depuis le focus réel plutôt que de ne rien faire.

La barre d'état nomme l'élément quand il est seul sélectionné : comme c'est un
`role="status"`, sa date est annoncée à chaque décalage.

### 13.3 Élagage par fenêtre : où il s'applique, et où il ne s'applique pas

À 40 000 % de zoom, la frise de charge montre 8 éléments sur 500 et en
dessinait pourtant 500 — soit 2 870 nœuds SVG réconciliés à chaque image de
glissement. `visibleScene(scene, viewport)` (layout/scene.ts) retire ce qui ne
peint rien : 39 nœuds au lieu de 2 870, sans toucher à une seule coordonnée.

Deux limites assumées :

- **Les exports ne l'appellent pas.** Un élément placé hors de l'axe est
  extrapolé et non rogné (layout/scale.ts) : il doit rester dans le SVG, le
  PDF et la page web. `layout()` produit donc toujours la scène entière, et
  seul l'éditeur en dessine une vue. La scène élaguée est prouvée
  sous-ensemble exact de la scène complète (`layout.test.ts`).
- **Tab ne parcourt que les éléments dessinés**, comme dans toute liste
  virtualisée. Le plan de la barre latérale reste la liste complète, cherchable
  et navigable au clavier, et y cliquer recentre la vue sur l'élément : c'est
  le chemin accessible vers un élément hors champ.

### 13.4 Performance mesurée (31 août 2026)

`pnpm bench` mesure la mise en page seule ; les images sont mesurées dans le
navigateur sur le **build de production** — React en mode développement est
trois fois plus lent et ne dit rien de l'expérience réelle.

| Mesure (500 éléments, 4 bandes) | Résultat |
|---|---|
| `layout()` | 0,6 – 1,0 ms (budget format.md §10 : 5 ms) |
| Panoramique à 100 % | 10 ms médian, 11 ms au 90ᵉ centile |
| Glissement des 500 éléments sélectionnés | 10 ms médian, 14 ms max |
| Panoramique à 40 000 % (après élagage) | 8 ms médian |

Tout tient sous les 16,7 ms d'une image à 60 Hz. La mise en page n'était pas
le goulot : le coût est la réconciliation React des nœuds SVG, ce que
l'élagage attaque directement.

### 13.5 Les thèmes restants : lequel inventer, et lequel ne pas inventer

PLAN.md §3.4 demande « 6 à 8 thèmes » et en nomme cinq. Quatre étaient livrés
en M2 ; deux manquaient.

- **Frise officielle** est spécifié — « matches the Éduscol/programmes color
  conventions for the great periods ». Un thème ne choisit pas les couleurs des
  éléments (c'est le rôle du préréglage des grandes périodes) : ce qu'il porte,
  c'est leur *traitement*. Retenu : un papier neutre et des bandes franchement
  colorées (`mix(base, papier, 0.30)`) au lieu de la teinte légère du manuel —
  la frise des programmes se lit en bandes pleines, pas en pastels.
- **Tableau blanc** complète la série au bas de la fourchette. Registre absent
  des cinq autres : le feutre sur un tableau blanc — papier froid, remplissages
  saturés, encre bleu-nuit. *Craie* est le tableau noir, *Manuel scolaire* le
  papier chaud du manuel ; celui-ci est ce que l'on projette réellement en
  classe. Six thèmes suffisent : trois de plus auraient été du remplissage.

### 13.6 Une encre par remplissage, pas par couleur

Le test de contraste par thème a trouvé un défaut **antérieur** : « Blé » sur
le papier chaud de *Parchemin* tombait à 4,1:1, sous le seuil de DESIGN.md §7.

Cause : `ink(base)` est défini par DESIGN.md §4 pour du texte posé sur
`tint(base)`. Dès qu'un thème change le papier, le remplissage change avec lui
et l'encre, elle, ne bougeait pas. `readableInk(base, fill)` assombrit par pas
déterministes jusqu'au seuil AA — et rend `ink(base)` inchangé partout où il
passait déjà, si bien que *Manuel scolaire* est au pixel près ce qu'il était.
Les six thèmes × douze couleurs sont désormais vérifiés par test.
