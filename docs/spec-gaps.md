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

## 4. Fixture d'import MiCetF

PLAN.md §7.3 demande un vrai export MiCetF comme fixture de test. Aucun export
n'a pu être récupéré ici (pas d'accès au site). `core/importers/micetf.ts`
n'est donc **pas** implémenté (il relève de M3) ; le fichier réel devra être
déposé dans `src/core/fixtures/micetf-export.json` avant écriture de
l'importateur.

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
replier « XVIIᵉ » sur « XVIIe » à l'export. La sonde applique le repli.

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
