/**
 * Banc d'essai du service worker.
 *
 * Le service worker ne s'enregistre pas dans l'environnement d'automatisation
 * (le navigateur intégré intercepte la requête du script), et le vérifier « à
 * la main » n'est pas reproductible. On charge donc `sw.js` — le fichier réel,
 * avec la substitution que fait la construction — dans un contexte muni de
 * globales de worker, puis on déclenche ses événements. Ce sont ses vraies
 * décisions qui sont testées, pas un texte qui les décrirait.
 */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const ORIGIN = 'http://localhost:4173';
const absolute = (url: string): string => new URL(url, `${ORIGIN}/`).href;

export interface FakeRequest {
  method: string;
  url: string;
  mode?: 'navigate' | 'cors' | 'no-cors';
}
export interface FakeResponse {
  ok: boolean;
  type?: string;
  body: string;
  clone(): FakeResponse;
}

export function response(body: string, { ok = true, type = 'basic' } = {}): FakeResponse {
  const value: FakeResponse = { ok, type, body, clone: () => response(body, { ok, type }) };
  return value;
}

class Cache {
  readonly store = new Map<string, FakeResponse>();
  constructor(private readonly network: (url: string) => Promise<FakeResponse>) {}
  async addAll(urls: string[]): Promise<void> {
    for (const url of urls) {
      const hit = await this.network(absolute(url));
      if (!hit.ok) throw new Error(`addAll a échoué pour ${url}`);
      this.store.set(absolute(url), hit);
    }
  }
  put(request: FakeRequest | string, value: FakeResponse): Promise<void> {
    this.store.set(absolute(typeof request === 'string' ? request : request.url), value);
    return Promise.resolve();
  }
  match(request: FakeRequest | string): Promise<FakeResponse | undefined> {
    return Promise.resolve(this.store.get(absolute(typeof request === 'string' ? request : request.url)));
  }
  keys(): Promise<{ url: string }[]> {
    return Promise.resolve([...this.store.keys()].map((url) => ({ url })));
  }
}

export interface Harness {
  install(): Promise<void>;
  activate(): Promise<void>;
  message(data: unknown): Promise<void>;
  skippedWaiting: boolean;
  /** renvoie la réponse servie, et `null` si le worker laisse passer la requête */
  handle(request: FakeRequest): Promise<FakeResponse | null>;
  cacheNames(): string[];
  cached(): string[];
  /** requêtes réellement parties sur le réseau */
  networkCalls: string[];
  claimed: boolean;
  /** coupe le réseau, pour éprouver le mode hors ligne */
  goOffline(): void;
}

export function loadServiceWorker(options: {
  precache: string[];
  version?: string;
  /** contenu servi par le réseau ; absent = panne réseau */
  network?: Record<string, FakeResponse>;
  initialCaches?: Record<string, Record<string, FakeResponse>>;
  openWindows?: number;
}): Harness {
  const caches = new Map<string, Cache>();
  const networkCalls: string[] = [];
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const state = { claimed: false, offline: false, skippedWaiting: false };

  // Le worker appelle `fetch` tantôt avec une URL (préchargement) tantôt avec
  // une requête (interception) : le banc accepte les deux, comme le navigateur.
  const network = (target: FakeRequest | string): Promise<FakeResponse> => {
    const url = absolute(typeof target === 'string' ? target : target.url);
    networkCalls.push(url);
    if (state.offline) return Promise.reject(new Error('réseau indisponible'));
    const hit = options.network?.[url];
    return hit ? Promise.resolve(hit) : Promise.reject(new Error('réseau indisponible'));
  };

  for (const [name, entries] of Object.entries(options.initialCaches ?? {})) {
    const cache = new Cache(network);
    for (const [url, value] of Object.entries(entries)) cache.store.set(absolute(url), value);
    caches.set(name, cache);
  }

  const cacheStorage = {
    open: (name: string): Promise<Cache> => {
      const existing = caches.get(name) ?? new Cache(network);
      caches.set(name, existing);
      return Promise.resolve(existing);
    },
    keys: (): Promise<string[]> => Promise.resolve([...caches.keys()]),
    delete: (name: string): Promise<boolean> => Promise.resolve(caches.delete(name)),
    match: async (request: FakeRequest | string): Promise<FakeResponse | undefined> => {
      for (const cache of caches.values()) {
        const hit = await cache.match(request);
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const self = {
    addEventListener: (type: string, handler: (event: Record<string, unknown>) => void) => listeners.set(type, handler),
    location: { origin: ORIGIN },
    clients: {
      claim: () => { state.claimed = true; return Promise.resolve(); },
      matchAll: () => Promise.resolve(Array.from({ length: options.openWindows ?? 0 }, () => ({}))),
    },
    skipWaiting: () => { state.skippedWaiting = true; return Promise.resolve(); },
  };

  const source = readFileSync('src/pwa/sw.js', 'utf8')
    .replace('__VERSION__', options.version ?? 'test')
    .replace('__PRECACHE__', JSON.stringify(options.precache));
  runInNewContext(source, { self, caches: cacheStorage, fetch: network, URL, Promise, JSON, console });

  const fire = async (type: string, data?: unknown): Promise<void> => {
    let waited: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({ data, waitUntil: (promise: Promise<unknown>) => { waited = promise; } });
    await waited;
  };

  return {
    install: () => fire('install'),
    activate: () => fire('activate'),
    message: (data) => fire('message', data),
    get skippedWaiting() { return state.skippedWaiting; },
    handle: async (request) => {
      const served: Promise<FakeResponse>[] = [];
      listeners.get('fetch')?.({ request, respondWith: (promise: Promise<FakeResponse>) => { served.push(promise); } });
      // Aucun `respondWith` = le worker laisse la requête suivre son cours.
      return served.length === 0 ? null : await served[0]!;
    },
    cacheNames: () => [...caches.keys()],
    cached: () => [...(caches.values().next().value?.store.keys() ?? [])],
    networkCalls,
    get claimed() { return state.claimed; },
    goOffline: () => { state.offline = true; },
  };
}
