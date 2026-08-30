# Écarts de spécification

Points non tranchés par PLAN.md / DESIGN.md / docs/format.md, résolus par
analogie avec la spécification la plus proche (PLAN.md §8.1). Chaque entrée est
signalée par un commentaire `// SPEC?` dans le code.

## 1. `strings.ts` et `palette.ts` traversent la frontière `core/`–`ui/`

- **Tension.** PLAN.md §4.2 interdit à `core/` et `layout/` d'importer `ui/`.
  DESIGN.md §1.2/§1.3 exigent une source unique pour les couleurs
  (`palette.ts`) et pour les chaînes (`strings.ts`), et docs/format.md §2 veut
  que `parseDocument` échoue avec un **message français**.
- **Résolution.** `src/ui/strings.ts` et `src/ui/palette.ts` sont des modules de
  données purs : aucun import React, aucun accès au DOM. Ils sont les deux
  seules exceptions de la règle ESLint de frontière ; le reste de `ui/` demeure
  interdit à `core/` et `layout/`. Le portage Tauri et les exports headless
  restent donc possibles.
- **Alternative écartée.** Faire remonter des codes d'erreur que `ui/`
  traduirait : dupliquerait le vocabulaire et contredirait format.md §2.

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
