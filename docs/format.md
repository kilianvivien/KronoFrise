# The `.krono` format — v1 specification

**Audience: the implementing agent.** This is the contract for `src/core`. Implement it as TypeScript types + a zod schema (`parseDocument(json): Document`) that rejects anything violating the invariants below with a French error message. All app state that survives a reload lives in this document; UI state (selection, zoom, panel visibility) does **not**.

A `.krono` file is UTF-8 JSON, this document serialized directly. Extension `.krono`, MIME `application/json`.

## 1. Dates

```ts
/** Astronomical year: 1 = AD 1, 0 = 1 BC, -1 = 2 BC, ... */
type Year = number;          // integer, range [-10_000_000, 10_000]

interface KDate {
  year: Year;
  month?: number;            // 1–12; only if precision allows
  day?: number;              // 1–31; requires month
  circa?: boolean;           // renders "v. 800"; default false
}
```

Invariants & rules:

- `year` is an integer. **Astronomical convention**: historical "52 av. J.-C." is stored as `year: -51`. The UI layer converts: display year for `year <= 0` is `1 - year` + " av. J.-C.". This conversion exists in exactly one function, `formatYear()` in `core/dates.ts`, used by everything (ruler, chips, inspector, exports). Its inverse `parseDateInput()` parses user input: `"1515"`, `"-52"` (meaning 52 av. J.-C. → `year: -51`), `"52 av. J.-C."`, `"v. 800"` (→ circa), `"14/07/1789"`, `"juillet 1789"`.
- Ordering: compare `(year, month ?? 6, day ?? 15)` — missing precision sorts to mid-year/mid-month. Implement `compareDates(a, b)` once in core.
- For pixel math, `toFractionalYear(d: KDate): number` maps to `year + (month-1)/12 + (day-1)/365` (defaults month=1, day=1 when absent — note: *placement* uses start-of-period defaults, *sorting* uses mid defaults; both live in core with tests).

## 2. Document

```ts
interface KronoDocument {
  schema: "krono/1";                 // bump only with a migration in core/migrations.ts
  id: string;                        // uuid v4, stable for the document's life
  meta: {
    title: string;                   // default "Frise sans titre"
    author?: string;
    createdAt: string;               // ISO 8601
    modifiedAt: string;              // ISO 8601, updated on every save
  };
  axis: Axis;
  themeId: string;                   // e.g. "manuel-scolaire" (default)
  titleBlock?: TitleBlock;           // M4; absent = no title drawn on the canvas
  lanes: Lane[];                     // ≥ 1; a new doc has one lane {name: ""}
  items: Item[];
  pedagogy: Pedagogy;
}
```

## 3. Axis & segments (elastic time)

```ts
interface Axis {
  start: KDate;                      // leftmost visible time
  end: KDate;                        // rightmost; must be > start
  segments: Segment[];               // ≥ 1, contiguous, ordered
}

/** The axis is divided into contiguous segments; each takes a share of the width. */
interface Segment {
  until: KDate;                      // segment covers [previous until (or axis.start), until)
                                     // last segment's until MUST equal axis.end
  weight: number;                    // > 0; share of horizontal space = weight / sum(weights)
}
```

- A plain linear axis is exactly one segment: `[{ until: axis.end, weight: 1 }]`.
- Invariants (zod-enforced): segments sorted strictly ascending by `until`; last `until === axis.end`; every `weight > 0`; max 8 segments.
- A "coupure" glyph renders between consecutive segments **only when their pixel-per-year densities differ by more than 1.25×** — two segments dragged to near-equal density merge visually (no glyph) but stay in the data.
- **The mapping is the heart of the app.** In `layout/scale.ts`:

```ts
interface Scale {
  timeToX(t: number /* fractional year */): number;  // px, within [0, width]
  xToTime(x: number): number;
  visibleTicks(zoomLevel): Tick[];
}
makeScale(axis: Axis, widthPx: number, pan: number, zoom: number): Scale
```

Within a segment the mapping is linear. Across segments it is piecewise linear and **strictly monotonic**. Property tests required: monotonicity; `xToTime(timeToX(t)) ≈ t` (ε = 1e-6); segment boundaries map to exact pixel boundaries; degenerate cases (1 segment, 8 segments, segment of 1 year next to one of 1M years).

## 4. Lanes & items

M2 adds optional `Lane.color` to `krono/1`. Existing documents remain valid;
older strict M0/M1 readers do not accept this new optional property. Lane
color is independent of item colors. Collapsed bands retain all their items.

The post-M2 fill extension adds optional `ItemBase.fillStyle` to `krono/1`.
Old files keep their original tinted appearance. Older strict readers cannot
read files carrying this new field. Brackets retain the setting but have no
filled surface; it becomes visible if changed to a bar or arrow.

M4 adds two more optional properties to `krono/1`, on the same terms — old
files stay valid, older strict readers do not accept the new fields:

- **`fillStyle: 'gradient'`** — a ninth fill. SVG and PNG carry a real
  `linearGradient`; the PDF has no gradient primitive and renders a banded
  approximation of the same geometry (16 layers, `renderer/shapes.ts`). That
  difference is part of the contract, not an accident, and the export dialog
  states it. See docs/spec-gaps.md §13.11.
- **`titleBlock`** — a document-level heading drawn above the frise. It is part
  of the `SceneGraph`, so screen, SVG, PNG and PDF place it identically; its
  height pushes the lanes down rather than overlapping them.

```ts
interface TitleBlock {
  align: 'left' | 'center';
  subtitle?: string;                 // one line, under the title
  author?: boolean;                  // shows meta.author when present
  date?: boolean;                    // shows meta.createdAt, formatted in French
}
```


