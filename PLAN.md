# KronoFrise — Build Plan

**The ultimate timeline (frise chronologique) editor for history teachers.**
Web-first, macOS-grade design, later packaged as a Tauri desktop app.

> **Read together with:** [DESIGN.md](DESIGN.md) *(all UI/visual decisions — tokens, metrics, states; nothing visual is decided outside it)* and [docs/format.md](docs/format.md) *(the `.krono` schema, core contracts, importers, fixtures)*. This plan says **what** and **when**; those two say **how**.

---

## 0. Settled decisions (Kilian, 2026-08-30) — do not relitigate

1. **Elastic segmented axis ships in v1.** Core math in M0, editor UI (coupure handles, split-at-date) in M2. Spec: format.md §3, DESIGN.md §4.
2. **Desktop-first.** Use pointer events so basic touch isn't broken, but do not design, adapt, or test for iPad in v1.
3. **French only in v1.** All strings in `src/ui/strings.ts` as typed constants — no i18n library, no literal strings in components.
4. **Visual direction: "warm historical".** Terre cuite accent, warm neutral chrome, macOS-native behavior. Exact tokens in DESIGN.md §2 — never invent colors.
5. **Single-package repo, not a monorepo.** Folder boundaries inside one Vite app (see §4.2) with an ESLint rule enforcing them. Tauri later wraps this same app.

---

## 1. Vision

