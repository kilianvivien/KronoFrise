/**
 * Enregistrement du service worker.
 *
 * Uniquement en production : en développement, un cache d'application ferait
 * mentir le rechargement à chaud. L'échec n'est jamais fatal — une frise
 * s'édite parfaitement sans mode hors ligne.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => { /* hors ligne indisponible : l'éditeur fonctionne quand même */ });
  });
}
