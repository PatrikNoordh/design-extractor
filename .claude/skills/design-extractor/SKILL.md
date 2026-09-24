---
name: design-extractor
description: >
  Extracts the ENTIRE design system from an existing codebase (repo) and exports it
  to a single runnable Figma plugin script that automatically creates tokens, components,
  AND frames. Always use this skill when the user wants to: move their design from code
  to Figma/Pencil, extract design tokens from a repo, sync a codebase design to a design
  tool, generate a design system from existing code, reverse-engineer their app design,
  export colors/typography/spacing/components/pages from their app, or get their entire
  app design into Figma automatically. Triggers on phrases like: "design to figma",
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
2. **Extract** tokens, components and page layouts
3. **Generate** a single combined Figma plugin script
4. **Deliver** a ready-to-run script with instructions

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
| `res/values/colors.xml`, `res/values/dimens.xml` | Kotlin/Android (XML Views) |
| `*.kt` + `res/layout/activity_*.xml` | Kotlin/Android (XML Views) |

Always read these files if they exist:
- `tailwind.config.*`
- `tokens.*` / `theme.*` / `design-tokens.*`
- `styles/globals.css` or `app/globals.css`
- `src/styles/variables.*`
- Any files named `colors`, `typography`, `spacing`
- `res/values/colors.xml`, `res/values/dimens.xml`, `res/values/styles.xml` (Android)

---

## Step 2: Extract design tokens

### Priority order (highest → lowest):
1. **Explicit token file** (theme.js, tokens.json) → read directly
2. **Tailwind config** → extract `colors`, `fontFamily`, `fontSize`, `spacing`, `borderRadius`
3. **CSS Custom Properties** (`:root { --color-primary: ... }`) → parse variables
4. **Android XML resources** → parse `res/values/colors.xml`, `dimens.xml`, `styles.xml`
5. **CSS-in-JS theme object** → extract theme structure
6. **Hardcoded values** in components → collect unique values

### Android XML token extraction

When `res/values/colors.xml` is present:
- Parse every `<color name="...">` tag → token name + hex value
- Token name: strip `color_` prefix, camelCase the rest (e.g. `color_text_primary` → `textPrimary`)

When `res/values/dimens.xml` is present:
- `spacing_*` → spacing tokens (strip `dp` suffix, treat as px)
- `radius_*` → border radius tokens
- `font_size_*` → typography size tokens (strip `sp` suffix, treat as px)

When `res/values/styles.xml` is present:
- Resolve `TextAppearance.*` styles: read `android:textSize` and `android:fontFamily` / weight
- Font weight: `sans-serif` = 400, `sans-serif-medium` = 500, `sans-serif-bold` = 700
- Resolve `@dimen/` and `@color/` references inside style items using the values already extracted

### What to look for:

```
COLORS:
- Primary, secondary, accent, background, surface, text, border, error, success, warning

TYPOGRAPHY:
- fontFamily (all unique fonts)
- fontSize (all sizes with semantic names if possible: xs, sm, base, lg, xl, 2xl...)
- fontWeight, lineHeight, letterSpacing

SPACING:
- All spacing values, mapped to a scale (4, 8, 12, 16, 24, 32, 48, 64...)

BORDER:
- borderRadius (none, sm, md, lg, full), borderWidth

SHADOWS:
- All box-shadow values

BREAKPOINTS:
- sm, md, lg, xl, 2xl (or equivalent)
```

---

## Step 3: Extract components

Scan component files (`.tsx`, `.jsx`, `.vue`, `.swift`, `.html`, `res/layout/*.xml`) and document:

For each component: name, variants, props that affect appearance, which tokens it uses.

### Android XML component patterns

When scanning `res/layout/component_*.xml`:

