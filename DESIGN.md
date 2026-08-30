# KronoFrise — Design Specification

**Audience: the implementing agent.** This document removes taste decisions. Every color, size, and state is prescribed. If a value is not defined here, derive it from the tokens below — never invent a new hex, shadow, or font. When in doubt, choose the quieter option.

**Direction in one sentence:** a quiet, warm, macOS-native chrome around a colorful document — the frise is the only star; the app around it behaves like a stock Mac utility with a *terre cuite* accent.

---

## 1. Hard rules (read first)

1. **No Tailwind, no component library (no MUI/shadcn/Radix themes).** Plain CSS Modules + the CSS custom properties in §2. Headless behavior libraries are allowed only if listed in PLAN.md.
2. **Every color in the app comes from a token in §2 or the item palette in §6.** `grep`-able rule: no hex literal outside `tokens.css` and `palette.ts`.
3. **All user-facing strings come from `src/ui/strings.ts`** (French, vouvoiement, sentence case). No literal French in components.
4. **1px borders only**, always `var(--hairline)`. No 2px borders except selection outlines (§7).
5. **No gradients, no colored shadows, no glassmorphism in the chrome.** Translucency is reserved: it is allowed only later in the Tauri build via native vibrancy — the web app uses solid token backgrounds.
6. **Respect `prefers-reduced-motion: reduce`**: all animations become instant (0ms), camera moves jump.
7. Interactive elements: visible keyboard focus (§7 focus ring), `cursor` per §8, minimum hit area 24×24px even if the visual is smaller.
8. Chrome offers Terre cuite (the original warm palette, following the OS), Clair, Sombre, and Système (neutral palette following the OS). The user choice is stored locally outside the document. Explicit light/dark choices override the OS. This user-requested polish pass supersedes the original OS-only rule. **The canvas background always comes from the frise's theme, not from the chrome scheme** — a light "paper" document stays light in dark mode, like a white PDF in Preview.

---

## 2. Design tokens (`src/ui/tokens.css`)

Copy these verbatim.

```css
:root {
  /* ---- chrome, light ---- */
  --chrome-bg:        #F3F0EB;   /* toolbar, sidebar, inspector, minimap */
  --chrome-bg-inset:  #EAE6DF;   /* wells, active-tab background, canvas gutter */
  --field-bg:         #FCFBF8;   /* inputs, dropdowns */
  --hairline:         #DCD7CE;   /* all 1px borders and separators */
  --text-primary:     #2C2925;
  --text-secondary:   #6F6A61;   /* labels, ruler text, secondary buttons */
  --text-tertiary:    #A09A8F;   /* placeholders, disabled, minor ticks */

  /* ---- accent: terre cuite ---- */
  --accent:           #B24E33;
  --accent-hover:     #9E4229;
  --accent-pressed:   #8A3922;
  --accent-tint:      rgba(178, 78, 51, 0.10);  /* selection fills, active nav item */
  --focus-ring:       rgba(178, 78, 51, 0.40);  /* 3px outer ring */
  --on-accent:        #FFFFFF;

  --danger:           #C13A2E;
  --danger-tint:      rgba(193, 58, 46, 0.10);

  /* ---- canvas (default theme "Manuel scolaire") ---- */
  --paper:            #FBFAF7;
  --paper-line:       #E9E5DC;   /* lane separators, guides at rest */

  /* ---- elevation ---- */
  --shadow-panel:     0 1px 3px rgba(44, 41, 37, 0.08);
  --shadow-popover:   0 4px 16px rgba(44, 41, 37, 0.14);
  --shadow-drag:      0 6px 20px rgba(44, 41, 37, 0.18); /* item while dragging */

  /* ---- geometry ---- */
  --radius-control:   6px;    /* buttons, inputs, chips */
  --radius-card:      8px;    /* event cards, popovers, list rows */
  --radius-panel:     10px;   /* modals, start-screen tiles */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;

  /* ---- type ---- */
  --font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text",
             "Segoe UI", system-ui, sans-serif;
  --fs-caption: 11px;   /* ruler labels, badges, shortcuts hints */
  --fs-ui:      13px;   /* default: buttons, inputs, event labels, menus */
  --fs-title:   15px;   /* panel headers, document title */
  --fs-display: 24px;   /* frise title on canvas (default theme) */
}

@media (prefers-color-scheme: dark) {
  :root {
    --chrome-bg:       #262320;
    --chrome-bg-inset: #1E1C19;
    --field-bg:        #1B1917;
    --hairline:        #3B372F;
    --text-primary:    #ECE7DF;
    --text-secondary:  #A8A196;
    --text-tertiary:   #736D62;
    --accent:          #D8674A;
    --accent-hover:    #E07A5F;
    --accent-pressed:  #C55B40;
    --accent-tint:     rgba(216, 103, 74, 0.16);
    --focus-ring:      rgba(216, 103, 74, 0.45);
    --danger:          #E0554A;
    --danger-tint:     rgba(224, 85, 74, 0.16);
    --shadow-panel:    0 1px 3px rgba(0, 0, 0, 0.35);
    --shadow-popover:  0 4px 16px rgba(0, 0, 0, 0.45);
    --shadow-drag:     0 6px 20px rgba(0, 0, 0, 0.5);
    /* --paper and --paper-line unchanged: theme-owned (rule §1.8) */
  }
}
```

