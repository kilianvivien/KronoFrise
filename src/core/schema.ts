/**
 * Validation du format `.krono` — docs/format.md.
 * `parseDocument` est la seule porte d'entrée d'un JSON venu de l'extérieur
 * (fichier, IndexedDB, presse-papiers) ; il refuse en français tout document
 * qui viole un invariant.
 */
import { z } from 'zod';
import { ERRORS } from '../ui/strings';
import { compareDates, daysInMonth } from './dates';
import {
  MAX_SEGMENTS,
  SCHEMA_VERSION,
  YEAR_MAX,
  YEAR_MIN,
  type KronoDocument,
} from './types';

export const kDateSchema = z
  .object({
    year: z.number().int().min(YEAR_MIN).max(YEAR_MAX),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
    circa: z.boolean().optional(),
  })
  .strict()
  .refine((d) => d.day === undefined || d.month !== undefined, {
    message: 'un jour ne peut être donné sans son mois',
  })
  .refine((d) => d.day === undefined || d.day <= daysInMonth(d.year, d.month ?? 1), {
    message: 'ce jour n’existe pas dans ce mois',
  });

export const segmentSchema = z
  .object({
    until: kDateSchema,
    weight: z.number().positive({ message: ERRORS.segmentWeight }).finite(),
  })
  .strict();

export const axisSchema = z
  .object({
    start: kDateSchema,
    end: kDateSchema,
    segments: z.array(segmentSchema).min(1).max(MAX_SEGMENTS, { message: ERRORS.tooManySegments }),
  })
  .strict()
  .superRefine((axis, ctx) => {
    if (compareDates(axis.end, axis.start) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: ERRORS.axisEndBeforeStart, path: ['end'] });
    }
    for (let i = 1; i < axis.segments.length; i++) {
      if (compareDates(axis.segments[i]!.until, axis.segments[i - 1]!.until) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ERRORS.segmentsNotSorted,
          path: ['segments', i, 'until'],
        });
      }
    }
    const last = axis.segments[axis.segments.length - 1];
    if (last !== undefined && compareDates(last.until, axis.end) !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ERRORS.lastSegmentMismatch,
        path: ['segments', axis.segments.length - 1, 'until'],
      });
    }
  });

export const laneSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    collapsed: z.boolean().optional(),
  })
  .strict();

const itemBaseShape = {
  id: z.string().min(1),
  laneId: z.string().min(1),
  label: z.string(),
  description: z.string().optional(),
  color: z.string().min(1),
  image: z.object({ src: z.string().min(1) }).strict().optional(),
  pinnedRow: z.number().int().min(0).optional(),
};

export const eventItemSchema = z
  .object({ ...itemBaseShape, kind: z.literal('event'), date: kDateSchema })
  .strict();

const periodItemObject = z
  .object({
    ...itemBaseShape,
    kind: z.literal('period'),
    start: kDateSchema,
    end: kDateSchema,
    shape: z.enum(['bar', 'bracket', 'arrow']).default('bar'),
    fuzzyStart: z.boolean().optional(),
    fuzzyEnd: z.boolean().optional(),
  })
  .strict();

export const periodItemSchema = periodItemObject.refine(
  (p) => compareDates(p.start, p.end) < 0,
  { message: ERRORS.periodEndBeforeStart },
);

// `discriminatedUnion` exige des objets non raffinés : l'invariant start < end
// est donc revérifié dans le `superRefine` du document.
export const itemSchema = z.discriminatedUnion('kind', [eventItemSchema, periodItemObject]);

export const pedagogySchema = z
  .object({
    maskedItems: z
      .array(
        z
          .object({ itemId: z.string().min(1), hide: z.enum(['label', 'date', 'both']) })
          .strict(),
      )
      .default([]),
  })
  .strict();

export const documentSchema = z
  .object({
    schema: z.literal(SCHEMA_VERSION),
    id: z.string().min(1),
    meta: z
      .object({
        title: z.string(),
        author: z.string().optional(),
        createdAt: z.string().min(1),
        modifiedAt: z.string().min(1),
      })
      .strict(),
    axis: axisSchema,
    themeId: z.string().min(1),
    lanes: z.array(laneSchema).min(1, { message: ERRORS.noLane }),
    items: z.array(itemSchema),
    pedagogy: pedagogySchema,
  })
  .strict()
  .superRefine((doc, ctx) => {
    const laneIds = new Set(doc.lanes.map((lane) => lane.id));
    doc.items.forEach((item, index) => {
      if (!laneIds.has(item.laneId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ERRORS.unknownLane(item.laneId),
          path: ['items', index, 'laneId'],
        });
      }
      if (item.kind === 'period' && compareDates(item.start, item.end) >= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ERRORS.periodEndBeforeStart,
          path: ['items', index, 'end'],
        });
      }
    });
  });

export class KronoParseError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'KronoParseError';
    this.issues = issues;
  }
}

/** Valide un JSON quelconque et retourne un document sûr, ou lève une `KronoParseError`. */
export function parseDocument(json: unknown): KronoDocument {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new KronoParseError(ERRORS.notAKronoFile);
  }
  const schema = (json as { schema?: unknown }).schema;
  if (typeof schema !== 'string') {
    throw new KronoParseError(ERRORS.notAKronoFile);
  }
  if (schema !== SCHEMA_VERSION) {
    // Les versions antérieures passent par core/migrations.ts avant d'arriver ici.
    throw new KronoParseError(ERRORS.unknownSchema(schema));
  }
  const result = documentSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || 'document'} : ${issue.message}`,
    );
    throw new KronoParseError(ERRORS.invalidDocument(issues[0] ?? ''), issues);
  }
  return result.data;
}

/** Variante non levée, pour les chemins où l'erreur est affichée telle quelle. */
export function safeParseDocument(
  json: unknown,
): { ok: true; document: KronoDocument } | { ok: false; error: KronoParseError } {
  try {
    return { ok: true, document: parseDocument(json) };
  } catch (error) {
    if (error instanceof KronoParseError) return { ok: false, error };
    throw error;
  }
}
