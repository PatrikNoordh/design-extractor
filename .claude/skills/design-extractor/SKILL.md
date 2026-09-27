---
name: design-extractor
description: >
  Extracts the ENTIRE design system from an existing codebase (repo) and exports it
  to a single runnable Figma plugin script that automatically creates tokens, components,
  AND frames. Always use this skill when the user wants to: move their design from code
  to Figma/Pencil, extract design tokens from a repo, sync a codebase design to a design
  tool, generate a design system from existing code, reverse-engineer their app design,
  export colors/typography/spacing/components/pages from their app, or get their entire
  app design into Figma automatically. Works for web (Tailwind, CSS, React, Vue), SwiftUI and
  Android (XML Views and Jetpack Compose). Triggers on phrases like: "design to figma",
  "extract design", "design tokens", "code to figma", "export design",
  "design system from repo", "reverse design", "get my design into figma",
  "components to figma", "frames to figma", "whole design to figma".
---

# Design Extractor Skill

Takes the **entire design** from a repo and generates a single JS script that the user
pastes into the Figma Console. The script automatically creates tokens, components and frames.

> **First time on a new project?** Run `setup-extractor.md` (in this folder) to calibrate
> the skill for your framework and styling approach before generating the script.

## End result for the user

```
1. Claude Code runs the skill against the repo
2. Generates a single figma-import.js script
3. User opens Figma
4. Menu → Plugins → Development → Open Console
5. Paste the script → Enter
6. The entire design is created automatically in Figma
```

**One paste. One Enter. Done.**

---

## What the skill does

Given a repo, you will:

1. **Analyze** the codebase and identify all design-related information
2. **Extract** tokens, components and every screen
3. **Generate** a single combined Figma plugin script from the canonical template
4. **Validate** it (`scripts/validate.sh`, which also executes it against a Figma API mock)
5. **Deliver** the script, a summary and run instructions

---

## Step 1: Identify framework and design approach

Look at the file structure and determine:

| Signal in code | Framework |
|---|---|
| `tailwind.config.js/ts` | Tailwind CSS |
| `*.module.css`, `styles/` | CSS Modules |
| `styled-components`, `emotion` | CSS-in-JS |
| `tokens.js`, `theme.js`, `design-tokens.*` | Explicit tokens |
| `*.swift`, `Color+Extensions.swift` | SwiftUI |
| `styles.ts` with export object | React Native |
| `variables.css`, `:root { --` | CSS Custom Properties |
| `res/layout/*.xml` inflated by Activities/Fragments (`setContentView(R.layout…)`, `…Binding.inflate`) | Android — XML Views |
| `@Composable`, `setContent {`, `androidx.compose` imports | Android — Jetpack Compose |

An Android project can use **both** XML Views and Compose (e.g. Compose screens + XML
notification RemoteViews or widgets). Detect both and report how much UI each covers — count
screens per technology (Activities/Fragments with layouts vs `setContent` roots + `NavHost`
routes) in `design-system-summary.md`.

Always read these files if they exist:
- `tailwind.config.*`
- `tokens.*` / `theme.*` / `design-tokens.*`
- `styles/globals.css` or `app/globals.css`
- `src/styles/variables.*`
- Any files named `colors`, `color`, `typography`, `type`, `spacing`, `dimens`, `shapes`, `theme`
- Android: every `res/values*/*.xml` holding `<color>`, `<dimen>` or `<style>` (styles are often in
  `themes.xml`, not `styles.xml`), and in Compose apps the `ui/theme/` (or `…/theme/`) folder:
  `Color.kt`, `Type.kt`, `Shape.kt`, `Theme.kt`, spacing/dimension objects

---

## Step 2: Extract design tokens

### Priority order (highest → lowest):
1. **Explicit token file** (theme.js, tokens.json, Compose `Color.kt` / `Type.kt` / `Spacing` objects, SwiftUI color/font extensions) → read directly
2. **Tailwind config** → extract `colors`, `fontFamily`, `fontSize`, `spacing`, `borderRadius`
3. **CSS Custom Properties** (`:root { --color-primary: ... }`) → parse variables
4. **Android XML resources** → `res/values*/colors.xml`, `dimens.xml`, styles in any values XML
5. **CSS-in-JS theme object** → extract theme structure
6. **Hardcoded values** in components → collect unique values (including one-off gradient stops)

When a Compose app also has XML resources, the Kotlin theme objects are the source of truth;
XML colors that merely mirror them (window background, notification accents) keep their own
token names but should be noted as mirrors.

### Token naming
All token keys are **camelCase** in every framework (`textPrimary`, `navyBlue`, `spacingLg`).
The template, the validator and all helpers expect camelCase keys.

