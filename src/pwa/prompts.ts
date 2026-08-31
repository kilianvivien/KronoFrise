import { createStore } from 'zustand/vanilla';
import { PWA } from '../ui/strings';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
type InstallMethod = 'native' | 'ios' | 'safari' | null;
const DISMISSED_KEY = 'kronofrise:pwa-install-later';
const INSTALLED_KEY = 'kronofrise:pwa-installed';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export const pwaStore = createStore<{
  installMethod: InstallMethod;
  installDismissed: boolean;
  waiting: ServiceWorker | null;
  updateDismissed: boolean;
  updating: boolean;
  error: string | null;
}>(() => ({ installMethod: null, installDismissed: false, waiting: null, updateDismissed: false, updating: false, error: null }));

let installEvent: InstallEvent | null = null;
function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* Session state still dismisses the prompt. */ }
}
function standalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Register before React mounts so an early install event cannot be missed. */
export function startInstallPrompt(): () => void {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua);
  const safariVersion = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
  const manual: InstallMethod = safari && ios ? 'ios' : safari && /Macintosh/.test(ua) && safariVersion >= 17 ? 'safari' : null;
  pwaStore.setState({
    installMethod: standalone() || read(INSTALLED_KEY) === 'yes' ? null : manual,
    installDismissed: Number(read(DISMISSED_KEY) ?? 0) > Date.now(),
  });
  const beforeInstall = (event: Event) => {
    event.preventDefault();
    if (standalone()) return;
    installEvent = event as InstallEvent;
    // The browser's eligibility signal takes precedence over an old installation marker.
    pwaStore.setState({ installMethod: 'native' });
  };
  const installed = () => markInstalled();
  const display = window.matchMedia('(display-mode: standalone)');
  const displayChanged = () => { if (standalone()) markInstalled(); };
  window.addEventListener('beforeinstallprompt', beforeInstall);
  window.addEventListener('appinstalled', installed);
  display.addEventListener('change', displayChanged);
  return () => {
    window.removeEventListener('beforeinstallprompt', beforeInstall);
    window.removeEventListener('appinstalled', installed);
    display.removeEventListener('change', displayChanged);
    installEvent = null;
  };
}

export function dismissInstall(): void {
  write(DISMISSED_KEY, String(Date.now() + WEEK));
  pwaStore.setState({ installDismissed: true, error: null });
}
export function markInstalled(): void {
  installEvent = null;
  write(INSTALLED_KEY, 'yes');
  pwaStore.setState({ installMethod: null, error: null });
}
export async function installApp(): Promise<void> {
  const event = installEvent;
  if (!event) return;
  installEvent = null; // A browser install event can only be used once.
  try {
    // Must run directly from the click, before any asynchronous work.
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') markInstalled();
    else dismissInstall();
    pwaStore.setState({ installMethod: null });
  } catch {
    pwaStore.setState({ installMethod: null, error: PWA.installError });
  }
}

export function watchForUpdates(registration: ServiceWorkerRegistration): () => void {
  const cleanups: (() => void)[] = [];
  const found = () => {
    const worker = registration.waiting;
    if (worker && navigator.serviceWorker.controller && worker !== pwaStore.getState().waiting) {
      pwaStore.setState({ waiting: worker, updateDismissed: false, error: null });
    }
  };
  const installing = () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', found);
    cleanups.push(() => worker.removeEventListener('statechange', found));
  };
  registration.addEventListener('updatefound', installing);
  installing();
  found();
  // Long-lived installed apps also check when returning to the foreground.
  const check = () => { if (document.visibilityState === 'visible') void registration.update().catch(() => {}); };
  document.addEventListener('visibilitychange', check);
  return () => {
    registration.removeEventListener('updatefound', installing);
    document.removeEventListener('visibilitychange', check);
    cleanups.forEach((cleanup) => cleanup());
  };
}

function activate(worker: ServiceWorker): Promise<void> {
  if (navigator.serviceWorker.controller === worker) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', changed);
    };
    const changed = () => {
      if (navigator.serviceWorker.controller !== worker) return;
      cleanup(); resolve();
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error(PWA.updateError)); }, 15000);
    navigator.serviceWorker.addEventListener('controllerchange', changed);
    try { worker.postMessage({ type: 'SKIP_WAITING' }); }
    catch { cleanup(); reject(new Error(PWA.updateError)); }
  });
}

/** Never reload another tab, or reload this one before its edits are persisted. */
export async function updateApp(save: () => Promise<boolean>, reload = () => window.location.reload()): Promise<void> {
  const { waiting, updating } = pwaStore.getState();
  if (!waiting || updating) return;
  pwaStore.setState({ updating: true, error: null });
  try {
    if (!await save()) throw new Error(PWA.saveError);
    await activate(waiting);
    if (!await save()) throw new Error(PWA.saveError);
    reload();
  } catch (error) {
    pwaStore.setState({ error: error instanceof Error ? error.message : PWA.updateError });
  } finally {
    pwaStore.setState({ updating: false });
  }
}
