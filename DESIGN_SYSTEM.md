# AuraBIM Studio — Design System & UI Specification (`v2.0`)

## 1. Design Philosophy & Aesthetic Direction

AuraBIM Studio is an architectural-grade 2D CAD & 3D BIM workstation. The interface rejects generic consumer SaaS styling (harsh `#FFFFFF` backgrounds, oversized rounded cards, and competing pastel icon boxes) in favor of **tactile architectural precision**:

1. **Dual-Theme Ergonomics:**
   - **Obsidian Studio (Dark Mode — Default in CAD Editor):** Deep carbon/obsidian surfaces (`#0D0E11` to `#1C1E24`) with `1px` low-contrast structural borders and top-edge specular highlights to minimize eye strain during long drafting sessions.
   - **Warm Alabaster (Light Mode — Default in Project Hub / Optional in Editor):** Warm stone and architectural paper tones (`#EAE8E3` to `#FFFFFF`) that eliminate sterile blue-white glare while keeping technical drawings crisp.
2. **Strict Chromatic Discipline:** UI chrome remains neutral and monochromatic. Color is reserved strictly for **active tool states (Architectural Terracotta)**, **snapping/telemetry guides (Electric Cobalt)**, and **CAD dimension callouts (Warm Copper)**.
3. **Tabular Numeric Precision:** Every measurement, coordinate, area readout, and dimension input uses a monospace typeface with `font-variant-numeric: tabular-nums` so numbers never jitter during real-time wall dragging.
4. **Lighting Over Drop Shadows:** Depth is communicated through surface luminance steps, `1px` inset top highlights, recessed input wells, and translucent glassmorphic HUD overlays rather than heavy drop shadows.

---

## 2. Color System & Semantic Tokens

### 2.1 Core Surfaces & Backgrounds

| Token                 | Dark Mode (Obsidian)     | Light Mode (Alabaster)      | Usage                                                                  |
| :-------------------- | :----------------------- | :-------------------------- | :--------------------------------------------------------------------- |
| `--bg-canvas`         | `#0D0E11`                | `#EAE8E3`                   | Infinite 2D/3D CAD viewport & Project Hub page background              |
| `--bg-shell`          | `#111216`                | `#F0EFEA`                   | Left mode rail (`52px`) & app outer frame                              |
| `--bg-panel`          | `#141519`                | `#F4F3EF`                   | Top navigation bar, Left Tool Drawer, Right Inspector panel            |
| `--bg-surface`        | `#1C1E24`                | `#FFFFFF`                   | Project cards, tool cards, dropdown menus, segmented button active tab |
| `--bg-surface-hover`  | `#242730`                | `#FAF9F6`                   | Hovered tool card, project card, or layer row                          |
| `--bg-surface-active` | `#2A2E39`                | `#F0EFEA`                   | Pressed state or selected secondary surface                            |
| `--bg-input`          | `#0B0C0E`                | `#E6E4DD`                   | Recessed numeric inputs, search bar track, segmented control track     |
| `--bg-glass`          | `rgba(20, 21, 25, 0.78)` | `rgba(244, 243, 239, 0.84)` | Floating 3D PiP header, bottom status pill, canvas HUD overlays        |

### 2.2 Borders, Dividers & Lighting Highlights

| Token               | Dark Mode (Obsidian)        | Light Mode (Alabaster)      | Usage                                                          |
| :------------------ | :-------------------------- | :-------------------------- | :------------------------------------------------------------- |
| `--border-hairline` | `#1E2028`                   | `#E6E4DD`                   | Internal table rows, subtle section dividers                   |
| `--border-subtle`   | `#262932`                   | `#DCDAD0`                   | Standard `1px` panel dividers, card borders, input outlines    |
| `--border-strong`   | `#343844`                   | `#C8C5B8`                   | Hovered card border, modal outline, active input border        |
| `--border-focus`    | `#E05A47`                   | `#D94E3B`                   | Focused input ring, active tool card outline                   |
| `--highlight-top`   | `rgba(255, 255, 255, 0.06)` | `rgba(255, 255, 255, 0.85)` | `1px` inset top border highlight on elevated cards and buttons |

### 2.3 Typography & Iconography Colors