### What to look for

```
COLORS:
- Primary, secondary, accent, background, surface, text, border, error, success, warning
- Every one-off color used in components or gradients

TYPOGRAPHY:
- fontFamily (all unique fonts, mapped per Rule 5)
- fontSize, fontWeight (100–900), lineHeight (px vs multiplier — keep the unit), letterSpacing

SPACING:
- All spacing values, mapped to a scale (4, 8, 12, 16, 24, 32, 48, 64...)

BORDER:
- borderRadius (none, sm, md, lg, full), borderWidth

SHADOWS / ELEVATION:
- CSS box-shadow, Android elevation, Compose shadowElevation, SwiftUI .shadow()

SIZES:
- Fixed dimensions that are not spacing (button height, touch target, sidebar width)

DARK MODE:
- Dark values for the same color keys (see "Dark mode" below)
```

### Android XML token extraction

**Colors** (`<color name="…">`):
- Token name: drop a `color_` prefix if present, camelCase the rest
  (`color_text_primary` → `textPrimary`, `night_sky_navy_blue` → `nightSkyNavyBlue`)
- Android hex is `#AARRGGBB` (or `#RRGGBB`, `#ARGB`, `#RGB`): store `#RRGGBB` as the token and
  keep any alpha < FF as a separate alpha where the color is used
- Count references (`@color/x`, `R.color.x`); list unreferenced colors (template leftovers such
  as `purple_500`, `teal_200`) as unused in the summary

**Dimens** (`<dimen name="…">`) — classify by unit and meaning, not only by prefix:
- `sp` → font size
- `dp` whose name contains `radius` / `corner` → radius
- `dp` whose name contains `spacing`, `gap`, `margin`, `padding`, `space` → spacing
- any other `dp` (heights, widths, touch targets, icon sizes) → `sizes`
- Names with `spacing_*`, `radius_*`, `font_size_*` prefixes map directly; the prefix is a hint,
  not a requirement

**Styles** (`<style>` in any `res/values*/*.xml`):
- Resolve inheritance recursively: explicit `parent="…"` and implicit dot-parents
  (`Theme.App.Transparent` inherits `Theme.App`). Record the chain and its depth.
- A `style="@style/X"` on a widget in a layout applies X; an attribute set on the widget overrides it
- `TextAppearance.*` styles: read `android:textSize`, `android:fontFamily`, `android:textStyle`
- Font weight: `sans-serif-thin` = 100, `sans-serif-light` = 300, `sans-serif` = 400,
  `sans-serif-medium` = 500, `sans-serif-black` = 900, `textStyle="bold"` = 700
- Resolve `@dimen/` and `@color/` references with the maps above
- Values that come from **outside the repo** cannot be read: theme attributes (`?attr/…`,
  `?android:attr/textColorPrimary`) and framework styles (`@android:style/TextAppearance.Material.*`,
  `Theme.Material*`). Use the documented Material default for the app's theme (light/dark), and
  list every such value as **approximated** in the summary.

### Android Jetpack Compose token extraction

- **Colors:** `val X = Color(0xAARRGGBB)` in any object or file (`Color.kt`, `*Colors.kt`).
  `Color(0xFF…)` → `#RRGGBB`. `X.copy(alpha = a)` at a use site → the token plus alpha `a`.
- **Color scheme:** `darkColorScheme(…)` / `lightColorScheme(…)` in `Theme.kt`. Record which M3
  slots (`primary`, `surface`, `onSurface`, …) map to which tokens. Material3 components that
  paint a slot the scheme does **not** override (e.g. `surfaceContainerLow` for
  `ModalBottomSheet`) use the M3 baseline default — add it as its own token
  (`m3SurfaceContainerLow`) and flag it as a platform default.
- **Typography:** `TextStyle(fontFamily, fontWeight, fontSize = N.sp, lineHeight = N.sp,
  letterSpacing = N.sp)` → size, weight (`FontWeight.Thin/ExtraLight/Light/Normal/Medium/
  SemiBold/Bold/ExtraBold/Black` = 100…900), `lineHeightPx`, `letterSpacing` (px).
  `FontFamily.Default` / `FontFamily.SansSerif` → Roboto. A named family backed by
  `FontFamily.Default` is still Roboto — say so in the summary.
- **Shapes:** `RoundedCornerShape(N.dp)` → radius N; `RoundedCornerShape(50)` (percent) or
  `CircleShape` → full/pill (9999).
- **Spacing / sizes:** `val X = N.dp` in a `Spacing` / `Dimens` object → spacing; component-level
  `private val ButtonHeight = 56.dp` → sizes.
