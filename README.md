# KronoFrise

L'éditeur de frises chronologiques pour les professeurs d'histoire.

Ce dépôt suit trois documents, à lire dans cet ordre :

| Document | Ce qu'il tranche |
|---|---|
| [PLAN.md](PLAN.md) | quoi et quand — jalons, architecture, règles de travail |
| [DESIGN.md](DESIGN.md) | toute décision visuelle et d'interaction |
| [docs/format.md](docs/format.md) | le format `.krono` et les contrats de `core/` |
| [docs/spec-gaps.md](docs/spec-gaps.md) | les points non tranchés et la façon dont ils l'ont été |

## Démarrer

```bash
pnpm install
pnpm dev
```

| Commande | Effet |
|---|---|
| `pnpm dev` | serveur de développement Vite |
| `pnpm test` | Vitest (noyau, échelle, mise en page, rendu, sonde PDF) |
| `pnpm lint` | ESLint, règle de frontière comprise |
| `pnpm build` | vérification TypeScript puis build de production |
| `pnpm fixtures:emit` | réécrit les fichiers `.krono` depuis les fixtures TypeScript |

## Structure

```
src/
├── core/      modèle de document, dates, schéma zod, commandes, historique, fixtures
├── layout/    échelle segmentée (temps ⇄ pixels), graduations, moteur de mise en page
├── renderer/  SceneGraph → SVG (écran et export headless)
├── export/    sonde PDF (M3)
├── themes/    thèmes, en données pures
├── shared/    chaînes et palette pures, sans dépendance à l’interface
├── ui/        éditeur, interactions, jetons, entrées chaînes/palette
└── store/     store zustand, commandes, autosauvegarde IndexedDB, fichiers
```

**La frontière sacrée** (PLAN.md §4.2, appliquée par ESLint) : `core/` et
`layout/` n'importent ni React, ni le DOM, ni les couches supérieures. Le rendu
est `render(layout(document))` et les exports appellent la même chaîne : ce qui
s'imprime est exactement ce que l'on voyait.

## État

**M2 — Apparence et structure sont implémentées.** `/` ouvre l'éditeur ;
`/?fixtures` conserve la page de contrôle M0.

- Glissez le fond pour saisir la frise et naviguer horizontalement, même à 100 %.
  La molette conserve le défilement vertical. Espace + glisser navigue aussi sur un élément.
- **+ Événement / E**, puis clic ; **+ Période / P**, puis glissement : créer.
  Entrée valide le libellé, Échap annule, puis l'outil revient à Naviguer.
- Le bouton de pourcentage ajuste la vue en tenant compte des libellés et images.
- L'inspecteur édite dates, descriptions, couleurs, formes, bandes, images et métadonnées.
- La structure permet de rechercher, sélectionner, nommer, colorer, replier et réordonner
  les bandes. Glissez un élément vers une autre bande, sur le canevas ou dans le plan.
- Clic droit sur la règle : scinder à une date. Glissez une poignée pour redistribuer
  les largeurs ; double-cliquez pour éditer ou supprimer une coupure. Les poids restent
  éditables dans l'inspecteur (huit segments maximum).
- Quatre thèmes : Manuel scolaire, Craie, Parchemin, Journal (noir et blanc).
  Le préréglage grandes périodes ajoute cinq périodes sans effacer les éléments existants.
- Le navigateur inférieur déplace la vue à la souris ou au clavier.
- Maj + clic/glisser sélectionne plusieurs éléments ; Alt désactive l'aimantation.
  ⌘/Ctrl Z, ⇧⌘/Ctrl Z, ⌘/Ctrl D, Suppr : annuler, rétablir, dupliquer, supprimer.
- L'autosauvegarde conserve document et historique ; Ouvrir/Enregistrer échange des `.krono`.

La vérification M0 a corrigé les imports de couches supérieures, l'inversion
exacte des masques, plusieurs invariants d'import et la lisibilité de la règle
en mode sombre. L'empilement des libellés d'accolades est également corrigé.
L'export MiCetF réel et l'incorporation complète des glyphes de police PDF
restent des points ouverts documentés, sans bloquer l'édition M2.

Voir [docs/verification-m1.md](docs/verification-m1.md) pour les contrôles
exécutés et leurs limites.

Voir [docs/verification-m2.md](docs/verification-m2.md) pour la vérification M2.