| Token              | Dark Mode (Obsidian) | Light Mode (Alabaster) | Usage                                                              |
| :----------------- | :------------------- | :--------------------- | :----------------------------------------------------------------- |
| `--text-primary`   | `#F3F4F6`            | `#18181B`              | Headings, active tool titles, hero stats, input values             |
| `--text-secondary` | `#9CA3AF`            | `#52525B`              | Subtitles, inactive nav items, secondary descriptions              |
| `--text-muted`     | `#5E6472`            | `#8E8E99`              | Section headers, unit suffixes (`mm`, `m²`, `deg`), shortcut hints |
| `--text-disabled`  | `#3E424D`            | `#B8B8C2`              | Disabled buttons and locked layer items                            |
| `--text-on-accent` | `#FFFFFF`            | `#FFFFFF`              | Text/icons inside primary Terracotta or Cobalt buttons             |

### 2.4 Brand, Telemetry & Status Accents

| Token                     | Dark Mode                  | Light Mode                | Usage                                                                             |
| :------------------------ | :------------------------- | :------------------------ | :-------------------------------------------------------------------------------- |
| `--accent-primary`        | `#E05A47`                  | `#D94E3B`                 | **Architectural Terracotta:** Active tool state, `+ New Project`, `Render 3D` CTA |
| `--accent-primary-soft`   | `rgba(224, 90, 71, 0.14)`  | `rgba(217, 78, 59, 0.10)` | Active tool card background tint, selected badge fill                             |
| `--accent-telemetry`      | `#3B82F6`                  | `#2563EB`                 | **Electric Cobalt:** Snapping guides, selection bounds, live data charts          |
| `--accent-telemetry-soft` | `rgba(59, 130, 246, 0.15)` | `rgba(37, 99, 235, 0.10)` | Telemetry badge fill, info highlight                                              |
| `--status-online`         | `#10B981`                  | `#059669`                 | Cloud Connected indicator dot (`CARVAZON3D`)                                      |
| `--status-warning`        | `#F59E0B`                  | `#D97706`                 | Unsaved changes, non-manifold wall warning                                        |
| `--status-danger`         | `#EF4444`                  | `#DC2626`                 | Delete project, Clear canvas confirm state                                        |

### 2.5 CAD Viewport & Drafting Semantics

| Token               | Dark Mode                   | Light Mode                 | Usage                                                                  |
| :------------------ | :-------------------------- | :------------------------- | :--------------------------------------------------------------------- |
| `--cad-grid-major`  | `rgba(255, 255, 255, 0.06)` | `rgba(24, 24, 27, 0.08)`   | `1000mm` (1m) primary structural grid lines                            |
| `--cad-grid-minor`  | `rgba(255, 255, 255, 0.02)` | `rgba(24, 24, 27, 0.03)`   | `100mm` subdivision grid lines                                         |
| `--cad-axis-x`      | `rgba(224, 90, 71, 0.45)`   | `rgba(217, 78, 59, 0.45)`  | Origin X-axis reference line                                           |
| `--cad-axis-y`      | `rgba(16, 185, 129, 0.45)`  | `rgba(5, 150, 105, 0.45)`  | Origin Y-axis reference line                                           |
| `--cad-dimension`   | `#D99B66`                   | `#B4692E`                  | **Warm Copper:** Dimension lines, architectural ticks, radius callouts |
| `--cad-wall-stroke` | `#F3F4F6`                   | `#18181B`                  | Exterior/Interior structural wall outline                              |
| `--cad-wall-fill`   | `#2A2E39`                   | `#52525B`                  | Poached/hatched wall core fill                                         |
| `--cad-room-fill`   | `rgba(217, 155, 102, 0.12)` | `rgba(180, 105, 46, 0.12)` | Closed room polygon warm architectural tint                            |

---

## 3. Typography & Scaling System

### 3.1 Three-Tier Font Stack

```css
--font-sans:
  "Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif;
--font-display: "Space Grotesk", "Outfit", sans-serif;
--font-mono: "JetBrains Mono", "Geist Mono", monospace;
```

- **`--font-sans` (UI & Navigation):** High x-height, neutral sans-serif for tool names, buttons, project titles, and menus.
- **`--font-display` (Hero Telemetry & Headers):** Technical geometric display font for dashboard greetings (`Welcome back`), large area statistics (`256.2 m²`), and building/floor identifiers.
- **`--font-mono` (CAD Precision & Metadata):** Strictly enforced for all coordinates, wall lengths (`12,213 mm`), percentages (`35%`), uppercase bracketed section headers (`[BIM DIMENSIONS]`), cloud sync IDs (`CARVAZON3D · UYD1VCNG`), and keyboard shortcut badges (`[B]`).