- **Gradients:** `Brush.verticalGradient/horizontalGradient(listOf(…))` → `linearGradient`
  stops; `Brush.radialGradient` → `radialGradient`. Stops with `.copy(alpha = …)` keep that alpha.
  Every hardcoded `Color(0x…)` stop becomes a token.
- **Elevation:** `shadowElevation` / `Modifier.shadow(N.dp)` → shadow token.
  `tonalElevation` is a color overlay, not a shadow — do not map it to a shadow.

### Dark mode

- Android: `res/values-night/colors.xml` (and `-night` style overrides), Compose
  `isSystemInDarkTheme()` switching between `lightColorScheme` / `darkColorScheme`
- Web: `@media (prefers-color-scheme: dark)`, `.dark` class (Tailwind `darkMode`), `[data-theme=dark]`
- SwiftUI: color sets in `Assets.xcassets` with a dark appearance

If dark values exist, put them in `tokens.colorsDark` using the **same keys** as `tokens.colors`.
The template creates them as `Colors/Dark/<key>` paint styles (works on every Figma plan).
If the app is dark-only or light-only, leave `colorsDark` empty and say so in the summary.

### Shadows

`tokens.shadows = { key: { x, y, blur, spread, color: '#RRGGBB', alpha } }`.
- CSS `box-shadow: 0 1px 3px rgba(15,23,42,.1)` → `{ x: 0, y: 1, blur: 3, spread: 0, color, alpha: 0.1 }`
- Android `elevation` / `cardElevation` Ndp, Compose `shadowElevation` → approximate
  `{ x: 0, y: N/2, blur: N, spread: 0, color: <black token>, alpha: 0.2 }` and flag as approximated
- SwiftUI `.shadow(color:radius:x:y:)` → blur = 2 × radius

The template creates them as `Shadows/<key>` effect styles; nodes use `shadow: '<key>'`.

---

## Step 3: Extract components

Scan component files (`.tsx`, `.jsx`, `.vue`, `.swift`, `.html`, `res/layout/*.xml`, and
`@Composable` functions) and document, for each component: name, variants, props that affect
appearance, which tokens it uses, and whether each variant was **parsed** from code or
**inferred** (from convention or from a platform default).

**One Figma component per variant.** A variant is any distinct visual state a real call site
uses (Primary/Secondary, On/Off, Selected/Unselected, Optimal/Good/Minimal…).

### Android XML components

Scan **all** of `res/layout/*.xml` (not only `component_*.xml`):

| XML | Figma |
|---|---|
| `MaterialButton` | Button — `android:backgroundTint` (fill), `app:cornerRadius`, `android:textColor`, `app:strokeColor` |
| `MaterialCardView` | Card — `app:cardBackgroundColor`, `app:cardCornerRadius`, `app:strokeColor`, `app:cardElevation` → shadow |
| `MaterialToolbar` | Top bar — `android:background`, `android:layout_height` |
| `TextView` | Text node — resolve `style` + `android:textAppearance` + attribute overrides |
| A file used through `<include layout="…">` | Its own component; the includer places an instance |
| One `style="@style/X"` shared by several widgets | One component per style variant (a widget that overrides a style attribute is another variant) |
| `LinearLayout` | Auto layout (`orientation` → direction) |

Layout attributes: `match_parent` → `fill`, `0dp` + `layout_weight` → `grow`, `wrap_content`
→ hug, `layout_margin*` → spacer (or parent padding), `gravity`/`layout_gravity` → `align`.

Button variants: if a project has only one `MaterialButton` style, infer secondary (transparent
+ stroke) and ghost (transparent, no stroke) from Material Design convention — mark as inferred.

### Jetpack Compose components

Scan `@Composable fun` in `components/`, `ui/`, `ui/components/`, `designsystem/` (and any
composable reused by two or more screens). Read:
- M3 components used inside (`Button`, `OutlinedButton`, `TextButton`, `Card`, `Switch`, …) and
  their `colors = …Defaults.…Colors(…)`, `shape`, `border`, `elevation`
- Modifiers: `background(color|brush, shape)`, `border(width, color, shape)`, `clip(shape)`,
  `padding`, `height`/`size`, `fillMaxWidth()`, custom modifier extensions (`Modifier.glassCard()`)
- Parameters that switch the look (`isSelected`, `quality`, `enabled`) → one variant each
- `@Preview` functions → sample text and data for the component

### Platform widgets

Widgets that come from the platform with no source in the repo (M3 `TimePicker`, `DatePicker`,
`Switch`, `Slider`, `NavigationBar`, SwiftUI `Toggle`/`Picker`): use the recipes in
`references/platform-widgets.md`. A widget without a recipe must be listed in the summary as
"approximated as a plain shape".