| XML element | Figma component |
|---|---|
| `MaterialButton` | Button — read `android:backgroundTint` (fill), `app:cornerRadius` (radius), `android:textColor` (label color) |
| `MaterialCardView` | Card — read `app:cardBackgroundColor`, `app:cardCornerRadius`, `app:strokeColor` |
| `TextView` | Text node — resolve `android:textAppearance` via `styles.xml` for size + weight |
| `MaterialToolbar` | Nav bar — read `android:background`, `android:height` |

Resolve `@color/name` and `@dimen/name` references using the extracted token maps before setting values.
For `android:backgroundTint="@color/color_primary"` → use `tokens.colors.primary`.

Button variants: if only one layout file exists, infer secondary (transparent + stroke) and ghost (transparent, no stroke) from Material Design convention — note this as inferred in `design-system-summary.md`.

Read the reference file for full guide:
→ `references/component-patterns.md`

---

## Step 4: Extract frames (pages/views)

Identify all routes and analyze their layouts.

- **Next.js App Router**: scan `app/**/page.tsx`
- **Next.js Pages**: scan `pages/**/*.tsx`
- **HTML**: scan all `.html` files
- **SwiftUI**: scan all `*View.swift` files
- **React Router**: read `App.tsx` / `router.tsx`
- **Kotlin/Android**: scan `*Activity.kt` files — each Activity = one screen. Read its paired `res/layout/activity_*.xml` for layout structure. Mobile frame size: 390×844px.

Read the reference file for full guide:
→ `references/frame-generator.md`

---

## Step 5: Generate the combined script

**ALWAYS generate a single combined script** — not three separate ones.

Structure for `figma-import.js`:
```javascript
// === DESIGN IMPORT – [Project name] ===
// Generated by Claude Code [date]
// Run in: Figma → Plugins → Development → Open Console

const tokens = { colors: {...}, typography: {...}, spacing: {...} };
function solidColor(hex) { ... }

async function loadFonts() {
  // Collect every unique family+style from tokens.typography, then load them all
  const toLoad = new Set();
  for (const t of Object.values(tokens.typography)) {
    toLoad.add(JSON.stringify({ family: t.family, style: weightToStyle(t.weight) }));
  }
  // Always include fallback weights so helper text nodes never fail
  for (const family of [...new Set(Object.values(tokens.typography).map(t => t.family))]) {
    for (const style of ["Regular", "Medium", "Semi Bold", "Bold"]) {
      toLoad.add(JSON.stringify({ family, style }));
    }
  }
  for (const entry of toLoad) {
    try { await figma.loadFontAsync(JSON.parse(entry)); } catch {}
  }
}

async function createTokenStyles() { ... }

const components = [ ... ];
async function createComponents() { ... }

const pages = [ ... ];
async function buildFrames() { ... }

// One failing phase must not stop the others
async function runPhase(label, fn) {
  try { await fn(); } catch (err) { console.error(`❌ Phase "${label}" failed:`, err); }
}

// Top-level await — NO async IIFE (crashes Figma console before fonts load)
await runPhase('Load Fonts', async () => { console.log('⏳ [1/4] Loading fonts...'); await loadFonts(); });
await runPhase('Token Styles', async () => { console.log('⏳ [2/4] Creating token styles...'); await createTokenStyles(); });
await runPhase('Components', async () => { console.log('⏳ [3/4] Building components...'); await createComponents(); });
await runPhase('Frames', async () => { console.log('⏳ [4/4] Building frames...'); await buildFrames(); });
console.log("🎉 Import complete. Check each phase above for any partial failures.");
```

See full templates in:
→ `references/figma-plugin-template.md`
→ `references/frame-generator.md`

---

## Step 6: Deliver

Always deliver:
1. **`figma-import.js`** — the combined script, ready to run
2. **`design-system-summary.md`** — what was found and any gaps
3. **Three-line instructions** on how to run it in Figma

---

## Step 7: Self-validate before delivering

After generating `figma-import.js`, run the validator:

```bash
bash .claude/skills/design-extractor/scripts/validate.sh figma-import.js
```

