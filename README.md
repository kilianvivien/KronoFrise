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
| `pnpm samples` | exporte les fixtures en PDF, SVG et page web (contrôle visuel) |

## Structure

```
src/
├── core/      modèle de document, dates, schéma zod, commandes, historique,
│           pédagogie, importateurs (MiCetF, CSV), fixtures
├── layout/    échelle segmentée (temps ⇄ pixels), graduations, moteur de mise en page
├── renderer/  SceneGraph → SVG (écran et export headless)
├── export/    PDF vectoriel, page web interactive, SVG, PNG, pagination
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

**M3 — Les super-pouvoirs du professeur sont implémentés.** `/` ouvre
l'éditeur ; `/?fixtures` conserve la page de contrôle M0.

- La barre d'outils est en icônes groupées (outils, modes, fichiers), chacune
  avec son infobulle et son raccourci.
- **Trois modes** : Édition, Présentation, Fiche élève.
  - *Fiche élève* : masquer un libellé, une date ou les deux, tout masquer,
    en masquer la moitié au hasard, afficher le corrigé. Masquer ne modifie
    jamais le document et s'annule en une étape.
  - *Présentation* : plein écran sans chrome, parcours chronologique au
    clavier, caméra fluide, fiche de l'élément, mode « Révéler » qui fait
    apparaître les éléments un par un.
- **Exporter** : PDF vectoriel (A4/A3, portrait/paysage, frise murale paginée
  avec recouvrement et repères de coupe, corrigé à la suite, fiche d'exercice
  à découper), **page web interactive** autonome, SVG et PNG 1×/2×/3×.
  Tous les exports passent par la même scène que l'écran.
- **Importer** : export MiCetF (couleurs ramenées à la palette, « frise à
  compléter » transformée en masques) et tableaux CSV/TSV, par fichier ou par
  simple collage dans la frise ouverte — annulable, lignes illisibles signalées.
- **Navigateur de frises** : toutes les frises enregistrées sur l'appareil,
  avec vignettes ; ouvrir, dupliquer, supprimer, importer par dépôt de fichier.
- Édition directe sur le canevas, axe élastique, bandes, thèmes, remplissages,
  images, plan, minimap et annulation illimitée : voir les jalons précédents.
- L'autosauvegarde conserve document et historique ; Ouvrir/Enregistrer
  échange des `.krono`.

Restent ouverts : le rendu visuel du PDF n'a pas pu être inspecté à l'œil dans
cet environnement (aucun outil de rastérisation), et les exposants ordinaux
sont repliés à l'impression (docs/spec-gaps.md §8).

Voir [docs/verification-m1.md](docs/verification-m1.md),
[docs/verification-m2.md](docs/verification-m2.md) et
[docs/verification-m3.md](docs/verification-m3.md) pour les contrôles exécutés
et leurs limites.