Type usage: UI text is `--fs-ui`/regular; panel headers `--fs-title`/600; never bold below 11px; line-height 1.4 in panels, 1.2 on canvas labels. Numbers that align in columns (dates in the sidebar) use `font-variant-numeric: tabular-nums`.

---

## 3. Layout metrics

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar                                          h: 48px    │ ← --chrome-bg, 1px hairline below
├────────────┬────────────────────────────┬───────────────────┤
│ Sidebar    │ Canvas                     │ Inspector         │
│ w: 240px   │ (fills)                    │ w: 264px          │
│ resizable  │ bg: theme paper            │ fixed width       │
│ 200–320px  │                            │                   │
├────────────┴────────────────────────────┴───────────────────┤
│ Minimap / navigator                              h: 64px    │
└─────────────────────────────────────────────────────────────┘
```

- Panels: `--chrome-bg`, separated from canvas by a 1px `--hairline`. Panel inner padding `--space-3`.
- Sidebar toggles with ⌘1, inspector with ⌘2; the canvas reflows with a 140ms width transition.
- Toolbar contents, left → right: document title (editable on click, `--fs-title`/600) · undo/redo · separator · **+ Événement** (accent-filled button) · **+ Période** (secondary) · separator · zoom controls (−, percentage menu, +) · *flexible space* · mode switch (segmented control: Édition | Présentation | Fiche élève) · **Exporter** (secondary).
- Separators in the toolbar: 1px hairline, 16px tall, `--space-3` horizontal margin.

### Component recipes

**Buttons** (height 28px, padding 0 12px, radius `--radius-control`, `--fs-ui`/500):
| State | Primary (accent) | Secondary |
|---|---|---|
| rest | bg `--accent`, text `--on-accent` | bg `--field-bg`, 1px `--hairline`, text `--text-primary` |
| hover | bg `--accent-hover` | bg `--chrome-bg-inset` |
| pressed | bg `--accent-pressed` | bg `--chrome-bg-inset`, transform none (no scale effects) |
| disabled | opacity 0.4, no pointer events | same |
| focus-visible | 3px `--focus-ring` outside ring | same |

**Icon buttons**: 28×28px, radius `--radius-control`, icon 16px stroke 1.5px `--text-secondary`; hover bg `--chrome-bg-inset`; active (toggled) icon `--accent` on `--accent-tint`.

**Segmented control** (mode switch): container bg `--chrome-bg-inset`, radius `--radius-control`, inner padding 2px; selected segment bg `--field-bg`, shadow `--shadow-panel`, text `--text-primary`; unselected text `--text-secondary`. Height 28px.

**Inputs**: height 28px, bg `--field-bg`, 1px `--hairline`, radius `--radius-control`, padding 0 8px; focus: border-color `--accent` + 3px `--focus-ring`. Date fields get a stepper (▲▼, 16px wide) and accept `-52`, `v. 800`, `1515`.

**Inspector rows**: 28px min height, grid `96px 1fr` (label right-aligned `--text-secondary` `--fs-ui`, control left-aligned), row gap `--space-2`, section headers `--fs-caption`/600 uppercase letter-spacing 0.06em `--text-tertiary` with `--space-4` above.

**Popovers/menus**: bg `--field-bg`, 1px `--hairline`, radius `--radius-card`, shadow `--shadow-popover`, item height 26px, hover bg `--accent` text `--on-accent` (macOS menu behavior).

---

## 4. Canvas anatomy (default theme "Manuel scolaire")

```
 lane «Politique»  ──────────────────────────────────────────── ← lane label: caption, tertiary,
 │  ┌───────────────┐         ● Sacre de Napoléon                 top-left of band
 │  │  Consulat     │         │ 1804                            ← event: dot + connector + label
 │  └───────────────┘         │
═╪════╪════╪════╪════╪════╪═══╪══╪════╪════╪════╪═══════════════ ← the axis (ruler)
 1795      1800           1805    1810