Read the reference files for full guides:
→ `references/component-patterns.md`
→ `references/platform-widgets.md`

---

## Step 4: Extract frames (screens)

**Every screen the user can reach gets a frame** — not one per entry file.

- **Next.js App Router**: `app/**/page.tsx`
- **Next.js Pages**: `pages/**/*.tsx`
- **HTML**: all `.html` files
- **React Router**: every route in `App.tsx` / `router.tsx`
- **Vue**: `views/**/*.vue` / every router route
- **SwiftUI**: every `*View.swift` destination — `NavigationStack` / `NavigationLink`, every `TabView` tab, sheets
- **Android XML Views**: each Activity/Fragment with its `res/layout/activity_*.xml` /
  `fragment_*.xml`; every destination in `res/navigation/*.xml`
- **Android Compose**: each `setContent {}` root; if it contains a `NavHost`, **every
  `composable(route)`** is its own screen, including tabs behind a bottom `NavigationBar`.
  An Activity with a translucent theme showing a sheet/dialog is a screen (dimmed window + sheet).

**Pagers and steppers count page by page.** A route that swipes or steps through pages
(Compose `HorizontalPager` / `VerticalPager`, View `ViewPager2`, SwiftUI `TabView` with
`.tabViewStyle(.page)`, web carousels and multi-step forms/wizards) is **one frame per page**,
named `<Screen> <n>/<total> – <page title>` (e.g. `Onboarding 3/8 – Wake Time`). The user sees
each page as a separate screen — onboarding flows are the usual case. Shared chrome (back button,
page indicator with the current dot active) is repeated on every page frame.

**States and dialogs are frames too — stacked below their screen.** The first frame of a screen
is its normal content. Then, with `variantOf: '<screen name>'` so they stack in a column under it:
- **Every distinct UI state.** Compose: the branches of `when (state) { is Loading -> …; is Empty
  -> …; is Error -> … }` over a `sealed class/interface …UiState`, plus conditional blocks that
  change the screen (`if (warning != null) Banner()`). SwiftUI: `switch` over a state enum /
  `if isLoading`. Web: `isLoading` / `error` / empty-list branches. Name them
  `<Screen> – Loading`, `<Screen> – Empty`, `<Screen> – Error`. If two states look identical
  (same layout, only the message differs), draw one and list the other in the summary. A state
  identical to a frame already drawn (e.g. a full-screen spinner = the Splash frame) is listed,
  not drawn again. Use the real error string the ViewModel maps that state to.
- **Every dialog.** Compose `AlertDialog` / `Dialog` / `DatePickerDialog` / time-picker dialogs /
  `ModalBottomSheet` shown behind an `if (showX)` flag; Views `MaterialAlertDialogBuilder` /
  `DialogFragment`; SwiftUI `.alert` / `.sheet` / `.confirmationDialog`; web modals. Frame = the
  host screen's own sections + one last `{ overlay: true }` section: the scrim with the dialog
  centred in it (recipe: `references/platform-widgets.md` → AlertDialog). Name them
  `<Screen> – <Dialog title> dialog`.
- **Not drawn:** transient messages (Snackbar, Toast) and in-between animation frames — list
  them in the summary instead.

Mobile frame size: 390×844. Sample content from `strings.xml` / localisation files (placeholders
filled with `@Preview` / fixture values).

Read the reference file for the full guide:
→ `references/frame-generator.md`

---

## Step 5: Generate the combined script

**ALWAYS generate a single combined script** — not three separate ones — starting from the
canonical template in `references/frame-generator.md`. Replace the sample `tokens`,
`components`, `pages`, `FRAME_SIZES`, `FONT_FALLBACKS` and `WIDGET_BUILDERS`; keep every helper
function as-is (`solidColor`, `linearGradient`, `radialGradient`, `loadWeights`, `loadFonts`,
`fontFor`, `applyTypography`, `txt`, `createTokenStyles`, `applyContainer`, `setInstanceTexts`,
`buildNode`, `createComponents`, `buildFrame`, `buildFrames`, `runPhase`). Set `DEFAULT_TEXT_STYLE`,
`DEFAULT_TEXT_COLOR` and `DEFAULT_BACKGROUND` to real token keys — helpers fall back to these,
never to a hardcoded key.

The script runs four phases with top-level await, each wrapped in `runPhase`:
`[1/4]` load fonts → `[2/4]` token styles (colors, dark colors, text, shadows, number variables)
→ `[3/4]` components → `[4/4]` frames.

---

## Step 6: Deliver

