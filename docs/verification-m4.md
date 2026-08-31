# Vérification M4 — 31 août 2026

M4 « Polish, typography & desktop » (PLAN.md §5), **partie web**. Kilian a
tranché le 31 août 2026 : le web d'abord, Tauri dans une session dédiée.

## Automatisé

- `pnpm test` : **470 tests**, tous réussis. `pnpm lint` et `pnpm build` :
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
modification partielle qui ne perd rien), réorganisation animée (départ sur la
géométrie d'avant et arrivée exacte sur celle d'après, élément d'un seul tenant
à chaque image, axe et graduations immobiles, élément apparu posé d'emblée,
courbe `ease-out` du jeton, et une durée lue avec son unité — « 140ms » comme
« .14s »), tables de chasses engendrées
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
- **Bloc de titre** : titre, sous-titre et « Kilian Vivien — 30 août 2026 »
  centrés au-dessus de la frise, bandes repoussées.
- **Réorganisation après un dépôt** (DESIGN.md §8), mesurée image par image sur
  le build de production : un événement glissé sur son voisin repousse celui-ci
  d'une rangée, puis ⌘Z rend la frise à son état d'avant — la puce parcourt
  650 → 689 px en **huit images intermédiaires** (654,8 · 661,9 · 668,2 · 674,0
  · 678,8 · 683,0 · 686,3 · 688,4), des pas qui vont en se resserrant :
  c'est la courbe `ease-out` du jeton, sur les 140 ms annoncées. Rien ne se
  disloque en chemin — capture en plein vol : la puce à mi-hauteur, sa pastille
  toujours sur l'axe et son connecteur tendu entre les deux.
  Sous `prefers-reduced-motion: reduce`, **zéro image intermédiaire** : la scène
  saute, comme le veut la préférence. Ce qui se calcule pendant un geste n'est
  pas touché : la puce suit le pointeur à 4,2 px près (le seuil de départ du
  glissement) et un panoramique de 100 px déplace la frise de 100 px, sans
  retard.
- Aucune erreur console sur l'ensemble des parcours.

## Le PDF, enfin regardé

Un rastériseur (PyMuPDF) est installé **comme outil de vérification** — il
n'entre pas dans les dépendances de l'application (PLAN.md §8.4 est intacte).
Chaque page des quatre fixtures, plus une frise de démonstration portant les
neuf remplissages, les trois formes, les bords flous et le bloc de titre, sur
les six thèmes, a été rendue en image et examinée.

Quatre défauts trouvés, tous corrigés et couverts par des tests
(docs/spec-gaps.md §13.15) : l'export **échouait** sur les hachures et le
croisillon ; les motifs débordaient de leur barre d'une frange de dix pixels ;
« XXᵉ siècle » et « XXIᵉ siècle » se touchaient au bord droit d'une page A4 ;
le point médian du bloc de titre, absent des trois fontes livrées, s'imprimait
en rectangle vide.

La frise murale est vérifiée **au pixel** plutôt qu'à l'œil : la bande de
recouvrement de 10 mm de la page *n* et celle de la page *n+1* se superposent
avec un décalage optimal de **zéro pixel à 200 dpi** (0,127 mm par pixel), le
reste de l'écart tenant aux repères d'assemblage, tracés sur un seul bord de
chaque page. Les feuilles se raboutent donc exactement.

Vérifié bon à l'image : les coupures ⫽ et les densités par segment de
`grandes-periodes`, les exposants ordinaux (imprimés sur Manuel et Parchemin,
repliés sur Craie), les six thèmes, le dégradé en seize bandes, les bords flous,
l'accolade, la flèche, la frise murale à trois pages avec repères d'assemblage
et pagination, la fiche élève et son corrigé à la suite.

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
- **Aucune page n'a encore été imprimée sur du papier.** Le rendu du PDF est
  désormais regardé (voir ci-dessus), mais l'écart entre l'écran et une
  photocopieuse de collège — le thème *Journal* est fait pour elle — reste à
  éprouver en vrai.
- Le glissement du bloc de titre entre haut-gauche et haut-centre est rendu par
  un contrôle segmenté, pas par un geste (docs/spec-gaps.md §13.12).
- Aucun essai sur matériel tactile, ni impression papier réelle.
