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

**M1 — Le canevas vivant est implémenté.** Le chemin `/` ouvre l'éditeur ;
`/?fixtures` conserve la page de contrôle M0. Les panneaux sont encore des
emplacements réservés : leur contenu complet relève de M2.

- Cliquez pour créer un événement, glissez sur le fond pour créer une période.
- Saisissez son libellé puis Entrée ; Échap annule. Double-cliquez pour renommer.
- Glissez un élément pour le déplacer ou le bord d'une période pour la redimensionner.
- Maj + clic ou Maj + glisser sélectionne plusieurs éléments ; Alt désactive l'aimantation.
- ⌘/Ctrl Z, ⇧⌘/Ctrl Z, ⌘/Ctrl D, Suppr : annuler, rétablir, dupliquer, supprimer.
- Molette horizontale/Maj ou Espace + glisser : naviguer ; Ctrl/⌘ + molette : zoomer.
- Cliquez sur une borne sous la règle pour changer l'étendue d'un axe linéaire.
- Enregistrement automatique après 500 ms, historique compris ; Ouvrir/Enregistrer
  lit/écrit des fichiers `.krono` avec les dialogues natifs ou un repli upload/download.

La vérification M0 a corrigé les imports de couches supérieures, l'inversion
exacte des masques, plusieurs invariants d'import et la lisibilité de la règle
en mode sombre. L'empilement des libellés d'accolades est également corrigé.
L'export MiCetF réel et l'incorporation complète des glyphes de police PDF
restent des points ouverts documentés, sans bloquer l'édition M1.

Voir [docs/verification-m1.md](docs/verification-m1.md) pour les contrôles
exécutés et leurs limites.