Always deliver:
1. **`figma-import.js`** — the combined script, ready to run
2. **`design-system-summary.md`** — containing:
   - framework(s) detected and how much UI each covers
   - token counts per group, with source file per token group; unused/mirrored tokens
   - style chains (Android) and their depth
   - dark mode: found and exported, or absent
   - every component variant with **parsed / inferred**
   - every screen → frame, with its source file; every state / dialog frame under it; states and
     dialogs that were listed instead of drawn (identical layouts, snackbars, toasts)
   - every approximation (theme attributes, framework styles, platform defaults, gradients,
     platform widgets without a recipe, glyphs a font may lack)
   - anything that could not be extracted
3. **Three-line instructions** on how to run it in Figma

---

## Step 7: Self-validate before delivering

After generating `figma-import.js`, run the validator:

```bash
bash .claude/skills/design-extractor/scripts/validate.sh figma-import.js
```

It greps for the rule violations below, parses the script (`node --check`), statically checks
every token reference (`scripts/check-tokens.mjs`), and executes the script against a mock Figma
API (`scripts/dry-run.mjs`) that fails on Rule 11 and Rule 12 violations, invalid auto-layout
sizing, fonts that were never loaded (with real per-family style names), invalid colors, and any
warning or skipped item. Its summary line counts pages, components, frames, styles and variables —
compare them with what you extracted.

If any check fails: fix the script, re-run the validator. Do not deliver until exit code is 0.

Use the checklist below as a fix guide when the validator reports a failure:

### Rule violations (instant fail — fix before delivering)

- [ ] **Rule 1 – Page count**: exactly 2 pages (`🧩 Components` and `📐 Frames`).
- [ ] **Rule 2 – No placeholders**: frames contain real text, instances and widgets — no empty labelled boxes.
- [ ] **Rule 3 – Token connections**: every color is `C.<key>` defined in `tokens.colors`; every typography/shadow key exists (checked by `check-tokens.mjs`).
- [ ] **Rule 4 – Frame sizes**: a 390 mobile frame for every screen; 1440 desktop too, unless the script states `// Rule 4: desktop frames omitted — <reason>`.
- [ ] **Rule 5 – Font mapping**: no device fonts as a family value (comments are fine).
- [ ] **Rule 6 – lineHeight unit**: never `MULTIPLIER`.
- [ ] **Rule 7 – Top-level await**: no async IIFE.
- [ ] **Rule 8 – setCurrentPageAsync**: no `figma.currentPage =`.
- [ ] **Rule 9 – No figma.notify / figma.closePlugin**.
- [ ] **Rule 10 – String quoting**: repo strings single-quoted with `'` and `\` escaped (a syntax error here fails `node --check`).
- [ ] **Rule 11 – No children on instances**: instances are changed with `texts` / `label` overrides; new children only via `detach` (checked by the dry run).
- [ ] **Rule 12 – Icons as shapes**: no icon glyphs (☰ ✕ ➜ …) in text — use `WIDGET_BUILDERS` (checked by the dry run).
- [ ] **Rule 13 – Sample data only**: no real user or API data in frames; personal data only as obvious placeholders.
- [ ] **Rule 14 – Unit conversions**: rem, clamp(), dp/sp and media queries resolved per frame width.
- [ ] **Rule 15 – Approximations listed**: every approximation is in `design-system-summary.md`.

### Structure checks

- [ ] Script parses — validate.sh runs `node --check` on it
- [ ] Components use `figma.createComponent()`, not `figma.createFrame()`
- [ ] `runPhase` helper is defined and all four phases use it
- [ ] Each component loop, frame loop and child loop has its own per-item try-catch
- [ ] Progress `console.log` messages present at start of each phase (`[1/4]` … `[4/4]`)
- [ ] Dry run clean: `errors=0` in the `DRY_RUN` summary line

---

## Framework compatibility

| Framework | Tokens | Components | Frames |
|-----------|--------|------------|--------|
| Next.js (Tailwind) | ✅ Automatic | ✅ Automatic | ✅ Automatic |
| React + CSS Modules | ✅ Good | ✅ Good | ✅ Good |
| HTML/CSS | ✅ CSS vars | ✅ Manual scan | ✅ Per .html file |
| SwiftUI | ⚠️ Color extensions | ✅ Views | ✅ Every destination |
| Vue | ✅ Automatic | ✅ Automatic | ✅ Automatic |
| Android XML Views | ✅ values XML + style chains | ✅ Layout XML | ✅ Activities / Fragments / nav graph |
| Android Jetpack Compose | ✅ Kotlin theme objects | ✅ `@Composable` components | ✅ Every `NavHost` route |
| C++ / Qt | ⚠️ Manual | ⚠️ .ui files | ⚠️ Widget tree |

Claude Code adapts the extraction per framework automatically.

---

## Key principles

- **Never modify the project's source** — read only. (Running `setup-extractor.md` may update
  this skill's own "Local Project Formatting" section; that is the only write besides the outputs.)
- **Assume gracefully** — if unsure of a semantic name, use the technical value
- **Flag gaps** — clearly state what could not be extracted automatically or was approximated
- **Keep it portable** — output must work without knowing the specific repo

---

## CRITICAL RULES — Always follow these

These are hard rules learned from real usage. Never violate them.

### Rule 1: NEVER create multiple Figma pages
Figma's free plan only allows 3 pages. Creating one page per route will immediately hit this limit.

**ALWAYS put everything on maximum 2 pages:**
```
Page 1: "🧩 Components"  → all components side by side
Page 2: "📐 Frames"      → ALL screen frames side by side on one canvas
```

Screens go next to each other horizontally with 80px gap — never on separate Figma pages. A
screen's states and dialogs (`variantOf`) are stacked in a column below it, also 80px apart.

```javascript
// WRONG ❌ — creates a new Figma page per route
const figmaPage = figma.createPage();

