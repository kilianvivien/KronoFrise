import { afterEach, expect, it, vi } from 'vitest';
import { appearanceStore, chooseAppearance, startAppearance } from './appearance';

function environment(saved: string | null = null) {
  const dataset: Record<string, string> = {};
  const media = { matches: true, addEventListener: vi.fn<(type: string, listener: () => void) => void>(), removeEventListener: vi.fn() };
  const storage = { getItem: vi.fn(() => saved), setItem: vi.fn() };
  const listeners = new Map<string, (event?: unknown) => void>();
  vi.stubGlobal('document', { documentElement: { dataset } });
  vi.stubGlobal('window', { matchMedia: () => media, localStorage: storage,
    addEventListener: (type: string, callback: (event?: unknown) => void) => listeners.set(type, callback), removeEventListener: (type: string) => listeners.delete(type) });
  return { dataset, media, storage, listeners };
}
afterEach(() => { vi.unstubAllGlobals(); appearanceStore.setState({ preference: 'terracotta', scheme: 'light', saved: true }); });
it('restores an explicit choice even when the OS prefers dark; subsequent system changes only affect adaptive choices', () => {
  const { dataset, media, storage } = environment('light');
  const stop = startAppearance();
  expect(dataset).toEqual({ uiTheme: 'light', uiScheme: 'light' });
  chooseAppearance('dark'); expect(dataset.uiScheme).toBe('dark');
  expect(storage.setItem).toHaveBeenCalledWith('kronofrise:appearance', 'dark');
  media.matches = false; media.addEventListener.mock.calls[0]![1]();
  expect(dataset.uiScheme).toBe('dark');
  chooseAppearance('system'); expect(dataset.uiScheme).toBe('light');
  media.matches = true; media.addEventListener.mock.calls[0]![1]();
  expect(dataset.uiScheme).toBe('dark');
  stop(); expect(media.removeEventListener).toHaveBeenCalled();
});
it('falls back on invalid saved values and synchronizes changes from another tab', () => {
  const { dataset, listeners } = environment('invalid');
  const stop = startAppearance();
  expect(dataset).toEqual({ uiTheme: 'terracotta', uiScheme: 'dark' });
  listeners.get('storage')!({ key: 'kronofrise:appearance', newValue: 'light' });
  expect(dataset.uiScheme).toBe('light');
  listeners.get('storage')!({ key: null, newValue: null });
  expect(dataset.uiTheme).toBe('terracotta');
  stop(); expect(listeners.size).toBe(0);
});
it('keeps the editor usable when preference storage is blocked', () => {
  const { storage, dataset } = environment();
  storage.getItem.mockImplementation(() => { throw new Error('blocked'); });
  storage.setItem.mockImplementation(() => { throw new Error('blocked'); });
  const stop = startAppearance();
  chooseAppearance('light');
  expect(dataset.uiScheme).toBe('light'); expect(appearanceStore.getState().saved).toBe(false);
  stop();
});