If any checks fail: fix the script, re-run the validator. Do not deliver until exit code is 0.

Use the checklist below as a fix guide when the validator reports a failure:

### Rule violations (instant fail — fix before delivering)

- [ ] **Rule 1 – Page count**: Does the script create exactly 2 pages (`🧩 Components` and `📐 Frames`)? Search output for `figma.createPage()`. Count must be exactly 2.
- [ ] **Rule 2 – No placeholders**: Does every `fills` value come from `tokens.colors.*`? Search for hardcoded hex strings not assigned to a token first.
- [ ] **Rule 3 – Token connections**: Does every frame section reference `tokens.colors.*` rather than a literal hex?
- [ ] **Rule 4 – Mobile + desktop frames**: For each entry in `pages[]`, is there both a 390px mobile and a 1440px desktop frame?
- [ ] **Rule 5 – Font mapping**: Does the script contain any of: `"SF Pro"`, `"-apple-system"`, `"BlinkMacSystemFont"`, `"system-ui"`, `"system"`? If yes, replace with `"Inter"`.
- [ ] **Rule 6 – lineHeight unit**: Search for `unit: "MULTIPLIER"`. Must return zero matches. All lineHeight values must use `"PIXELS"`, `"PERCENT"`, or `"AUTO"`.
- [ ] **Rule 7 – Top-level await**: Search for `(async () => {` or `(async() => {`. Must return zero matches.
- [ ] **Rule 8 – setCurrentPageAsync**: Search for `figma.currentPage =` (assignment, not `.name =`). Must return zero matches.
- [ ] **Rule 9 – No figma.notify / figma.closePlugin**: Search for `figma.notify(` and `figma.closePlugin(`. Must both return zero matches.
- [ ] **Rule 10 – String quoting**: Any string value sourced from extracted repo data (page titles, component names, button text) uses single-quote outer delimiter.
- [ ] **Rule 11 – No children on instances**: No `appendChild` on a node from `createInstance()` unless `detachInstance()` was called first. (Not checked by validate.sh.)

### Structure checks

- [ ] Script parses — validate.sh runs `node --check` on it
- [ ] Components use `figma.createComponent()`, not `figma.createFrame()`
- [ ] `runPhase` helper is defined and all four phases use it
- [ ] Each component loop and each frame loop has its own per-item try-catch
- [ ] Progress `console.log` messages present at start of each phase (`[1/4]`, `[2/4]`, `[3/4]`, `[4/4]`)

If any check fails: fix the generated script, then re-run the checklist from the top.
Only deliver once all boxes can be checked.

---

## Framework compatibility

| Framework | Tokens | Components | Frames |
|-----------|--------|------------|--------|
| Next.js (Tailwind) | ✅ Automatic | ✅ Automatic | ✅ Automatic |
| React + CSS Modules | ✅ Good | ✅ Good | ✅ Good |
| HTML/CSS | ✅ CSS vars | ✅ Manual scan | ✅ Per .html file |
| SwiftUI | ⚠️ Color extensions | ✅ Views | ✅ Scenes |
| Vue | ✅ Automatic | ✅ Automatic | ✅ Automatic |
| Kotlin/Android (XML Views) | ✅ colors.xml + dimens.xml | ✅ Layout XML | ✅ Per Activity |
| C++ / Qt | ⚠️ Manual | ⚠️ .ui files | ⚠️ Widget tree |

Claude Code adapts the extraction per framework automatically.

---

## Key principles

- **Never destructive** — read only, never modify the repo
- **Assume gracefully** — if unsure of a semantic name, use the technical value
- **Flag gaps** — clearly state what could not be extracted automatically
- **Keep it portable** — output must work without knowing the specific repo

---

## CRITICAL RULES — Always follow these

These are hard rules learned from real usage. Never violate them.

### Rule 1: NEVER create multiple Figma pages
Figma's free plan only allows 3 pages. Creating one page per route will immediately hit this limit.