Every French history teacher builds frises: on the board, in Word, in LibreOffice Draw, or with tools like [micetf.fr/frise](https://micetf.fr/frise/). The micetf generator proves the demand, but it's a *form* that produces a picture: you type dates into input fields, press a button, and hope the boxes land well. There is no direct manipulation, no images, no styling beyond 50 named colors, no vector export, and the output looks like 2005.

KronoFrise inverts the model: **the frise itself is the editor**. You click on the canvas to create, drag to move, double-click to rename, pinch to zoom through centuries. It should feel like a native macOS app that happens to run in a browser — the same design DNA as Calqo and Notabene: clean toolbar, sidebar + inspector layout, SF-style typography, quiet chrome, the document as the hero.

**One-line pitch:** *Figma-level editing comfort, purpose-built for chronology, with a printer and a classroom in mind.*

### Guiding principles

1. **Direct manipulation everywhere.** If you can see it, you can drag it, resize it, or edit it in place. Forms only in the inspector, never as the primary flow.
2. **Beautiful by default.** A frise made in 5 minutes with zero styling decisions must already look good enough to project or print. Themes do the design work.
3. **Time is the hard part — solve it properly.** BC/AD, "-3000 to today" on one strip, broken axes, per-segment zoom. This is where every competitor is weak and where we win.
4. **The classroom is the export target.** A4/A3 print, videoprojector presentation mode, fill-in-the-blanks worksheets, PDF handouts. Not just "download PNG".
5. **Local-first, zero-friction.** No account required. Documents are files you own. Autosave always. Works offline (PWA now, Tauri later).
6. **French-first UI**, English as second locale.

---

## 2. What we learn (and steal, and fix) from micetf

| micetf feature | Verdict | KronoFrise answer |
|---|---|---|
| Events (point) + periods (span) as the two primitives | ✅ Keep | Same two primitives, plus lanes/groups and media |
| "Frise à compléter" (hide labels for worksheets) | ✅ Brilliant, expand | Full worksheet generator: hide labels/dates selectively, answer key, quiz mode |
| JSON export/import | ✅ Keep | Versioned `.krono` format **+ importer for micetf JSON** (instant migration path for its users) |
| Form-based editing | ❌ Replace | Canvas-first direct manipulation |
| Fixed linear scale, one ruler | ❌ Replace | Zoomable, pannable, breakable, multi-scale axis |
| 50 named colors, no fonts, no images | ❌ Replace | Themes, images, styles, icons |
| PNG download only | ❌ Replace | SVG, PDF (vector, paginated), PNG @2x, shareable read-only link (later) |

---

## 3. Product design

### 3.1 The document model (domain layer)

A `.krono` document is a JSON file with a schema version. Everything else in the app is a pure function of this document.

```
Document
├── meta            title, author, locale, schemaVersion, createdAt
├── axis            TimeRange { start, end } in astronomical years (BC-safe),
│                   scale segments (see 3.3), tick config, calendar display opts
├── theme           reference to a theme + per-doc overrides
├── lanes[]         named horizontal bands (e.g. "Politique", "Arts", "Sciences")
│                   with color, height, collapsed state
├── items[]
│   ├── Event       { date, label, description?, image?, icon?, style?, laneId, anchor }
│   ├── Period      { start, end, label, style?, laneId, shape: bar|bracket|arrow }
│   └── Annotation  { free text / arrow / image pinned to a date or to the canvas }
└── pedagogy        worksheet settings: which fields are masked, answer-key state
```

Key decisions:

- **Dates are integers in "astronomical year" + optional month/day precision.** Year 0 exists internally (astronomical convention); display layer renders `‑52 → "52 av. J.-C."`. Precision is per-item: a teacher can place "1789" and "14 juillet 1789" on the same frise; ticks and snapping adapt.
- **Fuzzy dates are first-class**: `circa` flag (renders "v. 800"), and periods can have fuzzy edges (rendered as a fade/hatch — perfect for "fin de l'Empire romain").
- **The document is UI-framework-agnostic** (plain TS package, `@kronofrise/core`). This is what makes the Tauri port cheap and enables headless export/CLI later.

### 3.2 The editor layout (macOS look & feel)

```
┌────────────────────────────────────────────────────────────────┐
│  Toolbar: doc title · undo/redo · +Événement +Période · zoom · │
│           mode switch (Édition / Présentation / Fiche élève) · │
│           Exporter · Partager                                  │
├──────────┬──────────────────────────────────────┬──────────────┤
│ Sidebar  │                                      │  Inspector   │
│ (left)   │            CANVAS                    │  (right)     │
│          │                                      │              │
│ Outline: │   lanes, ruler, events, periods —    │  Contextual: │
│ lanes &  │   the frise, zoomable & pannable     │  selected    │
│ items,   │                                      │  item props, │
│ drag to  │                                      │  or document │
│ reorder, │                                      │  theme when  │
│ search   │                                      │  nothing is  │
│          │                                      │  selected    │
├──────────┴──────────────────────────────────────┴──────────────┤
│  Timeline minimap / navigator strip (like audio-editor scrub)  │
└────────────────────────────────────────────────────────────────┘
```

- Both panels collapsible (⌘1 / ⌥⌘I), leaving a distraction-free canvas.
- Design language: system font stack (SF Pro on Mac), 13px UI type, hairline separators, translucent panel backgrounds, native-feeling segmented controls and steppers, macOS-style context menus, full dark mode from day one. Reuse the visual vocabulary you established in Calqo/Notabene (quiet grays, one accent color, generous canvas).
- **Keyboard-complete**: ⌘Z/⇧⌘Z, ⌘D duplicate, arrows nudge dates by one tick (⇧ = ×10), ⌘E export, `E`/`P` to arm event/period creation, Escape everywhere.

### 3.3 The canvas & the time axis — the crown jewel

This is the technical and creative heart. Bold features, in priority order:

1. **Infinite pan/zoom axis.** Scroll to pan through time, pinch/⌘-scroll to zoom from millennia down to days. Ticks re-densify intelligently (millennium → century → decade → year → month) with French labels ("XVIIᵉ siècle" as a zoom level!).
2. **Élastique time (segmented scale).** A frise "de -3 000 000 à aujourd'hui" is impossible on a linear axis. Allow the teacher to split the axis into segments with independent scales — prehistory compressed, 20th century expanded — with an elegant "coupure" glyph (double slash ⫽) between segments. This single feature makes KronoFrise the only usable tool for the cycle 3 "grandes périodes" frise.
3. **Direct creation.** Click on empty canvas = new event at that date (inline label editing immediately, cursor ready). Drag horizontally on empty canvas = new period. No dialogs.
4. **Drag semantics.** Drag an event = change its date (live date tooltip while dragging, snapping to round years/decades, ⌥ disables snap). Drag a period's edge = change start/end. Drag vertically = change lane or stacking row. Multi-select with marquee or ⇧-click; drag moves the whole selection in time (great for "shift everything by 10 years").
5. **Automatic layout, manual override.** Labels and boxes auto-stack to avoid collisions (the #1 pain in every timeline tool). Auto-placement is deterministic and pretty; any item can be pinned manually and the layout flows around it.
6. **Périodes as three shapes**: filled bar (the classic), bracket (for reigns/mandates above the axis), and arrow (for movements/migrations). Periods can nest visually ("Moyen Âge" containing "Époque carolingienne").
7. **Media on the frise**: drop an image (portrait, painting, map) onto an event → it becomes an illustrated card with automatic circular/rounded crop. Emoji/icon shortcut for quick visual anchors (⚔️ 👑 🎨 ⚗️).

### 3.4 Themes & styling

- **Theme = complete visual system**: palette, typography, event card shape, period bar style, ruler style, background. Ship 6–8 curated themes, e.g.:
  - *Manuel scolaire* — the clean textbook look, default
  - *Craie* — dark board, chalk-like strokes, for projection
  - *Parchemin* — warm, for Antiquity/Middle Ages units
  - *Journal* — B&W, high contrast, **photocopy-safe** (explicit goal: survives a 20-year-old photocopier)
  - *Frise officielle* — matches the Éduscol/programmes color conventions for the great periods
- Per-item overrides (color, emphasis) via the inspector, but themes carry the load.
- **The great-periods preset**: one click inserts the canonical French school periodization (Préhistoire / Antiquité / Moyen Âge / Époque moderne / Époque contemporaine) with standard colors and dates, as a background band or as periods.

### 3.5 Pedagogy mode — the differentiator no design tool has

A dedicated mode switch: **Édition / Présentation / Fiche élève.**

- **Fiche élève (worksheet)** — micetf's best idea, industrialized:
  - Per-item masking: hide label, hide date, or both; masked items render as blank boxes or dotted lines to fill in.
  - One-click variants: "masquer tous les libellés", "masquer une sélection aléatoire (50%)".
  - Export worksheet + answer key as a single PDF (recto/verso ready).
  - **Chronology exercise generator**: auto-produce a "replace les événements" cut-out sheet (shuffled labels + empty frise) from any document.
- **Présentation** — full-screen, chrome-free, videoprojector-friendly:
  - Step through events in chronological order (→ key), each one highlighted and zoomed with a smooth camera move; description and image shown large.
  - "Reveal" mode: start with an empty frise and make items appear one by one during the lesson — the digital version of writing the frise on the board as the class advances.
- **Quiz (later)**: the frise quizzes the class — "place cet événement", drag the label to the right spot, instant feedback.

### 3.6 Import & export

**Import**
- micetf JSON (day one — free migration of the existing user base).
- Paste from spreadsheet / CSV (`date; libellé; description` — teachers have lists in Excel already). Smart date parsing incl. "v. 800", "1515", "-52", "XVIe siècle".
- (Later) Wikidata lookup: type "Louis XIV", get dates + portrait, one click to insert.

**Export**
- **PDF (vector)** — the flagship: A4/A3, portrait/landscape, auto-paginated for long frises with an overlap/assembly guide ("frise murale" printed across 6 pages to tape together — teachers love wall friezes).
- **SVG** (perfect for reuse in other documents), **PNG @1x/2x/3x** with transparent background option.
- **.krono** file (the document itself), plus one-click ".krono → lien de partage" read-only web link (phase 2, needs the tiny share service).
- Copy-as-image to clipboard for pasting straight into a slide.

### 3.7 Persistence

- **Local-first.** Autosave to IndexedDB continuously; explicit Save/Open via File System Access API (Chromium) with download/upload fallback (Safari/Firefox). Recent-documents gallery on the start screen with visual thumbnails.
- Undo history persisted with the autosave (reopening a doc keeps your undo stack — a small touch that feels magic).
- No backend in phase 1. A minimal share/link service and optional sync come later, and never become a requirement.

---

## 4. Technical architecture

### 4.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript strict, everywhere | One language across web + Tauri |
| Repo | Single Vite app, folder boundaries enforced by ESLint (`no-restricted-imports`) | A monorepo adds config surface without benefit at this size; the boundary that matters is §4.2's import rule |
| UI framework | **React 19 + Vite** | Ecosystem, and the canvas doesn't depend on it |
| Rendering | **SVG** (DOM) for the frise | Crisp at any zoom, trivially exportable (SVG *is* the export), CSS-themeable, accessible (real text nodes), events per element. Canvas/WebGL only if profiling ever demands it — a frise has hundreds of items, not millions. |
| State | **Zustand** + immer, with a command-based undo/redo layer (every mutation is a named, invertible command) | Simple, fast, undo comes from the command log not from snapshots |
| Drag/gestures | Custom pointer-event layer on the SVG (not dnd-kit — timeline dragging is coordinate math, not list sorting) + `use-gesture` for pinch/wheel | Full control over snapping, axis-locking, live tooltips |
| Styling | Plain CSS Modules + the token file from DESIGN.md §2 | No Tailwind, no component library (hard rule, DESIGN.md §1) |
| PDF export | `svg → pdf` via pdf-lib (or paged print CSS as fallback) | Keeps vectors vector |
| Strings | `src/ui/strings.ts` typed constants, French only | Settled decision #3; extraction to i18n is trivial later because strings are already centralized |
| Tests | Vitest for `core` (date math, layout engine — heavily tested), Playwright for editor smoke tests | The layout engine and BC/AD math are where bugs would hurt |
| Desktop (phase 4) | **Tauri v2** | Native macOS shell, real file association for `.krono`, menu bar, Quick Look thumbnail later |

### 4.2 Folder layout (single Vite app)

```
kronofrise/
├── src/
│   ├── core/        # document model, zod schema, migrations, date math,
│   │                # commands (invertible mutations), importers, fixtures
│   │                # → spec: docs/format.md. NEVER imports React or the DOM.
│   ├── layout/      # pure layout engine: Document → SceneGraph
│   │                # (scale.ts timeToX/xToTime, stacking, ticks, measure)
│   │                # → NEVER imports React. May use canvas text measurement
│   │                #   behind a Measurer interface injectable for tests.
│   ├── renderer/    # SceneGraph → SVG React components, plus
│   │                # renderToSvgString(sceneGraph) for headless export
│   ├── export/      # svg→png, svg→pdf(pdf-lib), pagination (format.md §9)
│   ├── themes/      # theme definitions as plain data
│   ├── ui/          # editor shell, panels, toolbar, tokens.css, strings.ts,
│   │                # palette.ts, interaction layer (pointer events, gestures)
│   └── store/       # zustand store, command dispatch, undo stack, autosave
├── docs/            # format.md, this plan's companions
└── src-tauri/       # phase 4 only
```

The sacred boundary, enforced with an ESLint `no-restricted-imports` rule from day one: **`core/` and `layout/` never import from `react`, `ui/`, `store/`, or touch `window`/`document`.** Rendering is `render(layout(document))`; exports call the same pipeline headlessly, so *what you print is what you saw*, guaranteed.

### 4.3 The two hard problems (design them first)

1. **Time→pixel mapping with segmented scales.** A single pure function pair `timeToX(t)` / `xToTime(x)` parameterized by the axis segments. Every feature (ticks, snapping, dragging, minimap, exports) goes through it. Get this API right in week 1; property-test it (round-tripping, monotonicity).
2. **Label/box collision layout.** Deterministic greedy stacking per lane (sort by start date, assign to first free row, measure text via a cached measurer), with "pinned" items as fixed obstacles. Must be fast enough to run on every drag frame (~1–2ms for 300 items is very achievable) so layout feels alive while dragging.

---

## 5. Roadmap

### M0 — Foundations (1–2 weeks)
Monorepo, `core` document model + zod schema + migrations, date math with BC/AD and French formatting (tested), `timeToX` segmented mapping (tested), command/undo engine, minimal SVG renderer showing a hardcoded frise with a correct adaptive ruler.

**Exit:** the fixtures from format.md §10 render beautifully at any zoom level — including `antiquite.krono` (BC→AD) and `grandes-periodes.krono` (4 segments with coupure glyphs, correct per-segment tick densities).

### M1 — The living canvas (2–3 weeks)
Editor shell (toolbar/canvas, panels stubbed), pan/zoom, click-to-create event with inline editing, drag-to-create period, drag to move/resize with snapping and live tooltips, auto-stacking layout, selection + multi-select, delete/duplicate, undo/redo wired to UI, autosave to IndexedDB, open/save `.krono`.

**Exit:** you can build a complete frise start-to-finish without ever seeing a form. *This is the "wow" demo.*

### M2 — Looks & structure (2–3 weeks)
Inspector panel, lanes (create, name, color, drag items between), **elastic axis editor UI** (split the axis at a date via context menu on the ruler, drag coupure handles to redistribute space, double-click a coupure to edit/remove — DESIGN.md §4), theme system + first 4 themes, dark chrome, great-periods preset, images on events, sidebar outline, minimap navigator.

**Exit:** two real documents you'd proudly project in class — "La Révolution française" (linear) and the cycle-3 "grandes périodes" frise built from scratch through the segment UI (elastic).

### M3 — Teacher superpowers (2 weeks) — ✅ shipped 2026-08-31
Fiche élève mode (masking, worksheet + answer key), Présentation mode with step-through, PDF export (A4/A3, pagination, frise murale), SVG/PNG export, **interactive HTML export**, micetf + CSV import, **document navigator** with recents gallery.

**Exit:** the full teacher loop — build, project, print, hand out — with zero other software involved. **Public beta here.**

### M4 — Polish, typography & desktop (3–4 weeks)
Keyboard completeness, accessibility pass, performance pass (500+ items), remaining themes, PWA/offline, Tauri app: native menus, `.krono` file association, app icon, notarized DMG.

Added after the M3 interface pass (Kilian, 2026-08-31):

1. **Onboarding tutorial.** A guided first run, not a video: on an empty frise, three or four steps that make the user *do* the thing (place an event, drag it, name it, switch to Présentation), each anchored to the real control with a coach-mark, skippable and resumable from the help menu. Dismissed state lives in the appearance store (per device, never in the document). Beta blocker: a teacher must reach a printable frise in under five minutes without reading anything.
2. **Embedded fonts.** Two facets, one decision: *(a)* embed a real font in the PDF so ordinal superscripts (« XVIIᵉ ») print as written — needs `@pdf-lib/fontkit`, outside the closed dependency list of §8.4, and a licence-clear font (Inter, Source Sans 3 or EB Garamond for *Parchemin*) shipped as a subset; *(b)* let a **theme** name its typeface, so *Parchemin* can be serif and *Craie* a chalk hand, with the same font file embedded in the SVG/PDF exports. Until then the fold to « XVIIe » stands (docs/spec-gaps.md §8).
3. **Gradient fills.** A ninth `fillStyle`, `gradient`, with the item colour fading along the bar — the natural way to draw a period whose intensity grows or fades. Contract: SVG gets a real `linearGradient`; the PDF exporter has no gradient primitive, so it renders a banded approximation (16 steps, same geometry) — that difference must be *specified*, not discovered, and shown in the export dialog. Fuzzy edges already use a gradient mask, so the mechanism is half-built.
4. **Title and description block.** A document-level block on the canvas — title, optional subtitle/description, optional author and date — placed above the frise, part of the `SceneGraph` so it prints and exports identically. Per-theme typography, toggleable, draggable between top-left / top-centre. This is what turns an exported PNG into a finished handout instead of a floating diagram.
5. **Icon set** — settled 2026-08-31: Lucide for the generic glyphs, hand-drawn on the same 24px grid for the timeline's own vocabulary. See docs/spec-gaps.md §12.6.

### M5 — Beyond (backlog, post-launch)
Share links (read-only web viewer), Wikidata lookup, quiz mode, collaborative editing, template gallery ("frises officielles" per school level), comparative parallel frises (France vs. Monde stacked with a shared axis), PPTX export, interactive HTML export with live re-layout (the M3 viewer freezes the layout — a real re-layout needs the layout engine bundled into the exported file).

---

## 6. Risks & mitigations

- **Safari + File System Access API** → fallback path (download/upload) built in M1, not bolted on.
- **Label layout looks bad in edge cases** → invest in the measurer + tests early; manual pin is the escape hatch.
- **Scope creep (this plan is ambitious)** → the M1 exit criterion is the north star; everything that doesn't serve "build a frise by direct manipulation" waits.
- **Elastic-axis UI is in v1 (settled decision #1) and it's the hardest interaction** → the math ships and is property-tested in M0, long before the UI; the M2 segment editor is then a thin layer over `makeScale`. If the drag interaction misbehaves, the fallback within M2 is popover-only editing (numeric weights), never cutting the feature.
- **PDF fidelity** → because export renders the same SceneGraph, fidelity is architectural, not aspirational. Validate pdf-lib text/font embedding in M0 with a spike.

## 7. First concrete steps

1. Scaffold: Vite + React 19 + TypeScript strict + Vitest + ESLint (with the §4.2 boundary rule) + CSS Modules. Commit `tokens.css`, `strings.ts`, `palette.ts` copied from DESIGN.md.
2. `docs/format.md` is written — implement it: `core/dates.ts` (`formatYear`, `parseDateInput`, `compareDates`, `toFractionalYear`) and the zod schema, with the tests format.md demands.
3. Get a real MiCetF export (micetf.fr/frise → "Exporter") and commit it as the importer test fixture; write the four fixtures from format.md §10.
4. `layout/scale.ts` (`makeScale`) with property tests — monotonicity, round-trip, segment boundaries.
5. Ruler component with adaptive French ticks rendering `grandes-periodes.krono` — the first thing that must look *gorgeous* (DESIGN.md §4).
6. Spike: export that ruler to PDF via pdf-lib (embedded font, vector ticks) to de-risk M3.

---

## 8. Working rules for the implementing agent

You (the implementing agent) are building from three documents: this plan (what/when), **DESIGN.md** (every visual and interaction decision), **docs/format.md** (every data and core-logic decision). Rules:

1. **Do not redesign.** If a color, size, state, string, schema field, or behavior is specified, implement it exactly. If something genuinely isn't covered, follow the nearest analogous spec and leave a `// SPEC?` comment plus a note in `docs/spec-gaps.md` — do not invent silently and do not block.
2. **Work milestone by milestone, in order.** Within a milestone, follow the listed order. Do not start a later milestone's feature "while you're at it".
3. **Definition of done, every task:** TypeScript strict passes with zero errors and zero `any`; `core/` and `layout/` changes come with the tests named in format.md; UI changes pass the DESIGN.md §11 checklist; the app runs (`pnpm dev`) and the affected flow is exercised in the browser before moving on.
4. **Dependencies are a closed list:** react, react-dom, zustand, immer, zod, @use-gesture/react, pdf-lib, idb-keyval, uuid, **lucide-react** (icon set only, added 2026-08-31 by Kilian — see docs/spec-gaps.md §12.6) (+ dev tooling: vite, vitest, playwright, eslint, typescript). Adding anything else requires asking Kilian first — no drag-and-drop libs, no chart libs, no UI kits, no date libs (core/dates.ts is the date library).
5. **Never break the boundary:** anything in `core/` or `layout/` importing React/DOM is a bug even if it works.
6. **Exports use the shared pipeline** (format.md §9) — the moment you're tempted to write export-specific drawing code, stop; fix the SceneGraph instead.
7. **Undo is not optional.** Every mutation is a command with an exact inverse from the day the mutation exists — retrofitting undo is how editors rot.
8. **Commit small and honestly.** One feature or fix per commit, French-or-English message stating what changed; if tests fail, say so — never mark a milestone exit criterion met without demonstrating it on the fixtures.

---

*Nom de code : KronoFrise. Le nom final peut attendre — la frise, non.*
