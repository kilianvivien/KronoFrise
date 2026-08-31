import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { decodeFile, serializeFile } from '../store/fileIO';
import { renderToSvgString } from '../renderer/renderToSvgString';
import { exportScene } from '../export/render';

it('the downloadable skill example opens, renders, and round-trips as an editable native document', () => {
  const skill = readFileSync('src/agent/kronofrise/SKILL.md', 'utf8');
  const example = /```json\n([\s\S]*?)\n```/.exec(skill)?.[1];
  expect(example).toBeDefined();
  const document = decodeFile(example!);
  expect(document.items.map((item) => item.kind)).toEqual(['event', 'period']);
  const reopened = decodeFile(serializeFile(document));
  expect(reopened.items).toEqual(document.items);
  expect(renderToSvgString({ scene: exportScene(reopened, { width: 1200 }), title: reopened.meta.title })).toContain('Prise de la Bastille');
});
