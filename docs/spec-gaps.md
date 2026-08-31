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

### 13.7 Hors ligne : service worker écrit à la main, préchargement injecté

PLAN.md §5 demande « PWA/offline » en M4 ; le manifeste et les icônes
existaient depuis M3, le mode hors ligne non. `vite-plugin-pwa` est hors de la
liste fermée de §8.4, et un service worker de 60 lignes ne justifie pas d'y
déroger : `src/pwa/sw.js` est écrit à la main.

Un service worker écrit à la main ne peut pas deviner les noms de fichiers
hachés. Le greffon `kronofrisePwa` de `vite.config.ts` (un `generateBundle` de
Rollup, aucune dépendance) lit le bundle final et fige la liste réelle. Cela
inclut **les morceaux chargés paresseusement** : sans eux, un enseignant hors
ligne qui n'a jamais exporté n'aurait jamais téléchargé le morceau PDF et
l'export aurait échoué au moment précis où il en a besoin.

Décisions :

- **Mise à jour explicite (demande de Kilian, 31 août 2026).** Une invite
  propose la version téléchargée. L'application enregistre la frise avant de
  demander `skipWaiting`, attend la prise de contrôle et revérifie la sauvegarde
  avant de recharger. Les autres fenêtres ne sont pas rechargées et les anciens
  caches restent disponibles tant que des fenêtres sont ouvertes. Une autre
  invite propose l'installation native, ou les instructions Safari ; elle se
  masque en mode installé et son report est mémorisé pendant sept jours.
- **Cache d'abord pour les ressources, réseau d'abord pour la navigation**,
  avec repli sur la page en cache : jamais d'index périmé quand le réseau est là.
- **Jamais de mise en cache d'une erreur ni d'une réponse opaque** : un 404
  conservé survivrait à la panne qui l'a produit.
- Le manifeste gagne `theme_color`, `background_color`, `description` et
  `file_handlers` pour `.krono`. Ses couleurs sont du JSON, donc hors de portée
  du lint DESIGN.md §1.2 : un test les compare à `tokens.css`.

**Limite de vérification** : le service worker ne s'enregistre pas dans
l'environnement d'automatisation — le navigateur intégré intercepte la requête
du script (`An unknown error occurred when fetching the script`), alors que le
fichier est servi en 200 `text/javascript` et de syntaxe valide. À défaut,
`src/pwa/swHarness.ts` charge le **fichier réel**, avec la substitution de la
construction, dans un contexte muni de globales de worker et déclenche ses
événements : préchargement complet, service sans réseau, repli de navigation
hors ligne, non-interception des POST et des origines tierces, refus de mettre
en cache une erreur, purge des versions précédentes. Restent à confirmer sur un
navigateur réel : l'installation elle-même et l'invite « Installer
l'application ».

### 13.8 Tutoriel d'accueil : une étape s'achève sur un geste, pas sur « Suivant »

PLAN.md M4 (ajout 1) demande « trois ou quatre étapes qui font *faire* la
chose ». Retenu : aucune étape ne comporte de bouton « Suivant ». Chacune
observe le document ou le mode et se franchit d'elle-même — tant que
l'événement n'existe pas, l'étape reste. `tutorialSteps.ts` est du calcul pur,
donc éprouvé sans DOM.

Trois précisions que la spécification laissait ouvertes :

- **Créer n'est pas déplacer.** L'étape « déplacez-le » compare les dates des
  éléments *déjà présents* à son entrée : sinon elle se serait franchie au
  moment même où l'élément apparaît, et le geste n'aurait pas été appris.
- **Une étape déjà satisfaite est franchie d'un coup.** Créer un événement
  ouvre déjà le champ du libellé : celui qui le nomme tout de suite passe
  directement de « déplacez-le » à « projetez ». Vérifié dans le navigateur.
- **La bulle s'accroche au vrai contrôle** (`data-tour`), remesuré à chaque
  étape et à chaque redimensionnement — jamais une position codée en dur. Sa
  hauteur est mesurée puis ramenée dans l'écran : une cible haute comme le
  canevas ne laisse de place ni au-dessus ni au-dessous.

SPEC? DESIGN.md ne décrit pas de bulle d'accompagnement : elle reprend la
recette « Popovers/menus » de §3 et l'anneau d'accent de §5, sans nouveau
vocabulaire visuel. Le bouton de reprise est une icône Lucide dans la barre
d'état, à côté du sélecteur d'apparence — c'est le « menu d'aide » demandé.