// CORRECT ✅ — all frames on one page, positioned with xOffset
let xOffset = 0;
for (const pageData of pages) {
  const frame = figma.createFrame();
  frame.x = xOffset;
  frame.y = 0;
  xOffset += (frame.width || 390) + 80;
  figma.currentPage.appendChild(frame);
}
```

### Rule 2: NEVER use placeholder boxes for frame content
Frames must use actual text, component instances, colors, spacing and structure from the
extracted design — not labeled placeholder rectangles, and not empty sections. Platform widgets
use a recipe from `references/platform-widgets.md`.

```javascript
// WRONG ❌ — an empty colored box named after what should be there
{ name: 'Search Bar', height: 48, bg: C.surface }

// CORRECT ✅ — real content from the repo
{ name: 'Search Bar', layout: 'HORIZONTAL', paddingX: S.base, height: 48, bg: C.surface,
  radius: R.md, align: 'CENTER', children: [
    { text: 'Search products', style: 'bodyBase', color: C.textSecondary }
  ] }
```

### Rule 3: Always connect frames to extracted tokens
Every color, font and spacing value in a frame must come from the extracted tokens — never use
hardcoded defaults like #3B82F6 if the repo has a different primary color. Every `C.<key>`,
typography key and shadow key must exist in `tokens` (`check-tokens.mjs` verifies this).

### Rule 4: Generate mobile-first frames
For each screen generate:
- Mobile frame (390px) — always first, primary for app projects
- Desktop frame (1440px) — placed 80px to the right of mobile — **only when the app has a
  desktop or tablet layout** (web apps; Android with `layout-sw600dp` / `WindowSizeClass`;
  iPad layouts). For phone-only apps remove the Desktop entry from `FRAME_SIZES` and add:

```javascript
// Rule 4: desktop frames omitted — phone-only Android app, no sw600dp / WindowSizeClass layouts
```

### Rule 5: Map system fonts to Figma-loadable fonts

Figma cannot load OS-level system fonts. Any system font reference found in the repo must be
mapped to the nearest Figma-available equivalent before generating the script.

| Source font | Map to |
|---|---|
| SF Pro, SF Pro Display, SF Pro Text | `'Inter'` |
| -apple-system, BlinkMacSystemFont | `'Inter'` |
| `.font(.system(...))` (SwiftUI) | `'Inter'` |
| system-ui | `'Inter'` |
| Roboto | `'Roboto'` (available in Figma) |
| Android: `sans-serif*` / Compose `FontFamily.Default` / `FontFamily.SansSerif` | `'Roboto'` |

Add a comment in the generated script noting the mapping so users know why the font differs
from their app (validate.sh ignores comment lines):
```javascript
// Note: SF Pro (iOS system font) mapped to Inter — Figma cannot load device fonts
```

Style names differ per family in Figma — Inter uses `Semi Bold` / `Extra Bold`, Roboto uses
`SemiBold` / `ExtraBold`. The template's `STYLE_CANDIDATES` + `fontFor()` try each spelling; never
hardcode a single style name.

### Rule 6: lineHeight must use PIXELS, PERCENT or AUTO — never MULTIPLIER

Figma does not accept `MULTIPLIER` as a lineHeight unit. Keep the unit the repo uses:

| Repo value | Token field | Figma |
|---|---|---|
| `24px`, `24.sp`, `lineSpacing` in pt | `lineHeightPx: 24` | `{ unit: 'PIXELS', value: 24 }` |
| `1.5`, `leading-normal` | `lineHeightMultiplier: 1.5` | `{ unit: 'PERCENT', value: 150 }` |
| not set | — | `{ unit: 'AUTO' }` |

Never guess the unit from the size of the number.

```javascript
// WRONG ❌
style.lineHeight = { unit: 'MULTIPLIER', value: 1.5 };
// WRONG ❌ — a 24px line height written as 24%
style.lineHeight = { unit: 'PERCENT', value: 24 };