### 3.2 Typographic Scale & Line-Height

Base UI font size is **`12.5px` (`0.78125rem`)** inside the CAD Studio and **`13.5px` (`0.84375rem`)** on the Project Hub Dashboard.

| Token            | Size (`px` / `rem`)  | Weight | Line Height | Letter Spacing | Font Family      | Usage                                                                 |
| :--------------- | :------------------- | :----- | :---------- | :------------- | :--------------- | :-------------------------------------------------------------------- |
| `--text-hero`    | `28px` / `1.75rem`   | `600`  | `1.15`      | `-0.03em`      | `--font-display` | Dashboard banner stats (`256.2 m²`), Hero metrics                     |
| `--text-2xl`     | `22px` / `1.375rem`  | `600`  | `1.20`      | `-0.025em`     | `--font-display` | Inspector Spatial Summary value, Welcome heading                      |
| `--text-xl`      | `16px` / `1.00rem`   | `600`  | `1.30`      | `-0.015em`     | `--font-sans`    | Section titles (`Recent Projects`), Modal headers                     |
| `--text-lg`      | `14px` / `0.875rem`  | `600`  | `1.35`      | `-0.01em`      | `--font-sans`    | Project Card title (`Architectural Design 01`), Active Document title |
| `--text-base`    | `12.5px` / `0.78rem` | `500`  | `1.40`      | `0em`          | `--font-sans`    | Tool card titles (`Straight Wall`), Top bar buttons, Inspector labels |
| `--text-sm`      | `11.5px` / `0.72rem` | `400`  | `1.45`      | `+0.005em`     | `--font-sans`    | Tool subtitles (`240mm / 120mm`), Card timestamps (`Updated 11m ago`) |
| `--text-mono-md` | `12px` / `0.75rem`   | `500`  | `1.00`      | `0em`          | `--font-mono`    | Numeric input values (`2800`), Canvas dimension pills (`12,213 mm`)   |
| `--text-xs`      | `10px` / `0.625rem`  | `600`  | `1.20`      | `+0.08em`      | `--font-mono`    | Uppercase category headers (`BIM DIMENSIONS`, `DESIGNED AREA`)        |
| `--text-2xs`     | `9.5px` / `0.59rem`  | `600`  | `1.00`      | `+0.04em`      | `--font-mono`    | Keyboard shortcut badges (`B`, `F`), Unit suffixes (`mm`, `deg`)      |

---

## 4. Spacing, Scaffolds & Layout Grid

Built on a strict **4px spatial unit** (`4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px`).

### 4.1 Spatial Scale Tokens

| Token         | Value  | Usage                                                                  |
| :------------ | :----- | :--------------------------------------------------------------------- |
| `--space-1`   | `4px`  | Icon-to-badge gap, micro inline padding                                |
| `--space-1.5` | `6px`  | Vertical gap between compact tool cards in Left Drawer                 |
| `--space-2`   | `8px`  | Button group gap, icon-to-label gap, input internal horizontal padding |
| `--space-3`   | `12px` | Left Tool Drawer padding, Project card internal footer padding         |
| `--space-4`   | `16px` | Right Inspector padding, Top bar horizontal padding, Bento grid gap    |
| `--space-5`   | `20px` | Section spacing inside sidebars                                        |
| `--space-6`   | `24px` | Dashboard container padding, Welcome banner internal padding           |
| `--space-8`   | `32px` | Major layout separation on Project Hub                                 |

### 4.2 View A: Project Hub / Dashboard Layout (`localhost:5173/`)

- **Top Global Header:** `60px` height, `padding: 0 32px`, `border-bottom: 1px solid var(--border-subtle)`, sticky with `--bg-glass` blur.
  - **Left:** Brand mark (`28x28px` rounded-md terracotta/dark badge) + `AuraBIM` (`600` weight) + `STUDIO` (`--text-2xs` mono pill in `--bg-surface` with `1px` border).
  - **Center:** Recessed search bar (`width: 420px`, `height: 36px`, `background: var(--bg-input)`, `border: 1px solid var(--border-subtle)`, `border-radius: 8px`, `⌘K` mono shortcut badge on right).
  - **Right:** `Import .aur` (Ghost/Surface button, `height: 36px`) + `+ New Project` (Primary Terracotta button `#E05A47`, `height: 36px`) + User Profile Pill (`32px` avatar + name/role stack).
