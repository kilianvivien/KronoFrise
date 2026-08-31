import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissInstall, installApp, pwaStore, startInstallPrompt, updateApp, watchForUpdates } from './prompts';
import { PWA } from '../ui/strings';

function environment({ standalone = false, ua = 'Chrome/140 Safari/537.36', saved = new Map<string, string>() } = {}) {
  const windowEvents = new EventTarget();
  const documentEvents = new EventTarget();
  const workerEvents = new EventTarget();
  const media = Object.assign(new EventTarget(), { matches: standalone });
  const worker = Object.assign(new EventTarget(), { state: 'installed', postMessage: vi.fn() });
  const serviceWorker = Object.assign(workerEvents, { controller: {} as ServiceWorker | null });
  vi.stubGlobal('navigator', { userAgent: ua, maxTouchPoints: 0, serviceWorker });
  vi.stubGlobal('document', Object.assign(documentEvents, { visibilityState: 'visible' }));
  vi.stubGlobal('window', Object.assign(windowEvents, {
    matchMedia: () => media,
    localStorage: { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) },
  }));
  return { windowEvents, documentEvents, serviceWorker, worker: worker as unknown as ServiceWorker, postMessage: worker.postMessage, saved };
}
const cleanup: (() => void)[] = [];
beforeEach(() => { pwaStore.setState(pwaStore.getInitialState(), true); });
afterEach(() => { cleanup.splice(0).forEach((stop) => stop()); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('installation prompts', () => {
  it('waits for browser eligibility and consumes the prompt once on an explicit click', async () => {
    const { windowEvents } = environment();
    cleanup.push(startInstallPrompt());
    expect(pwaStore.getState().installMethod).toBeNull();
    const prompt = vi.fn(() => Promise.resolve());
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) });
    windowEvents.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(pwaStore.getState().installMethod).toBe('native');
    expect(prompt).not.toHaveBeenCalled();
    await installApp();
    await installApp();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(pwaStore.getState().installMethod).toBeNull();
  });

  it('hides installed apps and remembers a dismissal across launches', () => {
    const saved = new Map<string, string>();
    environment({ saved });
    const stop = startInstallPrompt();
    dismissInstall();
    stop();
    environment({ saved });
    cleanup.push(startInstallPrompt());
    expect(pwaStore.getState().installDismissed).toBe(true);
    const { windowEvents } = environment({ standalone: true });
    cleanup.push(startInstallPrompt());
    windowEvents.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true }));
    expect(pwaStore.getState().installMethod).toBeNull();
  });

  it('handles browser dismissal, external installation, and restricted storage', async () => {
    const { windowEvents } = environment();
    window.localStorage.setItem = () => { throw new Error('blocked'); };
    window.localStorage.getItem = () => { throw new Error('blocked'); };
    cleanup.push(startInstallPrompt());
    windowEvents.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), {
      prompt: () => Promise.resolve(), userChoice: Promise.resolve({ outcome: 'dismissed' }),
    }));
    await installApp();
    expect(pwaStore.getState().installDismissed).toBe(true);
    windowEvents.dispatchEvent(new Event('appinstalled'));
    expect(pwaStore.getState().installMethod).toBeNull();
  });

  it('offers manual Safari instructions, but does not advertise a broken install button on unsupported browsers', () => {
    environment({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15' });
    cleanup.push(startInstallPrompt());
    expect(pwaStore.getState().installMethod).toBe('safari');
    environment({ ua: 'Mozilla/5.0 (iPhone) Version/18.0 Mobile/15 Safari/604.1' });
    cleanup.push(startInstallPrompt());
    expect(pwaStore.getState().installMethod).toBe('ios');
    environment({ ua: 'Mozilla/5.0 Firefox/140' });
    cleanup.push(startInstallPrompt());
    expect(pwaStore.getState().installMethod).toBeNull();
  });
});

describe('updates', () => {
  it('finds already waiting and newly downloaded versions, checks on return, and ignores first installation', () => {
    const { worker, serviceWorker, documentEvents } = environment();
    const registration = Object.assign(new EventTarget(), { waiting: worker, installing: null as ServiceWorker | null, update: vi.fn(() => Promise.resolve()) });
    serviceWorker.controller = null;
    cleanup.push(watchForUpdates(registration as unknown as ServiceWorkerRegistration));
    expect(pwaStore.getState().waiting).toBeNull();
    serviceWorker.controller = {} as ServiceWorker;
    registration.installing = worker;
    registration.dispatchEvent(new Event('updatefound'));
    worker.dispatchEvent(new Event('statechange'));
    expect(pwaStore.getState().waiting).toBe(worker);
    documentEvents.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalledOnce();
    pwaStore.setState({ waiting: null });
    cleanup.push(watchForUpdates(registration as unknown as ServiceWorkerRegistration));
    expect(pwaStore.getState().waiting).toBe(worker);
  });

  it('does not activate or reload when saving fails', async () => {
    const { worker, postMessage } = environment();
    pwaStore.setState({ waiting: worker });
    const reload = vi.fn();
    await updateApp(() => Promise.resolve(false), reload);
    expect(postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(pwaStore.getState().error).toBe(PWA.saveError);
  });

  it('saves, waits for the chosen worker, then rechecks saving before a single reload', async () => {
    const { worker, postMessage, serviceWorker } = environment();
    pwaStore.setState({ waiting: worker });
    const save = vi.fn(() => Promise.resolve(true)), reload = vi.fn();
    const pending = updateApp(save, reload);
    await Promise.resolve();
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
    await updateApp(save, reload); // Ignore double clicks while the activation is pending.
    serviceWorker.controller = worker;
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    await pending;
    expect(save).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledOnce();
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('keeps edits when the final save fails, including a version activated by another tab', async () => {
    const { worker, serviceWorker, postMessage } = environment();
    serviceWorker.controller = worker;
    pwaStore.setState({ waiting: worker });
    const save = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const reload = vi.fn();
    await updateApp(save, reload);
    expect(postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(pwaStore.getState().error).toBe(PWA.saveError);
  });

  it('times out recoverably without reloading later on an unrelated controller change', async () => {
    vi.useFakeTimers();
    const { worker, serviceWorker } = environment();
    pwaStore.setState({ waiting: worker });
    const reload = vi.fn();
    const pending = updateApp(() => Promise.resolve(true), reload);
    await vi.advanceTimersByTimeAsync(15000);
    await pending;
    expect(pwaStore.getState().updating).toBe(false);
    expect(pwaStore.getState().error).toBe(PWA.updateError);
    serviceWorker.controller = worker;
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
  });
});