// CORRECT ✅
style.lineHeight = { unit: 'PIXELS', value: 24 };
style.lineHeight = { unit: 'PERCENT', value: 150 };
style.lineHeight = { unit: 'AUTO' };
```

---

## ⚙️ Figma Script Generation Rules for Developer Console

When generating JavaScript meant to run directly in the Figma Developer Console, follow these
rules to prevent runtime crashes and deprecation warnings.

### Rule 7: NEVER use async IIFEs — use top-level await

The Figma console supports top-level `await` natively. Wrapping code in `(async () => { ... })()`
causes the plugin environment to close before async operations finish, crashing the script.

```javascript
// WRONG ❌
(async () => {
  await loadFonts();
  await createComponents();
})();

// CORRECT ✅
await runPhase('Load Fonts', async () => { await loadFonts(); });
await runPhase('Components', async () => { await createComponents(); });
```

### Rule 8: NEVER use `figma.currentPage =` — use `setCurrentPageAsync()`

The synchronous setter is deprecated and generates console warnings. Always use the async version:

```javascript
// WRONG ❌
figma.currentPage = page;

// CORRECT ✅
await figma.setCurrentPageAsync(page);
```

### Rule 9: Use `console.log` / `console.error` — NOT `figma.notify()` or `figma.closePlugin()`

`figma.notify()` relies on async timers that can crash when the console environment shuts down.
`figma.closePlugin()` terminates the environment mid-run when called from the console.

This applies at EVERY point in the script — including the very last line.

```javascript
// WRONG ❌ — anywhere in the script, including the final line
figma.notify('🎉 Done!', { timeout: 5000 });
figma.closePlugin();

// CORRECT ✅
console.log('🎉 SUCCESS: Design imported!');
```

### Rule 10: Quote and escape every string that comes from the repo

Strings from the repo (labels, titles, component names, `strings.xml` values) can contain both quote types — English UI text is full of apostrophes. Use single quotes as the outer delimiter **and escape `\` and `'` inside the value**, or emit the value with `JSON.stringify(value)`. Unescaped, either quote breaks the parser ("missing ) after argument list").

```javascript
// WRONG ❌ — the apostrophe ends the string
t.characters = 'How did last night's sleep feel?';

// CORRECT ✅ — escaped
t.characters = 'How did last night\'s sleep feel?';

// CORRECT ✅ — JSON.stringify output is always a valid JS string literal
t.characters = "Which actor plays \"The Dark Knight\"?";
```

Resolve source escapes **before** quoting: Android `strings.xml` stores `\'`, `\"`, `\n` and `&amp;`, and uses placeholders like `%1$d` / `%1$s` / `{name}` — decode them and fill placeholders with sample values (Rule 13) first, then escape for JS. `validate.sh` parses the script, so a quoting mistake fails the syntax check.

### Rule 11: NEVER append children to a component instance

Figma rejects `appendChild` on an `InstanceNode` (or anything inside one). Overriding is allowed: text, font size, fills and padding can all be changed on an instance. So, in order of preference:

1. **Override** — name every text layer in the component (`Label`, `Title`...) and change it on the instance with `texts: { Title: '…' }` (or `label:` for a single-text component).
2. **Plain frame** — if the screen needs a different structure (e.g. a header with a Back button), style a plain frame with the same builder function the component uses.
3. **Detach** — `{ detach: 'Component/Name', children: […] }` only as a last resort; the result is no longer linked to the component.

The dry run in `validate.sh` fails on this, but it only sees the code paths the script actually runs.

```javascript
// WRONG ❌ — throws: cannot add children to an instance
const card = componentRegistry['Card/Default'].createInstance();
card.appendChild(title);

// CORRECT ✅ — override the named text layers (node spec)
{ instance: 'Card/Default', texts: { Title: 'Revenue', Body: '$12,400 this month' } }

// CORRECT ✅ — the component needs new children: detach first (last resort)
{ detach: 'Card/Default', children: [ { instance: 'Badge/Primary', label: 'Beta' } ] }
```

### Rule 12: Draw icons as shapes — never as text glyphs