- **Main Container:** `max-width: 1360px`, centered, `padding: 32px`.
- **Telemetry Welcome Banner:**
  - Single horizontal architectural bento bar (`background: var(--bg-panel)`, `border: 1px solid var(--border-subtle)`, `border-radius: 12px`, `padding: 24px 32px`).
  - **Left (50%):** Greeting (`22px` Space Grotesk) + Sync subtitle (`12.5px` `--text-secondary`).
  - **Right (50%):** 3-column divided telemetry strip separated by `1px solid var(--border-subtle)` vertical hairlines:
    1. `TOTAL DESIGNS` (Label `--text-xs` mono muted above, Value `28px` `--font-display` below).
    2. `DESIGNED AREA` (Label `--text-xs` mono muted above, Value `28px` `--font-display` tabular-nums below).
    3. `CLOUD STATUS` (`8px` glowing `#10B981` dot + `Cloud Connected` + `CARVAZON3D · UYD1VCNG` in `--font-mono`).
- **Project Bento Grid:**
  - `display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;`
  - **Card Structure:** `border-radius: 10px`, `background: var(--bg-surface)`, `border: 1px solid var(--border-subtle)`, overflow hidden.
  - **Thumbnail Viewport (`190px` height):** Displays the 2D/3D preview over `--bg-canvas` grid. Floating bottom-left badges (`1 Rooms`, `256.2 m²`) use `--bg-glass` with `backdrop-filter: blur(8px)` and `--font-mono` `11px` text.
  - **Card Footer (`padding: 14px 16px`):** Title (`14px` weight `600`) + 3-dot action icon on top row; Timestamp (`Updated 11m ago`) + `[6 walls]` mono badge on bottom row.

### 4.3 View B: 2D/3D CAD Studio Workspace Layout

- **Full-Viewport Lock:** `100vw x 100vh`, `overflow: hidden`, CSS Grid shell.
- **Top Command Bar:** `48px` height, `padding: 0 12px`, `background: var(--bg-panel)`, `border-bottom: 1px solid var(--border-subtle)`.
  - Left: Back to Hub button + Editable Project Title + Cloud Sync dot.
  - Center-Left: Quiet utility bar (`Save`, `Templates`, `Open`, `Export .aur`, `Blueprint`, `Clear` as `30px`-tall ghost buttons that reveal `--bg-surface` on hover).
  - Center-Right: Recessed View Switcher (`2D CAD | 3D View | Split Screen`) inside a `32px` `--bg-input` track.
  - Far-Right: Primary `Render 3D` CTA button (`height: 30px`, `background: var(--accent-primary)`).
- **Far-Left Mode Rail:** `52px` width, `background: var(--bg-shell)`, `border-right: 1px solid var(--border-subtle)`.
  - Houses mode switches (`Plan`, `Decor`, `Finishes`, `Lighting`). Active item features a `3px` vertical `--accent-primary` bar on the far left edge and a `36x36px` `--bg-surface` rounded-lg icon container.
- **Left Tool Drawer:** `268px` width, `background: var(--bg-panel)`, `border-right: 1px solid var(--border-subtle)`, scrollable content with `padding: 12px`.
- **Right Inspector Panel:** `260px` width, `background: var(--bg-panel)`, `border-left: 1px solid var(--border-subtle)`, `padding: 16px`.
- **Floating Bottom Telemetry Pill:** Positioned `16px` from bottom center of the canvas (`height: 34px`, `padding: 0 14px`, `border-radius: 9999px`, `background: var(--bg-glass)`, `border: 1px solid var(--border-subtle)`).

### 4.4 Border Radius Scale

| Token           | Value    | Usage                                                                     |
| :-------------- | :------- | :------------------------------------------------------------------------ |
| `--radius-xs`   | `4px`    | Keyboard shortcut badges (`[B]`), canvas dimension callouts (`12,213 mm`) |
| `--radius-sm`   | `6px`    | Numeric inputs, small action buttons, segmented control active tabs       |
| `--radius-md`   | `8px`    | Left drawer tool cards, search bar, standard buttons                      |
| `--radius-lg`   | `10px`   | Dashboard Project cards, inspector summary widgets                        |
| `--radius-xl`   | `12px`   | Floating 3D PiP window, Dashboard Welcome Banner, Modals                  |
| `--radius-full` | `9999px` | Bottom canvas zoom/pan pill, status indicator pills                       |

