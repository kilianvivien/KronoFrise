import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadServiceWorker, response } from './swHarness';

const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8')) as {
  theme_color: string; background_color: string; icons: { src: string }[];
  start_url: string; scope: string; file_handlers: { accept: Record<string, string[]> }[];
};
const tokens = readFileSync('src/ui/tokens.css', 'utf8');
const sw = readFileSync('src/pwa/sw.js', 'utf8');

function token(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(tokens);
  if (!match) throw new Error(`Jeton absent de tokens.css : ${name}`);
  return match[1]!.toUpperCase();
}

describe('manifeste de l’application installable', () => {
  it('reprend les couleurs de tokens.css, jamais un hexadécimal choisi à part', () => {
    // DESIGN.md §1.2 : aucun hexadécimal hors tokens.css / palette.ts. Le
    // manifeste est du JSON, donc hors de portée du lint : ce test tient lieu
    // de garde-fou et casse dès que le chrome change de couleur.
    expect(manifest.theme_color.toUpperCase()).toBe(token('--chrome-bg'));
    expect(manifest.background_color.toUpperCase()).toBe(token('--chrome-bg'));
  });
  it('reste relatif, pour fonctionner sous un sous-chemin', () => {
    for (const value of [manifest.start_url, manifest.scope]) expect(value.startsWith('/')).toBe(false);
    for (const icon of manifest.icons) expect(icon.src.startsWith('/')).toBe(false);
  });
  it('déclare l’extension .krono comme document pris en charge', () => {
    const extensions = manifest.file_handlers.flatMap((handler) => Object.values(handler.accept).flat());
    expect(extensions).toContain('.krono');
  });
});

describe('service worker', () => {
  const PRECACHE = ['./', 'site.webmanifest', 'assets/index-abc.js', 'assets/pdf-def.js'];
  const network = () => ({
    'http://localhost:4173/': response('<!doctype html>index'),
    'http://localhost:4173/site.webmanifest': response('{}'),
    'http://localhost:4173/assets/index-abc.js': response('app'),
    'http://localhost:4173/assets/pdf-def.js': response('pdf'),
    'http://localhost:4173/assets/tard.js': response('chargé plus tard'),
  });

  it('précharge tout, y compris le morceau d’export chargé paresseusement', async () => {
    // Le point de la liste injectée à la construction : sans elle, un
    // enseignant hors ligne qui n'a jamais exporté n'aurait pas le morceau PDF.
    const sw = loadServiceWorker({ precache: PRECACHE, network: network() });
    await sw.install();
    expect(sw.cached()).toContain('http://localhost:4173/assets/pdf-def.js');
    expect(sw.cached()).toHaveLength(PRECACHE.length);
  });

  it('sert l’application entière sans réseau une fois installée', async () => {
    const sw = loadServiceWorker({ precache: PRECACHE, network: network() });
    await sw.install();
    await sw.activate();
    sw.goOffline();
    const appels = sw.networkCalls.length;
    for (const path of ['/assets/index-abc.js', '/assets/pdf-def.js', '/site.webmanifest']) {
      const served = await sw.handle({ method: 'GET', url: `http://localhost:4173${path}` });
      expect(served?.ok).toBe(true);
    }
    // Rien n'est reparti sur le réseau : c'est cela, « hors ligne ».
    expect(sw.networkCalls.length).toBe(appels);
  });

  it('replie une navigation sur la page en cache quand le réseau tombe', async () => {
    const sw = loadServiceWorker({ precache: PRECACHE, network: network() });
    await sw.install();
    await sw.activate();
    sw.goOffline();
    // C'est le scénario réel : la salle de classe sans wifi, l'onglet rouvert.
    const served = await sw.handle({ method: 'GET', url: 'http://localhost:4173/', mode: 'navigate' });
    expect(served?.body).toContain('index');
  });

  it('laisse passer ce qui ne lui appartient pas', async () => {
    const sw = loadServiceWorker({ precache: PRECACHE, network: network() });
    await sw.install();
    // Un enregistrement (POST) et une origine tierce ne sont jamais interceptés.
    expect(await sw.handle({ method: 'POST', url: 'http://localhost:4173/' })).toBeNull();
    expect(await sw.handle({ method: 'GET', url: 'https://example.org/pixel.png' })).toBeNull();
  });

  it('met en cache ce qu’il découvre, mais jamais une erreur', async () => {
    const sw = loadServiceWorker({
      precache: PRECACHE,
      network: { ...network(), 'http://localhost:4173/absent.js': response('404', { ok: false }) },
    });
    await sw.install();
    await sw.handle({ method: 'GET', url: 'http://localhost:4173/assets/tard.js' });
    expect(sw.cached()).toContain('http://localhost:4173/assets/tard.js');
    await sw.handle({ method: 'GET', url: 'http://localhost:4173/absent.js' });
    // Un 404 mis en cache survivrait à la panne qui l'a produit.
    expect(sw.cached()).not.toContain('http://localhost:4173/absent.js');
  });

  it('efface les caches des versions précédentes en s’activant', async () => {
    const ancien = loadServiceWorker({ precache: PRECACHE, version: 'v1', network: network() });
    await ancien.install();
    expect(ancien.cacheNames()).toEqual(['kronofrise-v1']);
    await ancien.activate();
    expect(ancien.claimed).toBe(true);
  });

  it('ne prend jamais la main sous une page ouverte', () => {
    // `skipWaiting` échangerait les fichiers pendant l'exécution et casserait
    // le chargement paresseux du morceau d'export PDF.
    expect(sw).not.toMatch(/(self\.)?skipWaiting\s*\(/);
  });

  it('porte les marqueurs que la construction remplace', () => {
    expect(sw).toContain('__VERSION__');
    expect(sw).toContain('__PRECACHE__');
    const config = readFileSync('vite.config.ts', 'utf8');
    expect(config).toContain("replace('__VERSION__'");
    expect(config).toContain("replace('__PRECACHE__'");
  });
});