Glyphs like ☰, ✕ or ➜ are not in Inter and render as empty boxes. Draw icons from rectangles, ellipses or vectors as `WIDGET_BUILDERS` (see `menuIcon` in the template, and `references/platform-widgets.md`). If the repo uses an icon font or SVG set, draw the closest simple shape and list it as an approximation (Rule 15).

### Rule 13: Sample data only

Never copy runtime or API data (fixtures, seed files, database dumps, logged-in user details) into frames. Use made-up sample content that fits the layout. Personal data — names, phone numbers, emails, IDs — appears only as obvious placeholders ("Jane Doe", "+46 70 000 00 00") and only on screens where the app actually shows it.

### Rule 14: Convert units to pixels per frame

- `rem` / `em` → multiply by 16 (or the root font size if the repo changes it).
- Android `dp` / `sp` and iOS `pt` → 1:1 px (the 390-wide frame is a 1× logical canvas).
- `clamp(min, Xvw, max)` → evaluate at each frame's width: `min(max(min, X × width / 100), max)` — so 390 for mobile, 1440 for desktop.
- Media queries (and Android `-sw600dp` resources / `WindowSizeClass`) decide which rules apply to each frame: mobile gets the base styles plus any `max-width` rules that match 390; desktop gets the `min-width` rules that match 1440.
- `%` widths → `FILL` in auto layout; `vh` heights → a fraction of the frame's device height (844 / 960).

### Rule 15: List every approximation in the summary

Anything drawn differently from the app goes in `design-system-summary.md` under "Approximations": carousels drawn static, only the success state drawn, menus shown closed, fonts replaced by a fallback, icons simplified, grid layouts drawn as rows.

---

### Correct main block

Every generated script follows the canonical template in `references/frame-generator.md`:

```javascript
// === DESIGN IMPORT – [Project name] ===
// Generated by Claude Code [date]
// Run in: Figma → Plugins → Development → Open Console

const tokens = { colors, colorsDark, typography, spacing, radius, shadows, sizes };
const components = [ … ];
const pages = [ … ];
const FRAME_SIZES = [ … ];
const WIDGET_BUILDERS = { … };
// helpers, loadFonts, createTokenStyles, buildNode, createComponents, buildFrames, runPhase

// Top-level await — no IIFE wrapper
await runPhase('Load Fonts', async () => { … });   // logs [1/4]
await runPhase('Token Styles', async () => { … }); // logs [2/4]
await runPhase('Components', async () => { … });   // logs [3/4]
await runPhase('Frames', async () => { … });       // logs [4/4]
console.log('🎉 Import complete. Check each phase above for any partial failures.');
```

---

## Local Project Formatting

<!-- 
  This section is auto-generated by setup-extractor.md for each project.
  Run `setup-extractor.md` to populate this with your project's specific rules.
  DO NOT manually edit — re-run the audit workflow to regenerate.
-->

**Not yet calibrated for this project.**

To calibrate this skill for your specific framework and styling approach, run the setup workflow:

```
Open: .claude/skills/design-extractor/setup-extractor.md
Follow the 5-step audit workflow.
This section will be replaced with your project's rules.
```

### What will be detected and added here

- **Framework** (Next.js, Vue, Svelte, React, SwiftUI, Kotlin/Android, etc.)
- **Styling approach** (Tailwind, CSS Modules, Styled Components, CSS vars, XML resources, etc.)
- **Where to read from** (token files, component folders and variants, screen files)
- **Value conversions** (rem, clamp(), dp/sp, font mapping) and known gaps

---

## SwiftUI Project Notes (learned from SceneIt)

When extracting from a SwiftUI project:

- **Colors**: Read `Color+Extensions.swift` or `Assets.xcassets` color set JSON files. If a color
  set has a dark appearance, put it in `tokens.colorsDark` under the same key.
- **Token object**: Use the same `tokens.colors` object and `C` alias as every other framework —
  the helpers and the validator expect it.
- **Typography**: SwiftUI `.font(.system(size:weight:))` maps to `Inter` in Figma. Extract all
  unique sizes and weights into a semantic token table.
- **Spacing constants**: Look for `enum Spacing` or `struct Spacing` with static `let` values.
- **Corner radius**: Look for `enum CornerRadius` or extension on `CGFloat`.
- **Views → Frames**: Every destination view is one frame (see Step 4). Map `ZStack/VStack/HStack`
  to Figma frame layout direction.
- **Custom shapes** (`Shape` protocol): Cannot be reproduced exactly — approximate with nearest
  available Figma shape and note the limitation in `design-system-summary.md`.
- **Gradients**: use the template's `linearGradient` / `radialGradient` (or the `hGrad` / `vGrad`
  shorthands).
- **Text**: use the template's `txt(chars, styleKey, colorHex, alpha)` helper.