### 13.9 Polices incorporées : « XVIIᵉ » s'imprime enfin (§8 refermé)

§8 laissait la question ouverte : les 14 polices standard d'un PDF sont
encodées en WinAnsi, qui ne contient pas « ᵉ » (U+1D49), et M3 avait choisi le
repli « XVIIe » plutôt que d'ajouter une dépendance sans accord. **Kilian a
tranché le 31 août 2026** : `@pdf-lib/fontkit` entre dans la liste fermée de
PLAN.md §8.4, avec une police libre incorporée.

Trois choses que le travail a apprises :

- **Le sous-ensemble « latin » de Google Fonts n'a pas l'ordinal non plus.**
  Inter, Source Sans 3 et EB Garamond servis par défaut sont amputés des
  lettres modificatives. Il a fallu demander un sous-ensemble explicite
  (paramètre `text=`) couvrant le répertoire réel de l'application : français
  complet, ordinaux, ponctuation, espaces insécables. 49 Ko par graisse.
- **Le choix de la police est une contrainte de mise en page, pas de goût.**
  `layout/measure.ts` mesure avec les métriques de SF Pro Text, la police de
  l'écran ; une police d'impression plus large ferait déborder les libellés
  *au seul endroit qu'on ne regarde pas*, le papier. Inter a été retenue parce
  que ses chasses tiennent dans ces boîtes — vérifié sur tous les libellés des
  quatre fixtures, aux deux graisses. `fonts.test.ts` fige la contrainte à 3 %,
  la marge qu'absorbe le rembourrage de 8 px d'une puce.
- **Le test du flux PDF a dû apprendre à lire.** Une police en sous-ensemble
  écrit ses propres codes de glyphes : les libellés ne sont plus des octets
  lisibles dans le flux, et le contrôle « chaque libellé retrouvé en texte »
  serait devenu vide de sens. Le test emprunte maintenant le chemin d'un
  lecteur de PDF — il lit les tables `ToUnicode` puis décode. Les deux polices
  numérotant leurs glyphes à partir de 1 chacune, leurs tables sont gardées
  **séparées** : les fondre faisait lire « POLITIQUE » là où le PDF dit
  « Avènement ».

La seconde facette de l'ajout 2 — **un thème qui nomme sa typographie** — a
été livrée ensuite ; voir §13.13.

Le morceau d'export passe de 437 Ko à 1,3 Mo (fontkit et les deux graisses).
Il est chargé paresseusement — il n'entre pas dans le coût d'ouverture — et
préchargé par le service worker, si bien qu'exporter hors ligne fonctionne.

### 13.10 Transitions de l'interface (demande de Kilian, 31 août 2026)

DESIGN.md §8 fixe déjà les règles — 140 ms `ease-out` pour l'interface, 240 ms
pour la caméra, 600 ms pour un pas de présentation, « rien d'autre ne bouge » —
mais elles n'étaient appliquées qu'à trois endroits, et à deux durées
différentes (120 et 140 ms). Les panneaux, le plan, les cartes de thème, les
tuiles du navigateur et les cartes d'export changeaient d'état d'un bloc.

- Les durées et les courbes deviennent des **jetons** de `tokens.css`
  (`--motion-ui`, `--motion-camera`, `--motion-step`, `--ease-ui`,
  `--ease-camera`), comme les couleurs : plus une seule durée écrite en dur.
- Les propriétés animées sont **énumérées**, jamais `transition: all` — qui
  animerait aussi la géométrie et ferait glisser les panneaux au
  redimensionnement de la fenêtre.
- L'anneau de focus apparaît **sans transition** : il répond à une touche.
- Ce qui se calcule image par image pendant un geste — contour de sélection en
  cours de glissement, repère d'aimantation, vue du minimap — est explicitement
  exclu : l'animer le ferait traîner derrière le pointeur.
- Seule géométrie animée de l'application : l'anneau du tutoriel, qui **glisse**
  d'une cible à l'autre (240 ms, courbe caméra). C'est ce déplacement qui porte
  le sens de l'étape ; ailleurs, §8 proscrit tout mouvement.

SPEC? §8 ne dit rien de l'**apparition** d'un panneau surgissant. Retenu : le
même 140 ms `ease-out`, en fondu avec 4 px de montée, pour la notification, la
boîte de dialogue, le popover de l'axe, le sélecteur d'apparence, le navigateur
de frises et la bulle du tutoriel. Ni rebond ni mise à l'échelle.

