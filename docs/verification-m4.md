# Vérification M4 — 31 août 2026

M4 « Polish, typography & desktop » (PLAN.md §5), **partie web**. Kilian a
tranché le 31 août 2026 : le web d'abord, Tauri dans une session dédiée.

## Automatisé

- `pnpm test` : **410 tests**, tous réussis. `pnpm lint` et `pnpm build` :
  propres, TypeScript strict, aucun `any`.
- `pnpm bench` mesure la mise en page hors navigateur.

Nouveaux tests : décalage au clavier (pas lu dans la règle, précision d'une
date jamais affinée, segment élastique), contraste de la palette et des six
thèmes (12 couleurs × 6 thèmes, plus les 5 grandes périodes), élagage par
fenêtre (sous-ensemble exact, rien de visible perdu), manifeste et service
worker (préchargement complet, service sans réseau, repli de navigation hors
ligne, non-interception des POST et des origines tierces, refus de cacher une
erreur), tutoriel (une étape s'achève sur un geste, création ≠ déplacement,
étapes déjà satisfaites franchies d'un coup), polices incorporées (ordinaux
présents, typographie française complète, chasses tenant dans les boîtes
mesurées), exposants ordinaux dans le **flux du PDF réel**, dégradé (arrêts
lisibles sur les six thèmes, couches ordonnées, bandes comptées dans le PDF),
bloc de titre (bandes repoussées, coupures décalées, commande inversible,
modification partielle qui ne perd rien), tables de chasses engendrées
(confrontées au fichier de police, glyphe par glyphe, sur tous les libellés des
fixtures ; caractères absents relevés dans la fonte ; fonte incorporée au PDF
et au SVG selon le thème).

## Navigateur réel

Build de production sur `:4173`. Les mesures d'images sont prises **sur le
build de production** : React en développement est trois fois plus lent et ne
dit rien de l'expérience réelle.

- **Clavier** : ← → décalent d'une graduation (14 juillet 1789 → 1790), ⇧ de
  dix (→ 1800), retour exact ; ↑/↓ changent de bande et reviennent ; l'anneau
  de focus ne ment plus — après une annulation qui vide la sélection, une
  flèche la rétablit depuis le focus réel.
- **Accessibilité** : Tab atteint un élément **et le sélectionne** ; la barre
  d'état, `role="status"`, annonce « Événement : Prise de la Bastille, 14
  juillet 1789 » puis la nouvelle date à chaque décalage ; Tab boucle dans le
  navigateur de frises au lieu d'en sortir par-derrière.
- **Performance**, 500 éléments sur 4 bandes : `layout()` 0,6–1,0 ms (budget
  5 ms) ; panoramique 10 ms médian à 100 % ; glissement des 500 éléments
  sélectionnés 10 ms médian, 14 ms max ; à 40 000 % de zoom, l'élagage ramène
  2 870 nœuds SVG à 39 et le panoramique à 8 ms. Tout sous les 16,7 ms d'une
  image à 60 Hz. Aucun élément visible n'est rogné au bord.
- **Thèmes** : six cartes d'aperçu, *Frise officielle* et *Tableau blanc*
  vérifiés à l'écran ; remplissages effectivement plus soutenus (#B9BDD1 contre
  la teinte du manuel).
- **Tutoriel** : première visite réelle (stockage vidé), les quatre étapes,
  ancrage sur le bouton Événement puis sur Présentation, saut de l'étape
  « nommer » quand l'événement est nommé à sa création, carte finale, et
  « Passer » qui tient au rechargement.
- **Typographie par thème** : Parchemin en EB Garamond, Craie en Caveat,
  chargées seulement quand le thème les emploie. Aucun libellé d'événement ne
  dépasse sa puce dans les trois thèmes (pire marge : 2,6 px *à l'intérieur*).
  L'exposant ordinal s'affiche sur Manuel et Parchemin, et se replie en
  « XVIIe » sur Craie, dont la fonte ne le porte pas. Un SVG exporté, ouvert
  **hors de l'application**, s'affiche en Garamond depuis la police incorporée.
- **Transitions** : jetons résolus (140 ms `ease-out`), transitions présentes
  sur la barre d'outils et le plan, `@starting-style` mesuré à l'œuvre
  (opacité 0 → 0,10 après deux images → 1), notification saisie en plein fondu.
- **Dégradé** : 19 dégradés rendus sur une frise entière, arrêts
  #E4E9EE → #A6B7C7 sur une puce de 165 px.
- **Bloc de titre** : titre, sous-titre et « Kilian Vivien · 30 août 2026 »
  centrés au-dessus de la frise, bandes repoussées.
- Aucune erreur console sur l'ensemble des parcours.

## Limites

- **Tauri n'est pas commencé** : décision de Kilian, session dédiée. La
  notarisation et le DMG dépendront de son compte Apple Developer.
- **Le service worker ne s'enregistre pas dans le navigateur d'automatisation**,
  qui intercepte la requête du script (`An unknown error occurred when fetching
  the script`), alors que le fichier est servi en 200 `text/javascript` et de
  syntaxe valide. Le comportement est éprouvé à la place sur le **fichier
  réel** chargé dans un contexte de worker (`src/pwa/swHarness.ts`).
  L'installation sur un navigateur réel et l'invite « Installer l'application »
  restent à confirmer.
- **Le rendu visuel du PDF n'est toujours pas inspecté à l'œil** (limite
  héritée de M3 : pas de rastériseur installé). Le contrôle reste indirect —
  même scène, mêmes fonctions de forme que le SVG, qui lui est inspecté, plus
  la lecture du flux du PDF, désormais **décodé par les tables `ToUnicode`**
  comme le ferait un lecteur.
- **Les positions des éléments ne s'animent pas après un dépôt** (DESIGN.md
  §8). Le canevas pose ses éléments en coordonnées absolues, que le CSS ne sait
  pas interpoler ; il faudrait des groupes positionnés par `transform`, une
  reprise du rendu partagé avec les exports. Voir docs/spec-gaps.md §13.10.
- Le glissement du bloc de titre entre haut-gauche et haut-centre est rendu par
  un contrôle segmenté, pas par un geste (docs/spec-gaps.md §13.12).
- Aucun essai sur matériel tactile, ni impression papier réelle.