---

## 5. Lighting, Elevation & Surface Physics

| Elevation Level                | Dark Mode Recipe                                                                                                                                                   | Light Mode Recipe                                                                                                                                                    | Usage                                                             |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| **Level 0 (Recessed Well)**    | `background: #0B0C0E; box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);`                                                                                                | `background: #E6E4DD; box-shadow: inset 0 1px 2px rgba(24,24,27,0.06);`                                                                                              | Numeric inputs, search bar, segmented button track                |
| **Level 1 (Flat Panel)**       | `background: #141519; border: 1px solid #262932;`                                                                                                                  | `background: #F4F3EF; border: 1px solid #DCDAD0;`                                                                                                                    | Sidebars, Top Command Bar, Welcome Banner                         |
| **Level 2 (Interactive Card)** | `background: #1C1E24; border: 1px solid #262932; box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.2);`                                   | `background: #FFFFFF; border: 1px solid #DCDAD0; box-shadow: 0 2px 5px rgba(24,24,27,0.04);`                                                                         | Tool cards, Project Hub cards, Inspector metric box               |
| **Level 3 (Floating HUD)**     | `background: rgba(20,21,25,0.78); backdrop-filter: blur(16px) saturate(140%); border: 1px solid rgba(255,255,255,0.09); box-shadow: 0 12px 32px rgba(0,0,0,0.45);` | `background: rgba(244,243,239,0.85); backdrop-filter: blur(16px) saturate(140%); border: 1px solid rgba(24,24,27,0.1); box-shadow: 0 12px 28px rgba(24,24,27,0.08);` | Floating 3D Preview PiP window, Bottom Status Pill, Context Menus |

---

## 6. Component Blueprints

### 6.1 Compact CAD Tool Card (Left Drawer)

- **Height:** `44px` fixed (replaces tall multi-line pastel cards).
- **Layout:** Horizontal flex (`padding: 0 10px`, `gap: 10px`, `align-items: center`).
- **Icon:** `16x16px` monochrome stroke icon (`stroke-width: 1.75px`, `color: var(--text-secondary)`). No colored background box.
- **Label Stack:** Title (`12.5px` `--text-primary` weight `500`) + inline or single-line muted spec (`240mm`).
- **Right Key Badge:** `20x20px` square badge (`background: var(--bg-input)`, `border: 1px solid var(--border-subtle)`, `border-radius: 4px`, `--font-mono` `10px` `--text-muted`).
- **Active State:** `background: var(--accent-primary-soft)`, `border-color: var(--accent-primary)`, icon and title turn `--accent-primary`.

### 6.2 Inspector Recessed Numeric Input

- **Height:** `28px`.
- **Layout:** Label on left (`12px` `--text-secondary`), input box on right (`width: 96px`).
- **Input Box:** `background: var(--bg-input)`, `border: 1px solid var(--border-subtle)`, `border-radius: 6px`, `padding: 0 8px`.
- **Value & Unit:** Value left-aligned in `--font-mono` `12px` `--text-primary`; unit (`mm`, `deg`, `%`) right-aligned inside the box in `--font-mono` `10px` `--text-muted`.
- **Focus State:** `border-color: var(--accent-telemetry)`, `box-shadow: 0 0 0 2px var(--accent-telemetry-soft)`.

### 6.3 Canvas Dimension Callout Badge

- **Background:** `rgba(20, 21, 25, 0.90)` (Dark) / `rgba(24, 24, 27, 0.88)` (Light) — always dark high-contrast badge for instant legibility over floor plans.
- **Border:** `1px solid var(--cad-dimension)` (`#D99B66`).
- **Text:** `11px` `--font-mono` `#F3F4F6` (`font-variant-numeric: tabular-nums`), `padding: 2px 6px`, `border-radius: 4px`.

---

## 7. Production CSS Tokens (`globals.css`)