**ALWAYS put everything on maximum 2 pages:**
```
Page 1: "🧩 Components"  → all components side by side
Page 2: "📐 Frames"      → ALL page frames side by side on one canvas
```

Frames go next to each other horizontally with 80px gap — never on separate Figma pages.

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
Frames must use actual colors, spacing and structure from the extracted design — not labeled placeholder rectangles.

```javascript
// WRONG ❌
const box = figma.createFrame();
box.fills = [solidColor("#EFF6FF")]; // generic placeholder color
// adds text "Search Bar" as a label

// CORRECT ✅
const heroSection = figma.createFrame();
heroSection.fills = [solidColor(tokens.colors["primary"])]; // actual brand color
heroSection.layoutMode = "VERTICAL";
heroSection.paddingLeft = heroSection.paddingRight = 24;
heroSection.paddingTop = heroSection.paddingBottom = 32;
heroSection.itemSpacing = 16;
// real text nodes with actual typography tokens
```

### Rule 3: Always connect frames to extracted tokens
Every color, font and spacing value in a frame must come from the extracted tokens — never use hardcoded defaults like #3B82F6 if the repo has a different primary color.

### Rule 4: Generate mobile-first frames
For each route generate:
- Mobile frame (390px) — always first, primary for app projects
- Desktop frame (1440px) — placed 80px to the right of mobile

### Rule 5: Map system fonts to Figma-loadable fonts

Figma cannot load OS-level system fonts. Any system font reference found in the repo must be mapped to the nearest Figma-available equivalent before generating the script.

| Source font | Map to |
|---|---|
| SF Pro, SF Pro Display, SF Pro Text | `"Inter"` |
| -apple-system, BlinkMacSystemFont | `"Inter"` |
| `.font(.system(...))` (SwiftUI) | `"Inter"` |
| Roboto | `"Roboto"` (available in Figma) |
| system-ui | `"Inter"` |
| Android: sans-serif / Roboto | `"Roboto"` |

Add a comment on its own line in the generated script noting the mapping so users know why the font differs from their app. Don't name the system font in it — validate.sh flags system font names in code, and keeping them out of comments too avoids false alarms:
```javascript
// Note: iOS system font mapped to Inter — Figma cannot load device fonts
```

### Rule 6: lineHeight must use PIXELS, PERCENT or AUTO — never MULTIPLIER

Figma does not accept `MULTIPLIER` as a lineHeight unit. Always use one of the three valid formats:

```javascript
// WRONG ❌
style.lineHeight = { unit: "MULTIPLIER", value: 1.5 };

// CORRECT ✅ — option 1: pixels
style.lineHeight = { unit: "PIXELS", value: 24 };

// CORRECT ✅ — option 2: percent
style.lineHeight = { unit: "PERCENT", value: 150 };

// CORRECT ✅ — option 3: auto
style.lineHeight = { unit: "AUTO" };
```

If the repo defines lineHeight as a multiplier (e.g. 1.5), convert to percent by multiplying by 100:
```javascript
// lineHeight: 1.5 → { unit: "PERCENT", value: 150 }
const lineHeightPercent = multiplierValue * 100;
style.lineHeight = { unit: "PERCENT", value: lineHeightPercent };
```

---

## ⚙️ Figma Script Generation Rules for Developer Console

When generating JavaScript meant to run directly in the Figma Developer Console, follow these rules to prevent runtime crashes and deprecation warnings.

### Rule 7: NEVER use async IIFEs — use top-level await

The Figma console supports top-level `await` natively. Wrapping code in `(async () => { ... })()` causes the plugin environment to close before async operations finish, crashing the script.