Détail d'implémentation qui a failli passer inaperçu : c'est une **transition
avec `@starting-style`**, pas une animation `@keyframes`. Les modules CSS
renomment les keyframes qu'ils référencent, si bien qu'une règle
`@keyframes` posée dans une feuille globale se retrouve muette dans chaque
module — l'animation ne joue jamais, sans la moindre erreur. Une transition n'a
pas de nom à renommer. Vérifié dans le navigateur : opacité 0 → 0,10 après deux
images → 1 après la transition.

**Renvoyé à un changement à part, et fait depuis** : §8 prévoit aussi que « la
mise en page qui se réorganise après un dépôt anime les positions sur 140 ms ».
Les éléments du canevas sont posés en coordonnées absolues, que le CSS ne sait
pas interpoler. La solution n'a pas été de repositionner chaque groupe par
`transform` — une reprise du rendu, partagé avec les exports — mais d'interpoler
la scène elle-même : voir §13.14.

### 13.11 Dégradé : deux décisions que la spécification laissait ouvertes

PLAN.md M4 (ajout 3) demande un neuvième `fillStyle`, `gradient`, « la couleur
de l'élément qui s'estompe le long de la barre », avec un contrat explicite :
vrai `linearGradient` en SVG, approximation en 16 bandes en PDF, **différence
annoncée dans la boîte d'export**. Deux points restaient à trancher.

**Où s'arrête le dégradé.** Un écart fixé dans l'absolu — « du remplissage du
thème jusqu'à 35 % de la couleur pleine » — inversait le dégradé sur *Frise
officielle*, dont le remplissage est déjà franc, et rendait le libellé illisible
sur deux couleurs : les deux arrêts encadraient la luminance moyenne, si bien
qu'aucune encre, ni claire ni foncée, ne passait aux deux bouts.

Retenu : on garde **l'encre du thème**, déjà validée sur son remplissage, et
l'on pousse le second arrêt vers la couleur pleine *aussi loin que la
lisibilité le permet* (au plus 45 %). Le dégradé est donc franc sur un thème à
remplissage clair, discret là où le thème colore déjà fort — et lisible dans
les deux cas par construction, non par vérification après coup.

**Comment le PDF l'approche.** pdf-lib n'expose pas de nuancier, et il ne
permet pas non plus de découper sur une forme : `drawSvgPath` referme son
propre état graphique et emporte la découpe avec lui. L'approximation est donc
un **empilement** : la forme entière dans la teinte la plus soutenue, puis des
copies de plus en plus courtes et claires par-dessus. La silhouette vient de la
couche du dessous, coins arrondis et pointe de flèche compris ; les couches
intermédiaires ont un bord droit franc (`leftRoundedPath`), sans quoi chaque
jointure laisserait un feston clair. Les couches sont une fonction pure et
partagée (`gradientLayers`), vérifiée par test sur le flux du PDF réel.

Les accolades restent exclues : elles n'ont aucune surface fermée
(docs/spec-gaps.md §13, remplissages).

### 13.12 Bloc de titre : dans la scène, donc dans l'image

PLAN.md M4 (ajout 4) : « un bloc au niveau du document — titre, sous-titre ou
description, auteur et date facultatifs — placé au-dessus de la frise, **membre
du SceneGraph** pour qu'il s'imprime et s'exporte à l'identique ». C'est la
contrainte qui a guidé toute la mise en œuvre : rien n'est dessiné par le
rendu, tout est résolu par `layout()` — jusqu'aux lignes de base, que le PDF
reprend telles quelles au lieu de recalculer un centrage de son côté.

Décisions non spécifiées :

- **Absent par défaut.** `titleBlock` est optionnel : les fichiers antérieurs
  se chargent et se dessinent exactement comme avant, et une frise destinée à
  être collée dans un diaporama n'a pas besoin de son propre titre. Le retirer
  supprime la clé plutôt que de laisser un objet éteint dans le fichier.
- **Le bloc repousse les bandes**, il ne se pose pas par-dessus : sa hauteur
  entre dans le calcul de la scène, coupures comprises — une coupure partant du
  haut du canevas aurait traversé le titre.
- **La date affichée est celle de création**, pas celle de la dernière
  retouche : c'est ce que porte l'en-tête d'un polycopié.