```css
@import url("[https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap](https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap)");

:root,
[data-theme="dark"] {
  /* Font Families */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display: "Space Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Core Surfaces (Obsidian Studio) */
  --bg-canvas: #0d0e11;
  --bg-shell: #111216;
  --bg-panel: #141519;
  --bg-surface: #1c1e24;
  --bg-surface-hover: #242730;
  --bg-surface-active: #2a2e39;
  --bg-input: #0b0c0e;
  --bg-glass: rgba(20, 21, 25, 0.78);

  /* Borders & Specular Lighting */
  --border-hairline: #1e2028;
  --border-subtle: #262932;
  --border-strong: #343844;
  --border-focus: #e05a47;
  --highlight-top: inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
  --shadow-card:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 2px 6px rgba(0, 0, 0, 0.22);
  --shadow-hud: 0 12px 32px rgba(0, 0, 0, 0.45);
  --shadow-input: inset 0 1px 2px rgba(0, 0, 0, 0.5);

  /* Text Hierarchy */
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --text-muted: #5e6472;
  --text-disabled: #3e424d;
  --text-on-accent: #ffffff;

  /* Accents & Status */
  --accent-primary: #e05a47;
  --accent-primary-hover: #eb6957;
  --accent-primary-soft: rgba(224, 90, 71, 0.14);
  --accent-telemetry: #3b82f6;
  --accent-telemetry-soft: rgba(59, 130, 246, 0.15);
  --status-online: #10b981;
  --status-warning: #f59e0b;
  --status-danger: #ef4444;

  /* CAD Viewport Tokens */
  --cad-grid-major: rgba(255, 255, 255, 0.06);
  --cad-grid-minor: rgba(255, 255, 255, 0.02);
  --cad-dimension: #d99b66;
  --cad-wall-stroke: #f3f4f6;
  --cad-wall-fill: #2a2e39;
  --cad-room-fill: rgba(217, 155, 102, 0.12);

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}

[data-theme="light"] {
  /* Core Surfaces (Warm Alabaster) */
  --bg-canvas: #eae8e3;
  --bg-shell: #f0efea;
  --bg-panel: #f4f3ef;
  --bg-surface: #ffffff;
  --bg-surface-hover: #faf9f6;
  --bg-surface-active: #f0efea;
  --bg-input: #e6e4dd;
  --bg-glass: rgba(244, 243, 239, 0.85);

  /* Borders & Ambient Lighting */
  --border-hairline: #e6e4dd;
  --border-subtle: #dcdad0;
  --border-strong: #c8c5b8;
  --border-focus: #d94e3b;
  --highlight-top: inset 0 1px 0 0 rgba(255, 255, 255, 0.85);
  --shadow-card: 0 2px 5px rgba(24, 24, 27, 0.04);
  --shadow-hud: 0 12px 28px rgba(24, 24, 27, 0.08);
  --shadow-input: inset 0 1px 2px rgba(24, 24, 27, 0.06);

  /* Text Hierarchy */
  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-muted: #8e8e99;
  --text-disabled: #b8b8c2;
  --text-on-accent: #ffffff;

  /* Accents & Status */
  --accent-primary: #d94e3b;
  --accent-primary-hover: #c4412f;
  --accent-primary-soft: rgba(217, 78, 59, 0.1);
  --accent-telemetry: #2563eb;
  --accent-telemetry-soft: rgba(37, 99, 235, 0.1);
  --status-online: #059669;
  --status-warning: #d97706;
  --status-danger: #dc2626;

  /* CAD Viewport Tokens */
  --cad-grid-major: rgba(24, 24, 27, 0.08);
  --cad-grid-minor: rgba(24, 24, 27, 0.03);
  --cad-dimension: #b4692e;
  --cad-wall-stroke: #18181b;
  --cad-wall-fill: #52525b;
  --cad-room-fill: rgba(180, 105, 46, 0.12);
}

/* Global Reset & Ergonomics */
body {
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 12.5px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  user-select: none;
}

/* Tabular Numerals for All Telemetry & Inputs */
input[type="number"],
.tabular-nums,
.cad-metric,
.cad-dimension-pill {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

/* Reusable Surface Primitives */
.aura-panel {
  background: var(--bg-panel);
  border-color: var(--border-subtle);
}

.aura-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.aura-card:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-strong);
}

.aura-card[data-active="true"] {
  background: var(--accent-primary-soft);
  border-color: var(--accent-primary);
}

.aura-glass-hud {
  background: var(--bg-glass);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-hud);
}

.aura-input-recessed {
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.aura-input-recessed:focus-within {
  border-color: var(--accent-telemetry);
  outline: none;
  box-shadow: 0 0 0 2px var(--accent-telemetry-soft);
}
```
