# Vérification M0 / livraison M1 — 30 août 2026

## Contrôle rapide de M0

Point de départ : 209 tests réussis, build TypeScript/Vite et ESLint réussis.
Le dépôt est bien une application Vite unique, conformément aux décisions
arrêtées (le mot « monorepo » dans le résumé M0 du plan est obsolète).

Les dates astronomiques, migrations versionnées, commandes sérialisables,
échelle segmentée, règle adaptative, rendu partagé et fixtures étaient présents.
Le contrôle a cependant trouvé et corrigé :

- l'exception autorisant des imports UI depuis core ; les données partagées
  sont maintenant isolées et la règle ESLint n'a plus d'exception ;
- la perte des masques pédagogiques et de leur ordre à l'annulation d'une suppression ;
- les IDs en double, références de masques invalides, premier segment antérieur
  au début de l'axe et borne finale dont la précision ne correspondait pas ;
- le texte de règle trop clair sur papier quand le chrome est sombre ;
- la visibilité des dates calculée à la densité moyenne plutôt que par segment ;
- l'emprise incomplète des libellés d'accolades, dont le chevauchement
  « Naissance du christianisme » / « Pax Romana » signalé dans le navigateur.

Les anciens écarts sur l'export MiCetF réel et les glyphes PDF restent ouverts
(voir spec-gaps §§4 et 8). Les identifiants lisibles des fixtures restent acceptés.
Ce contrôle rapide ne constitue pas une certification exhaustive de M0.

## M1 livré

Éditeur par défaut, panneaux réservés, titre modifiable, navigation et zoom,
création événement/période sans formulaire, libellé en place, déplacement,
redimensionnement, aimantation/Alt, infobulle et guide, empilement automatique,
sélection additive et rectangle de sélection, duplication/suppression,
confirmation multi-suppression, annuler/rétablir et raccourcis, bornes d'axe
linéaire éditables en place, fichiers `.krono`, autosauvegarde IndexedDB de
500 ms avec historique et cache de miniature PNG 400 px limité à 30 s.

Une création et son libellé forment une seule commande ; les déplacements
répétés ne modifient qu'un aperçu transitoire avant le relâchement.
Une erreur de stockage est affichée et ne marque pas le document comme sauvé.
Avant de remplacer la frise, une sauvegarde locale réussie ou une copie fichier
est requise pour ne pas abandonner du travail non conservé.

## Contrôles exécutés

- `pnpm test` : **229 tests**, 13 fichiers, tous réussis.
- `pnpm lint` : aucune erreur ni avertissement.
- `pnpm build` : TypeScript strict et build de production réussis.
- `git diff --check` : réussi.
- Mesure de la fixture 500 éléments : test de layout moyen inférieur à 5 ms.
- Tests nouveaux : aperçu/commit/annulation, restauration exacte des masques,
  debounce, historique après réouverture, quota en échec, fichiers invalides et
  trop volumineux, aller-retour des quatre fixtures, adaptateurs natif et repli,
  déplacement BC/AD, aimantation, inversion des dates précises, accolades.

Scénarios exercés avec le navigateur intégré (serveur Vite, puis build de
production pour éviter les interruptions du rechargement à chaud) :

1. Clic → événement → saisie → Entrée, sans double insertion.
2. Glissement → période → saisie → Entrée.
3. Redimensionnement de fin 1987 → 1997, puis annulation en une étape.
4. Maj + clic, déplacement simultané d'événement et période de dix ans.
5. Duplication de deux éléments, suppression confirmée, annulation/rétablissement.
6. Édition directe de la borne de début 1926 → 1900.
7. Zoom 100 → 150 %, navigation horizontale et restauration après reload,
   historique disponible.
8. Rectangle de sélection Maj + glisser : 13 éléments sélectionnés dans Antiquité.
9. Échap pendant une création et pendant un renommage : document/historique inchangés.
10. Révolution, Antiquité (BC/AD), grandes périodes (coupures et densités distinctes),
    puis stress : 500 éléments présents, aucune erreur ni avertissement console
    dans la session de vérification de production.
11. Comparaison visuelle avec DESIGN.md en chrome sombre, papier clair ;
    l'accolade « Pax Romana » et l'événement signalé sont nettement séparés.

## Limites de vérification / suite

- Le pilote du navigateur ne contrôle pas le dialogue natif File System Access :
  la tentative d'ouverture a expiré côté pilote. Les adaptateurs natifs et
  upload/download sont couverts par tests ; un essai manuel des dialogues
  natifs et un passage Safari/Firefox restent à effectuer.
- La session visuelle était en mode sombre. Les jetons clairs et la règle
  `prefers-reduced-motion` ont été contrôlés dans le CSS ; le pilote disponible
  n'expose pas l'émulation de ces préférences, donc pas de validation visuelle
  séparée de ces deux modes.
- Les panneaux sont volontairement réservés. Inspecteur complet, bandes,
  thèmes et éditeur élastique restent M2 ; exports visuels et modes pédagogiques M3.
- Les tests de navigateur ont été exécutés via le pilote interactif ; ils ne
  constituent pas encore une suite Playwright autonome exécutée en CI.