- **Deux positions seulement**, à gauche ou centré, en contrôle segmenté.
  PLAN.md parle de « faire glisser entre haut-gauche et haut-centre » ; le
  glissement ajouterait une poignée sur le canevas pour un choix binaire, là où
  deux boutons disent la même chose sans encombrer la frise. À rouvrir si
  Kilian tient au geste.
- **Typographie par thème** : le bloc n'a pas de couleurs propres, il emploie
  les jetons `--text-*` que `Frise` redéfinit d'après le thème. Un titre posé
  sur *Craie* s'écrit donc à la craie sans règle particulière.

Défaut trouvé en vérifiant dans le navigateur : chaque contrôle du bloc écrit
l'objet entier, et le construisait sur le document **capturé au rendu**. Le
sous-titre disparaissait dès qu'on cochait « Auteur » dans la foulée, alors que
son champ le montrait encore. `patchTitleBlock` repart de l'état courant du
magasin ; le cas est figé par test.


### 13.13 Typographie par thème : la fonte entre dans la géométrie

Seconde facette de PLAN.md M4 (ajout 2) : « qu'un thème puisse nommer sa
typographie, *Parchemin* en serif et *Craie* en écriture à la craie, avec le
même fichier incorporé dans les exports SVG et PDF ».

Le point qui commande tout le reste : **une fonte n'est pas une décision de
rendu**. La largeur d'un libellé décide de la largeur de sa puce, donc de
l'empilement, donc de la hauteur de la scène. La fonte est donc résolue à
l'entrée de `layout()`, à partir du thème du document — pas passée par les
appelants, qui auraient fini par l'oublier quelque part, et pas laissée au
rendu, qui aurait dessiné une police mesurée pour une autre : le défaut de
§12.7, cette fois par construction.

**Les tables sont engendrées, pas relevées.** SF Pro Text n'a pas de fichier —
c'est la police du système —, sa table reste donc un relevé au navigateur.
Les fontes que nous livrons, elles, sont mesurées **dans leur propre fichier**
par `pnpm metrics` : la table est juste par construction et le reste si l'on
change de sous-ensemble. `faceMetrics.test.ts` confronte chaque table au
fichier, glyphe par glyphe, sur tous les libellés des quatre fixtures.

Décisions non spécifiées :

- **Le mesureur du navigateur ne mesure pas ces fontes-là.** Mesurer au canevas
  avant que la police soit téléchargée aurait figé la largeur du *repli*
  (Georgia, cursive) dans une mise en page que rien ne recalculait ensuite.
  Pour une fonte livrée, la table engendrée est la vérité — c'est le même
  fichier que le navigateur affiche. Le canevas ne sert plus qu'à la police du
  système, la seule qui n'ait pas de fichier.
- **Deux graisses, et des intervalles `@font-face` explicites.** Nous livrons
  400 et 600 ; en déclarant `font-weight: 400 500` et `600 700`, la graisse 500
  des puces est rendue par le fichier « regular » **sans synthèse**, ce que la
  table mesure exactement. Sans ces intervalles, le navigateur graissait
  artificiellement et le texte débordait.
- **Ce que la fonte ne porte pas est remplacé, à l'écran comme à
  l'impression.** Les sous-ensembles d'EB Garamond et de Caveat n'ont pas
  l'espace fine insécable (U+202F), que le français emploie pour les milliers ;
  Caveat n'a pas non plus les lettres modificatives, si bien que « XVIIᵉ » y
  afficherait un glyphe manquant. La liste des caractères absents est
  **relevée dans la fonte** par le générateur, pas écrite à la main, et
  `foldForFace` les remplace sur la scène finie — « XVIIe siècle » sur Craie,
  « XVIIᵉ siècle » ailleurs. Un remplacement ne fait que rétrécir le texte : les
  largeurs déjà mesurées restent des majorants.
- **La tolérance de mesure dépend de la longueur.** La table additionne des
  chasses ; le rendu applique en plus la crénelure, qui resserre. L'écart est
  donc d'autant plus lâche que le texte est court — 5 % sur « v. 30 », moins de
  4 % sur un vrai libellé. Le test sépare les deux cas plutôt que de relâcher
  le seuil partout : c'est le libellé long qui ferait flotter une puce.
- **Les fichiers ne sont pas chargés au démarrage.** Le navigateur ne
  télécharge une fonte que si un thème l'emploie ; et la version en base64,
  qui pèse un demi-mégaoctet, n'est atteignable que depuis les exports. La
  règle `@font-face` du SVG exporté est **passée** à `renderToSvgString`, pas
  calculée par lui : la calculer là aurait fait charger les polices dès la
  première vignette de la bibliothèque — et aurait fait remonter `renderer/`
  vers `export/`, à contresens des couches.