```ts
interface Lane {
  id: string;
  name: string;                      // "" allowed (unnamed default lane)
  collapsed?: boolean;
  color?: string;                    // M2: palette id or custom hex; absent = neutral band
}

type Item = EventItem | PeriodItem;

interface ItemBase {
  id: string;                        // uuid v4
  laneId: string;                    // must reference an existing lane
  label: string;
  description?: string;              // shown in inspector & presentation mode
  color: string;                     // palette id ("brique") — NOT a hex.
                                     // Custom hex allowed with prefix "#", but the
                                     // picker only offers the 12 palette ids.
  fillStyle?: 'tint' | 'solid' | 'none' | 'hatch' | 'crosshatch' | 'dots' | 'lines' | 'grid'
            | 'gradient';   // M4
                                     // absent = tint; same color, different surface treatment
  image?: { src: string; }           // data URL (embedded) — .krono files are self-contained
  pinnedRow?: number;                // manual stacking override; absent = auto layout
}

interface EventItem extends ItemBase {
  kind: "event";
  date: KDate;
}

interface PeriodItem extends ItemBase {
  kind: "period";
  start: KDate;                      // must be < end
  end: KDate;
  shape: "bar" | "bracket" | "arrow"; // default "bar"
  fuzzyStart?: boolean;              // fades the left edge
  fuzzyEnd?: boolean;
}
```

- Items may lie outside `[axis.start, axis.end]`; they are simply not visible until the axis is extended. Never silently delete or clamp them.
- Deleting a lane moves its items to the first lane (with an undoable command), never deletes items.
- Images: on import, downscale to max 512px on the long edge, JPEG quality 0.85, embed as data URL. Warn (French string) above 300KB per image; hard-cap the document at 20MB.

## 5. Pedagogy

```ts
interface Pedagogy {
  maskedItems: {
    itemId: string;
    hide: "label" | "date" | "both";
  }[];
}
```

Masking never mutates the items — Fiche élève mode is a render flag. The answer key is simply the same document rendered unmasked.

## 6. Commands & undo (core contract)

Every mutation goes through a command object; the UI never touches the document directly.

```ts
interface Command {
  name: string;                        // "moveEvent", "resizePeriod", "setLabel", ...
  apply(doc: KronoDocument): KronoDocument;   // pure, returns a new doc (immer ok)
  invert(before: KronoDocument): Command;     // exact inverse for undo
}
```

- Continuous gestures (dragging) update a *transient preview* in the store and commit **one** command on pointer-up — one drag = one undo step.
- Undo stack cap: 200 entries. The stack is persisted with the autosave snapshot.

## 7. Persistence

- Autosave: full document JSON to IndexedDB (`idb-keyval` is acceptable), debounced 500ms after the last command, keyed by `doc.id`. Also store a rendered PNG thumbnail (400px wide) for the start screen, regenerated at most every 30s.
- Open/save as file: File System Access API when `window.showSaveFilePicker` exists; otherwise fallback to `<a download>` / `<input type="file">`. Both paths live behind one `fileIO.ts` interface so the Tauri build swaps in native dialogs later.

## 8. Importers (`core/importers/`)

### 8.1 MiCetF (`micetf.ts`)

micetf.fr/frise "Exporter" produces JSON with (verify against a real export before implementing — download one and commit it as a test fixture):
- global bounds (min/max year) → `axis.start/end`, one segment, weight 1;
- a list of events `{date, name, couleur}` → `EventItem` (map the French color name to the nearest of our 12 palette ids by RGB distance; keep a fixed 50→12 mapping table in code, not computed at runtime);
- a list of periods `{debut, fin, name, couleur}` → `PeriodItem` bars.

All imported items go to a single unnamed lane. Title: "Frise importée". Any unrecognized field is ignored, never fatal; if required fields are missing, fail with the French error string from DESIGN.md §9.

### 8.2 CSV / clipboard (`csv.ts`)

Accept `;`, `,`, or tab as separator (auto-detect on the first line). Columns by header (case/accent-insensitive): `date` (or `début`/`debut`), `fin` (optional), `libellé`/`titre`/`nom`, `description` (optional), `couleur` (optional palette name). A row with `fin` becomes a period; without, an event. Dates go through `parseDateInput()` — so `v. 800`, `-52`, `XVIe siècle` (→ `year: 1501, circa: true`) all work. Rows that fail to parse are collected and reported ("3 lignes ignorées : …"), never abort the whole import.

## 9. Exports — the fidelity rule

Every export (SVG, PNG, PDF) is produced by the **same** pipeline as the screen: `layout(document, exportWidth)` → SceneGraph → SVG string. PNG = that SVG rasterized in an offscreen canvas at 1×/2×/3×. PDF = that SVG's primitives drawn into pdf-lib (text as embedded font glyphs, not paths). Forbidden: any export-only drawing code, any DOM screenshotting (`html2canvas` etc.).

Page layouts for PDF: A4/A3 × portrait/landscape, 12mm margins. If the frise is wider than the page at the chosen scale, paginate horizontally with a 10mm overlap and print faint scissors-and-dashes assembly marks in the overlap zone, plus "page 2/6" in the bottom-right corner in `--fs-caption` gray.

## 10. Test fixtures (`core/fixtures/`)

Commit these documents and use them across all tests and Storybook-style dev pages:
1. `revolution.krono` — 1770–1830, 1 lane, ~15 events + 4 periods, images on 2 events.
2. `grandes-periodes.krono` — -3_000_000 → 2026, **4 segments** (prehistory heavily compressed), the 5 great periods + 8 events. This is the elastic-axis torture test.
3. `antiquite.krono` — -800 → 500, BC/AD boundary crossing, circa dates, fuzzy periods.
4. `stress.krono` — generated, 500 items in 4 lanes, for layout performance tests (layout < 5ms).
