/**
 * Bloc de titre du document — PLAN.md M4 (ajout 4).
 *
 * Il ne calcule rien : toute la géométrie vient du `SceneGraph`
 * (`layout/layout.ts`), si bien que le PDF pose son texte aux mêmes lignes de
 * base. C'est ce qui fait d'un PNG exporté un document fini plutôt qu'un
 * schéma flottant.
 */
import type { JSX } from 'react';
import type { SceneTitle } from '../layout/scene';
import { titleMetaStyle, titleStyle, titleSubtitleStyle } from './style';

export function TitleBlock({ title }: { title: SceneTitle }): JSX.Element {
  return (
    <g>
      <text x={title.x} y={title.titleY} style={{ ...titleStyle, textAnchor: title.anchor }}>
        {title.title}
      </text>
      {title.subtitle !== undefined && title.subtitleY !== undefined && (
        <text x={title.x} y={title.subtitleY} style={{ ...titleSubtitleStyle, textAnchor: title.anchor }}>
          {title.subtitle}
        </text>
      )}
      {title.meta !== undefined && title.metaY !== undefined && (
        <text x={title.x} y={title.metaY} style={{ ...titleMetaStyle, textAnchor: title.anchor }}>
          {title.meta}
        </text>
      )}
    </g>
  );
}