Vérifié dans le navigateur : Parchemin en Garamond et Craie en Caveat, aucun
libellé d'événement ne dépassant sa puce dans les trois thèmes (pire marge
2,6 px *à l'intérieur*), l'exposant ordinal présent sur Manuel et Parchemin et
replié sur Craie, et un SVG exporté ouvert **hors de l'application** qui
s'affiche bien en Garamond depuis la police incorporée.

### 13.14 Réorganisation animée : c'est la scène qui glisse, pas le rendu

DESIGN.md §8 finit par une phrase restée sans mise en œuvre : « la mise en page
qui se réorganise après un dépôt anime les positions sur 140 ms ». §13.10 la
renvoyait à un changement à part, en pointant l'obstacle : la scène est posée en
coordonnées absolues, que le CSS ne sait pas interpoler, et repositionner chaque
groupe par `transform` était une reprise du rendu — partagé avec les exports.

**La reprise n'a pas eu lieu : c'est la scène que l'on interpole.**
`layout/reflow.ts` ajoute `interpolateScene(avant, après, t)`, fonction pure de
plus sur le `SceneGraph`, exactement comme `visibleScene`. L'éditeur peint la
scène intermédiaire ; le rendu, lui, ne sait rien de tout cela et reste au pixel
près celui des exports. Un `transform` par groupe aurait laissé en arrière tout
ce qui n'est pas un groupe : les connecteurs, tracés dans une passe séparée pour
passer derrière les puces, le contour de sélection, les poignées de bord — le
CSS n'anime pas les extrémités d'une ligne. Ici, tout est calculé depuis les
mêmes coordonnées : un élément ne peut pas se disloquer en chemin, et le test
le vérifie sur chaque image.

Décisions non spécifiées :

- **Ce n'est pas le dépôt qui déclenche le mouvement, c'est la modification
  validée.** Pendant un glissement, l'aperçu recalcule déjà la mise en page à
  chaque image : les voisins s'écartent en direct, si bien qu'au lâcher il ne
  reste rien à animer. Ce qui saute, dans cette application, ce sont les
  changements *discrets* — annuler, refaire, supprimer, changer de bande,
  décaler aux flèches, un champ de l'inspecteur. Le déclencheur est donc la
  révision du magasin, et `null` tant qu'un aperçu est en cours : animer une
  image de geste la ferait traîner derrière le pointeur (§13.10).
- **Ce qui glisse est ce que l'empilement décide** : les bandes, les éléments,
  la ligne de base, la hauteur du canevas et l'étendue verticale des coupures.
  Les graduations, les segments d'axe et le bloc de titre ne bougent pas d'un
  dépôt — ils appartiennent à l'axe et au document — et restent donc en place.
- **Le contenu est toujours celui de l'arrivée** : seule la position est en
  chemin. Un élément qui vient d'apparaître n'a pas de position d'origine ; il
  est posé d'emblée à la sienne plutôt que de venir de nulle part.
- **Une modification qui ne déplace rien ne s'anime pas** (`sameGeometry`) :
  renommer une bande ou changer une couleur ne doit pas ouvrir 140 ms pendant
  lesquelles il ne se passe rien.
- **`prefers-reduced-motion` est traité ici, explicitement.** base.css annule
  les transitions CSS d'un coup ; une animation JavaScript, elle, n'obéit à
  rien. `reflowDuration()` rend zéro quand la préférence est posée, et la scène
  saute — vérifié au navigateur dans les deux réglages.
- **La courbe est celle du jeton.** `--ease-ui` vaut `ease-out`, soit
  `cubic-bezier(0, 0, 0.58, 1)` : `easeUi` la résout au lieu d'approcher une
  courbe voisine, sans quoi deux mouvements simultanés — un panneau qui se
  replie, la frise qui se réorganise — n'auraient pas la même allure.

Défaut trouvé **dans le navigateur, et invisible en développement** : la durée
est lue dans le jeton `--motion-ui`, mais le minificateur de la construction de
production réécrit `140ms` en `.14s`. Lire le nombre sans son unité donnait une
animation de 0,14 ms — c'est-à-dire le saut d'avant, publié à chaque fois et
jamais reproductible en développement. `cssMilliseconds` lit maintenant l'unité,
et le test couvre les deux écritures d'une même durée.
