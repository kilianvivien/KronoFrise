/**
 * Export PDF — la règle de fidélité (docs/format.md §9) : le PDF sort de la
 * même scène que l'écran, avec du vrai texte et zéro capture d'image.
 */
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { apply } from '../core/commands';
import { antiquite, grandesPeriodes, revolution } from '../core/fixtures/index';
import { maskAll } from '../core/pedagogy';
import { exportPdf } from './pdf';
import { roundedRectPath, toPdfText, translatePath } from './pdfScene';
import { pageDimensions } from './paper';
import { GRADIENT_BANDS, gradientLayers } from '../renderer/shapes';
import { inflateSync } from 'node:zlib';

/**
 * Texte réellement présent dans le PDF.
 *
 * Depuis l'incorporation d'Inter (M4, ajout 2), les libellés ne sont plus des
 * octets WinAnsi lisibles à l'œil dans le flux : une police en sous-ensemble
 * s'écrit avec ses propres codes de glyphes. C'est justement ce qui rend le
 * texte *toujours* du texte pour un lecteur de PDF — la table `ToUnicode` que
 * pdf-lib écrit à côté rend chaque code à son caractère.
 *
 * Le test emprunte donc le même chemin qu'un lecteur : il lit la table, puis
 * décode les chaînes. Sans cela, on ne vérifierait plus rien.
 */
function streamsOf(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString('latin1');
  let content = '';
  const streams = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streams.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const chunk = Buffer.from(raw.slice(start, raw.indexOf('endstream', start)), 'latin1');
    try { content += inflateSync(chunk).toString('latin1'); } catch { /* flux non compressé ou image */ }
  }
  return content;
}

/**
 * Les tables `ToUnicode` du document, **une par police**.
 *
 * Les deux polices incorporées (normale et demi-grasse) numérotent leurs
 * glyphes à partir de 1 chacune : fondre leurs tables ferait lire « POLITIQUE »
 * là où le PDF dit « Avènement ». On les garde donc séparées et l'on décode
 * chaque chaîne sous chacune ; un libellé français ne se reconstitue que sous
 * la bonne, une mauvaise table ne produisant que du charabia.
 */
function toUnicodeMaps(content: string): Map<number, string>[] {
  const decode = (hex: string): string =>
    (hex.match(/.{4}/g) ?? []).map((unit) => String.fromCharCode(Number.parseInt(unit, 16))).join('');
  return [...content.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)].map(([, body]) => {
    const map = new Map<number, string>();
    for (const [, code, value] of (body as string).matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(Number.parseInt(code!, 16), decode(value!));
    }
    return map;
  });
}

function pdfText(bytes: Uint8Array): string[] {
  const content = streamsOf(bytes);
  const maps = toUnicodeMaps(content);
  expect(maps.length).toBeGreaterThan(0);
  const codes = [...content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)]
    .map(([, hex]) => ((hex as string).match(/.{4}/g) ?? []).map((unit) => Number.parseInt(unit, 16)));
  return maps.flatMap((map) => codes.map((sequence) => sequence.map((code) => map.get(code) ?? '\uFFFD').join('')));
}

const A4 = { size: 'a4', orientation: 'landscape', wall: false } as const;

async function pagesOf(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages();
}

