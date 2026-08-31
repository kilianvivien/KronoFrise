import { mkdirSync, writeFileSync } from 'node:fs';
import { FIXTURES } from '../src/core/fixtures';
import { exportPdf } from '../src/export/pdf';
import { exportSvg } from '../src/export/render';
import { exportHtml } from '../src/export/html';

const out = process.argv[2] ?? 'dist/samples';
mkdirSync(out, { recursive: true });
for (const { file, document } of FIXTURES) {
  const name = file.replace('.krono', '');
  writeFileSync(`${out}/${name}.pdf`, await exportPdf(document, { size: 'a4', orientation: 'landscape', wall: false }));
  writeFileSync(`${out}/${name}-mural.pdf`, await exportPdf(document, { size: 'a4', orientation: 'landscape', wall: true, pages: 3 }));
  writeFileSync(`${out}/${name}.svg`, await exportSvg(document, { width: 1600 }));
  writeFileSync(`${out}/${name}.html`, await exportHtml(document, { width: 1200 }));
  console.log('écrit', name);
}
