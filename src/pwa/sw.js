/**
 * Service worker — hors-ligne (PLAN.md §5, M4 « PWA/offline »).
 *
 * Écrit à la main : PLAN.md §8.4 ferme la liste des dépendances, et un
 * service worker de cette taille ne justifie pas d'y déroger. La liste des
 * fichiers à précharger est injectée à la construction par le greffon
 * `kronofrisePwa` de `vite.config.ts` — elle contient les noms hachés réels,
 * y compris les morceaux chargés paresseusement (l'export PDF), sans quoi
 * exporter hors ligne aurait échoué faute d'avoir jamais téléchargé ce
 * morceau.
 *
 * Stratégie : cache d'abord pour tout ce qui est préchargé (l'application est
 * versionnée par empreinte, un fichier haché ne change jamais de contenu) ;
 * réseau d'abord pour la navigation, avec repli sur la page d'accueil, ce qui
 * fait fonctionner l'application hors ligne sans jamais servir un index périmé
 * quand le réseau est là.
 *
 * L'activation anticipée exige une demande explicite, après enregistrement
 * du document. Les anciens caches restent disponibles pour les autres onglets
 * jusqu'à une activation naturelle, sans fenêtre d'application ouverte.
 */

const VERSION = '__VERSION__';
const CACHE = `kronofrise-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SKIP_WAITING') return;
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Les autres fenêtres peuvent encore charger les morceaux de l'ancienne
    // version. Ne nettoyer que lorsqu'aucune fenêtre n'est ouverte, y compris
    // si le worker a été arrêté puis relancé depuis le message d'activation.
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => clients.length ? [] : caches.keys())
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('kronofrise-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Un document `.krono` s'ouvre et s'enregistre localement : rien d'autre que
  // l'application elle-même ne transite par le réseau, et l'on ne met jamais
  // en cache une requête qui n'est pas une simple lecture de même origine.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Les sondes d'analyse de Vercel sont servies sous `/_vercel/` sans
  // empreinte de version : les mettre en cache figerait un script obsolète.
  if (url.pathname.startsWith('/_vercel/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.open(CACHE).then((cache) => cache.match('./').then((hit) => hit ?? cache.match('index.html')))),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((cache) => cache.match(request)).then((hit) => hit ?? caches.match(request)).then((hit) => hit ?? fetch(request).then((response) => {
      // Les réponses opaques ou en erreur ne sont jamais conservées : sinon un
      // 404 mis en cache survivrait à la panne qui l'a produit.
      if (!response.ok || response.type === 'opaque') return response;
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    })),
  );
});