describe('export PDF', () => {
  it('produit une page A4 paysage pour chaque fixture', async () => {
    for (const doc of [revolution, antiquite, grandesPeriodes]) {
      const pages = await pagesOf(await exportPdf(doc, A4));
      expect(pages).toHaveLength(1);
      const { width, height } = pageDimensions('a4', 'landscape');
      expect(pages[0]!.getWidth()).toBeCloseTo(width, 1);
      expect(pages[0]!.getHeight()).toBeCloseTo(height, 1);
    }
  }, 20_000);

  it('écrit du vrai texte, pas des contours', async () => {
    const pdf = await PDFDocument.load(await exportPdf(revolution, A4));
    const objects = pdf.context.enumerateIndirectObjects().map(([, object]) => String(object));
    // Les libellés passent par une police incorporée : ils restent du texte
    // sélectionnable, jamais des tracés (docs/format.md §9). `FontFile2` est
    // le fichier de police lui-même, embarqué dans le PDF — pas une des 14
    // polices standard, qui n'auraient pas l'exposant ordinal.
    expect(objects.some((object) => object.includes('/FontFile2'))).toBe(true);
    expect(objects.some((object) => object.includes('Inter'))).toBe(true);
    expect(objects.some((object) => object.includes('Helvetica'))).toBe(false);
    // Les seules images du PDF sont celles des événements : la frise elle-même
    // n'est jamais une capture d'écran.
    const images = objects.filter((object) => object.includes('/Subtype /Image')).length;
    expect(images).toBe(revolution.items.filter((item) => item.image !== undefined).length);
    const withoutImages = await PDFDocument.load(await exportPdf(antiquite, A4));
    expect(withoutImages.context.enumerateIndirectObjects()
      .some(([, object]) => String(object).includes('/Subtype /Image'))).toBe(false);
  });

  it('écrit chaque libellé du document, accents et apostrophes compris', async () => {
    const strings = pdfText(await exportPdf(revolution, A4));
    for (const item of revolution.items) {
      expect(strings.some((value) => value.includes(item.label))).toBe(true);
    }
    expect(strings.some((value) => value.includes('’'))).toBe(true);
  });

  it('découpe une frise murale en pages numérotées', async () => {
    const bytes = await exportPdf(revolution, { ...A4, wall: true, pages: 4 });
    const pages = await pagesOf(bytes);
    expect(pages).toHaveLength(4);
  }, 20_000);

  it('conserve le titre et l’auteur du document', async () => {
    const doc = { ...revolution, meta: { ...revolution.meta, author: 'Kilian' } };
    const pdf = await PDFDocument.load(await exportPdf(doc, A4));
    expect(pdf.getTitle()).toBe(revolution.meta.title);
    expect(pdf.getAuthor()).toBe('Kilian');
  });

  it('exporte la fiche élève masquée, et le corrigé sans masques', async () => {
    const masked = apply(revolution, maskAll(revolution, 'both'));
    const worksheet = await exportPdf(masked, { ...A4, worksheet: true });
    const key = await exportPdf(masked, A4);
    expect(worksheet.byteLength).toBeGreaterThan(0);
    // Le corrigé porte tous les libellés : il est plus lourd en texte.
    expect(key.byteLength).toBeGreaterThan(worksheet.byteLength);
  }, 20_000);

  it('imprime « XVIIᵉ siècle » avec son exposant, dans le PDF réel', async () => {
    // Le point de tout l'ajout 2 : les 14 polices standard sont en WinAnsi et
    // n'ont pas U+1D49, si bien que la règle s'imprimait « XVIIe ». On lit ici
    // le vrai flux du PDF, décodé comme le ferait un lecteur.
    const strings = pdfText(await exportPdf(grandesPeriodes, A4));
    const ordinals = strings.filter((value) => value.includes('\u1D49'));
    expect(ordinals.length).toBeGreaterThan(0);
    // Aucun libellé de siècle n'est resté replié sur un « e » ordinaire.
    expect(strings.some((value) => /si[eè]cle/.test(value) && !value.includes('\u1D49'))).toBe(false);
  }, 20_000);

  it('imprime les exposants ordinaux au lieu de les replier', () => {
    // Depuis l'incorporation d'Inter, l'exposant ordinal survit à l'impression.
    expect(toPdfText('XVIIᵉ siècle')).toBe('XVIIᵉ siècle');
    expect(toPdfText('1ᵉʳ janvier')).toBe('1ᵉʳ janvier');
    expect(toPdfText('12\u202F000')).toBe('12\u00A0000');
  });

  it('rend un dégradé en seize bandes, l’écart annoncé par la boîte d’export', async () => {
    // PLAN.md M4 (ajout 3) : le SVG reçoit un vrai `linearGradient`, le PDF
    // n'ayant pas de primitive équivalente l'approche en bandes. La différence
    // est spécifiée — ce test la fige — et annoncée dans la boîte d'export.
    const doc = structuredClone(revolution);
    for (const item of doc.items) if (item.kind === 'period') item.fillStyle = 'gradient';
    // Une accolade n'a aucune surface fermée : elle ne reçoit pas de dégradé.
    const filled = doc.items.filter((item) => item.kind === 'period' && item.shape !== 'bracket').length;
    expect(filled).toBeGreaterThan(0);

    const bytes = await exportPdf(doc, A4);
    const content = streamsOf(bytes);
    // Chaque couche est un remplissage de couleur : on compte les opérateurs
    // `rg` (couleur non tracée) et on vérifie qu'il y en a au moins seize par
    // période dégradée de plus qu'avec un remplissage uni.
    const plain = streamsOf(await exportPdf(revolution, A4));
    const fills = (text: string) => (text.match(/\brg\b/g) ?? []).length;
    // Chaque période dégradée remplace son unique aplat par seize couches.
    expect(fills(content) - fills(plain)).toBeGreaterThanOrEqual(filled * (GRADIENT_BANDS - 1));

    // La silhouette reste celle de la forme : la couche du dessous est la
    // vraie barre, pas un rectangle qui déborderait de ses coins.
    const layers = gradientLayers();
    expect(layers[0]!.full).toBe(true);
  }, 20_000);

  it('imprime le bloc de titre, comme le SVG et à la même place', async () => {
    // PLAN.md M4 (ajout 4) : le bloc appartient au SceneGraph, donc « ce qui
    // est exporté est ce qui a été vu ». On le vérifie des deux côtés.
    const doc = structuredClone(revolution);
    doc.meta.author = 'Kilian Vivien';
    doc.titleBlock = { align: 'center', subtitle: 'Chronologie de 1789 à 1799', author: true, date: true };

    const strings = pdfText(await exportPdf(doc, A4));
    expect(strings.some((value) => value.includes(doc.meta.title))).toBe(true);
    expect(strings.some((value) => value.includes('Chronologie de 1789'))).toBe(true);
    expect(strings.some((value) => value.includes('Kilian Vivien'))).toBe(true);

    // Sans bloc, rien de tout cela n'apparaît en dehors des libellés.
    const plain = pdfText(await exportPdf(revolution, A4));
    expect(plain.some((value) => value.includes('Chronologie de 1789'))).toBe(false);
  }, 20_000);

  it('imprime chaque thème avec sa propre typographie', async () => {
    // PLAN.md M4 (ajout 2), seconde facette : « qu'un thème puisse nommer sa
    // typographie, avec le même fichier incorporé dans les exports ». Un
    // Parchemin qui s'imprimerait en grotesque manquerait tout l'objet.
    const parchemin = structuredClone(revolution);
    parchemin.themeId = 'parchemin';
    const objects = async (doc: typeof revolution) =>
      (await PDFDocument.load(await exportPdf(doc, A4))).context
        .enumerateIndirectObjects().map(([, object]) => String(object));

    const serif = await objects(parchemin);
    expect(serif.some((object) => object.includes('Garamond'))).toBe(true);
    expect(serif.some((object) => object.includes('/FontFile2'))).toBe(true);

    // Le thème par défaut garde Inter, la remplaçante de la fonte du système.
    const sans = await objects(revolution);
    expect(sans.some((object) => object.includes('Inter'))).toBe(true);
    expect(sans.some((object) => object.includes('Garamond'))).toBe(false);
  }, 20_000);

  it('remplace ce que la fonte manuscrite ne porte pas, au lieu d’un carré vide', async () => {
    // Caveat n'a ni « ᵉ » ni l'espace fine insécable : sans remplacement, le
    // PDF échouerait à l'encodage ou afficherait un glyphe manquant.
    const craie = structuredClone(grandesPeriodes);
    craie.themeId = 'craie';
    const strings = pdfText(await exportPdf(craie, A4));
    expect(strings.length).toBeGreaterThan(0);
    expect(strings.some((value) => value.includes('\u1D49'))).toBe(false);
    expect(strings.some((value) => value.includes('\u202F'))).toBe(false);
    // Le texte reste lisible, pas amputé.
    expect(strings.some((value) => /si[eè]cle/.test(value))).toBe(true);
  }, 20_000);

  it('décale une tuile de motif sans la déformer', () => {
    expect(translatePath('M0 4H8', 10, 20)).toBe('M 10 24H 18');
    expect(roundedRectPath(0, 0, 10, 10, 0)).toContain('M 0 0');
    expect(roundedRectPath(0, 0, 10, 10, 4)).toContain('A 4 4');
  });
});

describe('fiche élève imprimée', () => {
  it('ajoute le corrigé à la suite, dans le même fichier', async () => {
    const masked = apply(revolution, maskAll(revolution, 'label'));
    const plain = await PDFDocument.load(await exportPdf(masked, { ...A4, worksheet: true }));
    const withKey = await PDFDocument.load(await exportPdf(masked, { ...A4, worksheet: true, answerKey: true }));
    expect(withKey.getPageCount()).toBe(plain.getPageCount() * 2);
  }, 20_000);

  it('n’ajoute pas de corrigé hors du mode fiche élève', async () => {
    const pdf = await PDFDocument.load(await exportPdf(revolution, { ...A4, answerKey: true }));
    expect(pdf.getPageCount()).toBe(1);
  });
});
