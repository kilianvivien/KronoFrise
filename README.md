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
├── ui/        chrome, jetons, chaînes, palette
└── store/     (M1) store zustand, envoi des commandes, autosauvegarde
```

**La frontière sacrée** (PLAN.md §4.2, appliquée par ESLint) : `core/` et
`layout/` n'importent ni React, ni le DOM, ni les couches supérieures. Le rendu
est `render(layout(document))` et les exports appellent la même chaîne : ce qui
s'imprime est exactement ce que l'on voyait.

## État

**M0 — Fondations : terminé.** Modèle de document et schéma, arithmétique des
dates av./apr. J.-C., échelle segmentée éprouvée par tests de propriété,
commandes inversibles et pile d'annulation, moteur de mise en page, rendu SVG
avec règle adaptative. Les quatre fixtures de docs/format.md §10 s'affichent à
tous les niveaux de zoom (`pnpm dev`).

Prochaine étape : **M1 — le canevas vivant** (création au clic, glissement,
sélection, store et autosauvegarde).