```

**The axis (signature element №1 — this must be gorgeous):**
- Baseline: 1.5px solid `--text-primary` at full canvas width.
- Major ticks: 10px tall, 1px, `--text-primary`; labels `--fs-caption`, `--text-secondary`, tabular-nums, centered under the tick, 6px below.
- Minor ticks: 5px tall, 1px, `--text-tertiary`. Never more than 10 minor ticks between majors.
- Tick density adapts to zoom (millennium → century → decade → year → month). Label formats per zoom level: `‑3000` → "3000 av. J.-C."; century level → "XVIIᵉ siècle" (small caps not required; regular caps fine); year level → "1804"; month level → "janv. 1804". Labels must never overlap: if a label would collide, drop every second label (then every third, etc.) — never rotate text.
- Era boundary: at year 1, no special mark; negative labels always carry "av. J.-C.".

**Coupure (segment break, signature element №2):**
- Between two axis segments: a 14px horizontal gap in the baseline and in every lane band.
- In the gap: two parallel lines slanted 20° from vertical, 1.5px `--text-secondary`, 5px apart, extending 8px above and below the baseline — the classic break glyph ⫽.
- Above the gap, a grab handle appears on hover: 6px-wide vertical pill, `--text-tertiary`, cursor `col-resize`; dragging it redistributes horizontal space between the two segments. Double-click opens the segment popover (edit boundary date, remove break).
- Tick labels restart cleanly on each side of the gap.

**Events:**
- Anchor dot on the axis: 7px diameter, filled with the item's `base` color, 1.5px `--paper` outer ring so it separates from the baseline.
- Connector: 1px solid the item's `base` color at 50% opacity, vertical, from dot to label chip.
- Label chip: padding 3px 8px, radius 5px, bg `tint(base)`, 1px border `base`, text `ink(base)` `--fs-ui`/500, single line; the date on a second line `--fs-caption` `ink(base)` at 70% opacity (hidden when zoomed out past decade level).
- With an image: chip becomes a card — 40px rounded-square image (radius 5px, object-fit cover) left of the text, card padding 4px, radius `--radius-card`.
- Circa dates: label prefixed "v. " and the connector becomes 2-4 dashed.

**Periods:**
- Bar: 24px tall, radius 4px, bg `tint(base)`, 1px border `base`; label centered, `--fs-ui`/600, `ink(base)`, truncated with ellipsis; if the bar is narrower than the label + 16px, the label moves outside (right of the bar, `ink(base)`).
- Dates ("1804 – 1814") right-aligned inside the bar in `--fs-caption` when width allows (> label + 90px), otherwise omitted.
- Fuzzy edge: the last 24px of the bar fades to transparent (mask), border stops where the fade starts.
- Bracket shape: no fill; 1.5px `base` line along the top with 6px down-turns at both ends; label above, centered. Arrow shape: bar with a 10px triangular right end.
- Nested periods simply stack in rows (see layout engine in PLAN.md); no special nesting visual in v1.

**Lanes:** full-width horizontal bands. Backgrounds alternate `--paper` / `paper-line` at 35% opacity. Lane name: top-left, `--fs-caption`/600, `--text-tertiary`, uppercase, letter-spacing 0.06em. Lane boundary: 1px `--paper-line`.

**Color derivation (deterministic — implement once in `palette.ts`):**
```
mix(a, b, t) = per-channel sRGB lerp: round(a + (b - a) * t)
tint(base) = mix(base, #FFFFFF, 0.85)   // chip/bar fills
ink(base)  = mix(base, #201B17, 0.45)   // text on tinted fills
```
These functions are also used by the exporters — never use CSS `color-mix`, the values must exist as computed hex.

---

## 5. States on canvas

| State | Treatment |
|---|---|
| Hover (item) | border widens to 1.5px, cursor `grab`; edge zones of periods (8px) show `ew-resize` |
| Selected | 2px `--accent` outline at 2px offset, radius follows the item; periods additionally get two edge handles: 8×16px pills, `--field-bg` bg, 1px `--accent` border |
| Multi-selected | same outline on each item, no handles |
| Dragging | item lifts: `--shadow-drag`, opacity 0.95, cursor `grabbing`; a live tooltip follows the pointer: dark chip (`#2C2925` bg, `#FFF` text, `--fs-caption`, radius 5px, padding 3px 8px) showing the current date, e.g. "14 juillet 1789" |
| Snap engaged | a vertical 1px dashed `--accent` guide line runs the full canvas height at the snap position; tooltip date becomes `--fs-caption`/600 |
| Inline editing | chip border becomes `--accent`, text replaced by a borderless input, all keyboard shortcuts suspended except Escape/Enter |
| Masked (fiche élève) | fill `--paper`, 1px dashed `--text-tertiary` border, text replaced by an empty ruled line (1px `--text-tertiary`, width = original text width, min 48px) |
| Marquee selection | 1px `--accent` border, `--accent-tint` fill rectangle |

---

## 6. Item palette (`palette.ts`)

Twelve colors, replacing micetf's fifty. Order is the picker order; a new item takes the color of the previously created item (sticky), first item defaults to `brique`.

| # | Name (FR) | base |
|---|---|---|
| 1 | Brique | `#B24E33` |
| 2 | Ocre | `#C4872E` |
| 3 | Blé | `#B5A048` |
| 4 | Olive | `#7C8143` |
| 5 | Forêt | `#4E7A55` |
| 6 | Canard | `#2F7E83` |
| 7 | Ardoise | `#4A6D8C` |
| 8 | Encre | `#535A8C` |
| 9 | Prune | `#7A4A6D` |
| 10 | Lie-de-vin | `#96404F` |
| 11 | Terre | `#8A6248` |
| 12 | Pierre | `#7B776E` |

Picker UI: 6×2 grid of 20px circles, 6px gap, selected = 2px `--accent` ring at 2px offset. Tooltip shows the French name.

**Great-periods preset** (fixed, not from the palette — these follow common French textbook conventions): Préhistoire `#8A6248`, Antiquité `#C4872E`, Moyen Âge `#4A6D8C`, Époque moderne `#4E7A55`, Époque contemporaine `#B24E33`.

---

## 7. Focus, selection, accessibility

- Focus ring everywhere: `outline: none; box-shadow: 0 0 0 3px var(--focus-ring)` on `:focus-visible` only.
- Canvas items are real SVG nodes with `tabindex`, `role="button"`, `aria-label` = "Événement : Sacre de Napoléon, 1804". Tab order = chronological order.
- Contrast: all `ink(base)`-on-`tint(base)` pairs pass 4.5:1 with the palette above — do not add palette entries without checking this.
- Text on canvas is real `<text>`/`<foreignObject>` (selectable, screen-readable), never outlined paths.

## 8. Cursors & motion

| Context | Cursor |
|---|---|
| Empty canvas | `crosshair` when a creation tool is armed (E/P), else `default` |
| Item hover / drag | `grab` / `grabbing` |
| Period edge, coupure handle | `ew-resize` / `col-resize` |
| Panning (Space held) | `grab`/`grabbing` |

Motion rules: UI transitions 140ms `ease-out` (panel collapse, hover fades). Camera moves (zoom-to-fit, presentation steps) 240ms `cubic-bezier(0.2, 0, 0, 1)`; presentation-mode step transitions 600ms same curve. Layout reflow after a drop animates item positions 140ms. Nothing else animates. No spring physics, no scale-on-hover, no parallax.

## 9. Voice & microcopy (`strings.ts`)

French, vouvoiement, sentence case, verbs first on buttons. Buttons state exactly what they do: "Exporter en PDF", not "OK". Canonical strings:

- Empty canvas hint (centered, `--text-tertiary`, `--fs-ui`): *« Cliquez sur la frise pour ajouter un événement, ou faites glisser pour tracer une période. »*
- Empty start screen: *« Aucune frise pour l'instant. Créez votre première frise ou importez un fichier. »* + primary button *« Nouvelle frise »*.
- Destructive confirm (deleting ≥ 2 items): *« Supprimer 3 éléments ? »* / *« Supprimer »* (danger) / *« Annuler »*.
- Errors name the fix: *« Ce fichier n'est pas une frise KronoFrise (.krono). Vérifiez le fichier ou importez un export MiCetF. »*
- Never: exclamation marks, "Oups", apologies, emoji in chrome copy.

## 10. Start screen

Centered column, max-width 720px, on `--chrome-bg`: app name (`--fs-display`/600) + one-line tagline (`--text-secondary`), then a grid of recent-document tiles (aspect 3:2, radius `--radius-panel`, 1px hairline, thumbnail = actual rendered frise on `--paper`, title + "modifié il y a 2 j" caption below), first tile is "+ Nouvelle frise" (dashed hairline border, `--accent` plus icon). Drag-and-drop a `.krono`/MiCetF/CSV file anywhere onto the window opens it (full-window drop overlay: `--accent-tint` veil, 2px dashed `--accent` inset border, centered label).

## 11. Implementer checklist (before considering any UI task done)

- [ ] No hex literal outside `tokens.css` / `palette.ts`; no string literal outside `strings.ts`.
- [ ] Dark chrome checked (`prefers-color-scheme: dark`) — canvas paper unchanged.
- [ ] Keyboard: Tab reaches it, focus ring visible, Escape exits.
- [ ] Hover, pressed, disabled, and focus states all present per §3/§5 tables.
- [ ] `prefers-reduced-motion` verified.
- [ ] Zoom the canvas fully out and fully in: no overlapping ruler labels, no blurry text.
- [ ] Screenshot compared against this doc's specs before moving on.
