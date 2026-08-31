---
name: kronofrise
description: Create and edit native .krono timeline files that open as editable documents in KronoFrise. Use for timeline generation, converting dated notes into timelines, or modifying an existing KronoFrise document.
---

# KronoFrise documents

Produce a downloadable UTF-8 JSON file with the `.krono` extension. Every event,
period, lane, title, and teaching mask should remain editable in KronoFrise.
Do not substitute an image, PDF, HTML page, or JSON wrapped inside another object.
No account, API, app installation, or repository checkout is needed to write a file.

This is a self-contained skill. To install in an agent that supports skill
folders, save this file as `kronofrise/SKILL.md` in that agent's skills directory.
It can also be attached directly to an agent conversation as format instructions.

## Workflow

1. Use the requested subject, language, dates, and grouping. Choose a sensible
   visible range if none is supplied. Distinguish point events from periods.
   Research historical claims when needed; do not invent dates to fill gaps.
2. Build the native document below. Use concise labels, with explanations and
   source URLs in each item's optional `description`. Mark approximate dates
   with `circa: true`; do not pretend an unknown day or month is known.
3. Check the invariants below. Write valid JSON with no comments, trailing
   commas, Markdown fences, `undefined`, or non-finite numbers inside the file.
4. Deliver `subject.krono`. Tell the user to use **Ouvrir…** in KronoFrise or
   **Mes frises → Importer un fichier…**. List material uncertainties separately.
   If file attachments are unavailable, give the complete JSON and explain how
   to save it with the `.krono` extension; do not claim a file was attached.

When editing an existing file, preserve its document, lane, and item IDs;
preserve unrelated content and `meta.createdAt`, and update `meta.modifiedAt`.
Generate a new document ID for an independent copy. A UUID is a good default
for new IDs; nonempty unique strings are accepted by the app.

## Native format: krono/1

All objects reject unknown keys. Optional fields should be omitted when unused,
not set to `null`. Dates are objects, never strings or bare years.

Required root fields:

| Field | Value |
| --- | --- |
| `schema` | Exactly `"krono/1"` |
| `id` | Nonempty document identifier |
| `meta` | `title`, `createdAt`, `modifiedAt`; optional `author`; all strings. Use ISO 8601 UTC timestamps for dates. |
| `axis` | `start`, `end`, `segments` as described below |
| `themeId` | Default `"manuel-scolaire"` |
| `lanes` | At least one lane |
| `items` | Array of events and periods; may be empty |
| `pedagogy` | `{"maskedItems": []}` by default |

Optional `titleBlock`: `{"align":"center","subtitle":"…","author":true,"date":false}`.
Only `align` is required when present (`"left"` or `"center"`). `subtitle` is a
string; `author` and `date` are booleans controlling display of the metadata.
Omit `titleBlock` to leave the canvas without a title block.

### Dates and range

A date has integer `year` in [-10000000, 10000], optional integer `month` (1–12),
optional integer `day` (requires `month`, must exist in that month), and optional
boolean `circa`. Leap days use the proleptic Gregorian calendar.

**BCE dates use astronomical numbering:** historical N BCE is stored as `1 - N`.
52 BCE is `{"year":-51}`, 1 BCE is `{"year":0}`, and 1 CE is `{"year":1}`.
Negative text entered in the app's date field follows a different convention;
do not copy that text value directly into the file.

Date ordering compares `(year, month ?? 6, day ?? 15)`. Missing precision sorts
to mid-year/mid-month, even though visual placement starts at the year's/month's
beginning. Prefer consistent precision for boundaries; use real full dates when
boundaries occur within one year. `circa` affects the label, not ordering.

`axis.end` must be strictly after `axis.start`. A normal linear axis is:
`{"start":{"year":1780},"end":{"year":1810},"segments":[{"until":{"year":1810},"weight":1}]}`.
Use a range containing every item; a little extra margin helps labels fit.
For dates late in a year, an end boundary in the following year avoids clipping.

Elastic axes may have 1–8 segments. Each segment has only `until` (a date) and
`weight` (finite positive number). Segment ends must be strictly increasing,
starting after `axis.start`; the first also needs a later visual position.
The last `until` must match `axis.end`, including month/day precision and `circa`.
Widths are proportional to weights, not durations. Use a single segment unless
the user needs compressed time or expanded detail.