```javascript
// WRONG ❌
(async () => {
  await loadFonts();
  await createComponents();
})();

// CORRECT ✅
try {
  await loadFonts();
  await createComponents();
  console.log("✅ Done");
} catch (err) {
  console.error("❌ ERROR:", err);
}
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

`figma.notify()` relies on async timers that can crash when the console environment shuts down. `figma.closePlugin()` terminates the environment mid-run when called from the console.

This applies at EVERY point in the script — including the very last line. Do not add `figma.notify()` after the try/catch block as a "success toast".

```javascript
// WRONG ❌ — anywhere in the script, including the final line
figma.notify("🎉 Done!", { timeout: 5000 });
figma.closePlugin();

// CORRECT ✅
console.log("🎉 SUCCESS: Design imported!");
```

### Rule 10: Use single-quoted outer delimiters when string content may contain double quotes

If generated string content (labels, titles, names from the repo) could contain double-quote characters, use single quotes as the outer delimiter. A double quote inside a double-quoted JS string will break the parser with "missing ) after argument list".

```javascript
// WRONG ❌ — breaks if the string contains "
t.characters = "Which actor plays the main character in "The Dark Knight"?";

// CORRECT ✅ — safe regardless of content
t.characters = 'Which actor plays the main character in "The Dark Knight"?';
```

Apply this whenever the string value comes from extracted repo data — component names, page titles, label text, anything that wasn't written by hand.

### Rule 11: NEVER append children to a component instance

Figma rejects `appendChild` on an `InstanceNode` (or anything inside one). To put content inside a component used in a frame, detach the instance first — or build a plain frame instead. `validate.sh` cannot detect this, so check it by hand.

```javascript
// WRONG ❌ — throws: cannot add children to an instance
const card = cardComponent.createInstance();
card.appendChild(title);

// CORRECT ✅ — detach first, then it is a normal frame
const card = cardComponent.createInstance().detachInstance();
card.appendChild(title);
```

---

### Correct main block template

Every generated script must follow this structure:

```javascript
// === DESIGN IMPORT – [Project name] ===
// Generated by Claude Code [date]
// Run in: Figma → Plugins → Development → Open Console

const tokens = { colors: {...}, typography: {...}, spacing: {...} };

async function loadFonts() { ... }
async function createTokenStyles() { ... }
async function createComponents() { ... }
async function buildFrames() { ... }
async function runPhase(label, fn) { ... }

// Top-level await — no IIFE wrapper
await runPhase('Load Fonts', async () => { ... });   // logs [1/4]
await runPhase('Token Styles', async () => { ... }); // logs [2/4]
await runPhase('Components', async () => { ... });   // logs [3/4]
await runPhase('Frames', async () => { ... });       // logs [4/4]
console.log("🎉 Import complete. Check each phase above for any partial failures.");
```

The full, working version of this structure is in `references/frame-generator.md`.

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

- **Colors**: Read `Color+Extensions.swift` or `Assets.xcassets` color set JSON files. Dark-mode variants are usually the primary appearance.
- **Token object**: Use the same `tokens.colors` object as every other framework (see `references/frame-generator.md`) — `solidColor`, `hGrad` and `vGrad` all take hex values from it.
- **Typography**: SwiftUI `.font(.system(size:weight:))` maps to `Inter` in Figma. Extract all unique sizes and weights into a semantic token table.
- **Spacing constants**: Look for `enum Spacing` or `struct Spacing` with static `let` values.
- **Corner radius**: Look for `enum CornerRadius` or extension on `CGFloat`.
- **Views → Frames**: Each `*View.swift` file is one frame. Map `ZStack/VStack/HStack` to Figma frame layout direction.
- **Custom shapes** (`Shape` protocol): Cannot be reproduced exactly — approximate with nearest available Figma shape and note the limitation in `design-system-summary.md`.
- **Gradient helpers**: Always generate `hGrad(c1, c2)` and `vGrad(c1, c2)` helpers in the script when the app uses gradients.
- **`txt()` helper**: Use the template's `txt(chars, typoKey, hex)` helper for every text node — it takes the font, size and line height from `tokens.typography[typoKey]`.