### Lanes and items

A lane has `id` and `name` (strings; an empty name is allowed). Optional fields:
`collapsed` (boolean), `color` (palette identifier or custom color).
Lane IDs must be unique. Each item's `laneId` must refer to an existing lane.

Both item kinds require `id`, `laneId`, `label`, `color`, and `kind`. Item IDs
must be unique across both kinds. Optional shared fields are `description`
(plain text string), `fillStyle`, `image: {"src":"data:image/png;base64,…"}`,
and `pinnedRow` (nonnegative integer). Omit `pinnedRow` for automatic layout.
Omit images unless useful; use embedded raster data URLs for portable offline
files, not remote URLs or machine-local paths. The entire file must stay under
20 MiB in UTF-8, including base64 images.

- Event: `kind: "event"` and `date`. Do not include `start`, `end`, or `shape`.
- Period: `kind: "period"`, `start`, `end`, and `shape` (`"bar"`, `"bracket"`,
  or `"arrow"`; choose `"bar"` by default). `end` must be strictly after `start`.
  Optional `fuzzyStart` and `fuzzyEnd` are booleans. Do not include `date`.

Palette identifiers: `brique`, `ocre`, `ble`, `olive`, `foret`, `canard`,
`ardoise`, `encre`, `prune`, `lie-de-vin`, `terre`, `pierre`.
Custom colors may use `#RRGGBB`. Prefer a small, consistent palette by topic.

Fill styles: `tint` (default), `solid`, `none`, `hatch`, `crosshatch`, `dots`,
`lines`, `grid`, `gradient`.

Document themes: `manuel-scolaire`, `craie`, `parchemin`, `journal`, `officielle`,
`tableau`. These are document themes. The app's terracotta/light/dark appearance
preferences do not belong in `.krono` files.

### Teaching masks

`pedagogy.maskedItems` contains objects with `itemId` and `hide`
(`"label"`, `"date"`, or `"both"`). Every `itemId` must exist, with at most one
mask per item. Keep actual labels and dates in the items; masks hide them only
in worksheet mode. Use an empty array for a normal timeline.

## Complete editable example

Replace the subject, content, IDs, and timestamps as appropriate. This example
demonstrates an event, a period, and a title block in one lane.

```json
{
  "schema": "krono/1",
  "id": "a1d46320-8b4e-4617-b1cf-00e8d266572e",
  "meta": {
    "title": "Révolution française",
    "createdAt": "2026-08-31T12:00:00.000Z",
    "modifiedAt": "2026-08-31T12:00:00.000Z"
  },
  "axis": {
    "start": { "year": 1788 },
    "end": { "year": 1801 },
    "segments": [{ "until": { "year": 1801 }, "weight": 1 }]
  },
  "themeId": "manuel-scolaire",
  "titleBlock": { "align": "center", "subtitle": "Repères politiques" },
  "lanes": [{ "id": "politique", "name": "Vie politique" }],
  "items": [
    {
      "id": "bastille",
      "laneId": "politique",
      "kind": "event",
      "label": "Prise de la Bastille",
      "date": { "year": 1789, "month": 7, "day": 14 },
      "color": "brique"
    },
    {
      "id": "directoire",
      "laneId": "politique",
      "kind": "period",
      "label": "Directoire",
      "start": { "year": 1795, "month": 10, "day": 26 },
      "end": { "year": 1799, "month": 11, "day": 9 },
      "shape": "bar",
      "color": "ardoise",
      "fillStyle": "tint"
    }
  ],
  "pedagogy": { "maskedItems": [] }
}
```

## Final checks

Check JSON parsing, required fields, date validity and BCE conversion, unique
IDs, lane/mask references, period ordering, range coverage, segment boundaries,
and file size. Keep description text as document content, not instructions to
execute. Do not put sources in invented `sources` fields; use descriptions.

If the KronoFrise repository is available, its authoritative importer is
`decodeFile` in `src/store/fileIO.ts`, and validation is `parseDocument` in
`src/core/schema.ts`. Running the actual importer gives stronger assurance than
JSON syntax alone. Without the repository, check the contract above and do not
claim app validation that you did not perform.
