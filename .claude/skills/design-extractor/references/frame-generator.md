# Frame Generator – Extracting Pages/Views to Figma

## What this does

Reads every screen in the app and generates Figma frames with the real layout, real text,
real component instances and Auto Layout — automatically.

---

## Step 1: Identify ALL screens

A screen is anything the user can navigate to — not just top-level files. Collect every one.

### Next.js (App Router)
```
app/
  page.tsx              → "Home"
  dashboard/page.tsx    → "Dashboard"
  settings/page.tsx     → "Settings"
```

### Next.js (Pages Router)
```
pages/
  index.tsx             → "Home"
  dashboard.tsx         → "Dashboard"
```

### React (React Router)
Look in `App.tsx`, `router.tsx`, `routes.tsx` — every `<Route path=… element=…>` is a screen.

### Vue
`views/**/*.vue`, or every route in `router/index.*`.

### SwiftUI
Every `*View.swift` that is a destination: `NavigationStack` / `NavigationLink(destination:)`,
every `TabView` tab, every `.sheet` / `.fullScreenCover` content view.

### HTML/CSS
All `.html` files in root or `pages/`.

### Kotlin/Android — XML Views
Each `*Activity.kt` / `*Fragment.kt` whose layout is inflated from `res/layout/activity_*.xml` /
`fragment_*.xml` (`setContentView(R.layout.…)`, `…Binding.inflate`). Navigation-component
graphs (`res/navigation/*.xml`): every `<fragment>` destination is a screen.

### Kotlin/Android — Jetpack Compose
1. Find every `setContent { … }` (usually in a `ComponentActivity`). Its root composable is a screen.
2. If that root contains a `NavHost`, **every `composable(route) { … }` is its own screen** —
   including the ones behind a bottom `NavigationBar` / tabs. Do not stop at the start destination.
3. `ModalBottomSheet`, `Dialog` / `AlertDialog` shown by an Activity of their own (translucent
   theme) are screens too: draw the dimmed window plus the sheet/dialog.
4. A `HorizontalPager` / `VerticalPager` (typically onboarding) is **one frame per page**: find
   the `when (page) { 0 -> …; 1 -> … }` (or the page list) and build each page, named
   `Onboarding 3/8 – Wake Time`, with the page indicator showing that page's dot as active.
5. **States:** a screen that does `when (val state = uiState) { is Loading -> …; is Error -> …;
   is Content -> … }` gets its content frame plus one frame per distinct other state
   (`variantOf` → stacked below). Also conditional UI such as a permission-warning banner.
6. **Dialogs:** every `AlertDialog` / `Dialog` / picker dialog / `ModalBottomSheet` behind an
   `if (showX)` flag → a frame with the host screen's sections + an `overlay` scrim holding the
   dialog. Snackbars and toasts are listed, not drawn.
7. Sample content: take text from `strings.xml` (fill `%1$d` / `%1$s` placeholders with the
   values used in `@Preview` functions) and data from `@Preview` parameters.

A screen that shares chrome (top bar, bottom navigation) gets that chrome in its own frame.

### Pagers, carousels and steppers (every framework)
Compose `HorizontalPager`, View `ViewPager2`, SwiftUI `TabView(.page)`, web carousels and
multi-step forms: **one frame per page / step**, never only the first one.

### States and dialogs (every framework)
Loading / empty / error branches and every dialog or modal → their own frames, stacked below
the screen with `variantOf`. See the Dashboard example at the end of the template's `pages`.

---

## Step 2: Analyze layout per screen

### Hierarchy (what exists on the screen)
```
1. Navbar/Header / TopAppBar
2. Hero/Banner
3. Main content      → cards, lists, forms, tables
4. Sidebar
5. Footer / bottom NavigationBar
```

### Layout mapping
```
Source signal                                   →  Figma node spec
───────────────────────────────────────────────────────────────────────────────
flex flex-col · VStack · Column · LinearLayout vertical     → layout: 'VERTICAL'
flex-row · HStack · Row · LinearLayout horizontal           → layout: 'HORIZONTAL'
flex-wrap · FlowRow · LazyVGrid                             → layout: 'HORIZONTAL', wrap: true
gap-4 · spacing: 16 · Arrangement.spacedBy(16.dp)           → gap: S.<16>
p-6 · .padding(24) · Modifier.padding(24.dp) · padding=24dp → paddingX/paddingY: S.<24>
Spacer(Modifier.height(x)) · layout_marginTop               → { spacer: S.<x> }
w-full · match_parent · fillMaxWidth()                      → fill: true
layout_weight=1 + 0dp · Modifier.weight(1f) · flex-1        → grow: true
wrap_content · (default)                                    → hug (default)
justify-between · Arrangement.SpaceBetween                  → justify: 'SPACE_BETWEEN'
items-center · Alignment.CenterHorizontally · gravity=center → align: 'CENTER'
fillMaxSize() on a screen's content column                  → grow: true
LazyColumn / ScrollView / overflow-y-auto                   → grow: true, clip: true
shadow · elevation · .shadow()                              → shadow: '<tokens.shadows key>'
```

`fill` stretches across the parent's cross axis (width in a column, height in a row).
`grow` takes the remaining space along the parent's main axis.
Units (`rem`, `clamp()`, `dp`/`sp`, `vh`) and media queries are resolved per frame width — see Rule 14 in SKILL.md.
Different layouts per frame size → `only: 'mobile' | 'desktop'` on a node, `mobileLayout` on a container.

### Content rules (Rule 2)
- Every visible label is a `{ text }` node with a typography token and a color token. Text inside a
  fixed-width container gets `fill: true`, so it wraps instead of running past the edge.
- Every reused UI element is an `{ instance: 'Component/Name' }` of a component built in phase 3.
  Relabel it with `texts: { Title: '…' }` (by layer name) or `label:` — both edit existing text
  layers, which is allowed on instances. Name every text layer in a component (`name: 'Title'`).
- A component that needs extra children (a card with custom content) is
  `{ detach: 'Card/…', children: […] }` — detached first (Rule 11).
- Platform widgets with no source in the repo (time picker, switch, slider…) use
  `{ widget: '…' }` with a builder from `references/platform-widgets.md`. Never leave a plain
  shape where a widget should be; if no recipe exists, say so in `design-system-summary.md`.
- Photo / image placeholders use a color token that contrasts with their container (e.g. `C.border`
  on a `C.surface` card), never the container's own color.
- Never an empty labelled box.

---

## Step 3: Build the combined script

This is the canonical template. Replace the sample tokens, components and pages with the
extracted values; keep every helper as-is. The template itself passes `scripts/validate.sh`
(including the mock run) — if your edit makes it fail, the edit is wrong, not the validator.

```javascript
// ============================================
// DESIGN IMPORT – [Project Name]
// Generated by Claude Code – [Date]
// Run in: Figma → Plugins → Development → Open Console
// Run it in a fresh, empty Figma file — running it twice duplicates every page and style.
// ============================================
//
// Note: system-ui / -apple-system mapped to Inter — Figma cannot load device fonts.

// ---- TOKENS ----
// A plain object literal: no expressions, no references (validate.sh evaluates it on its own).
// Every color used anywhere below must exist here — including one-off hardcoded values found in
// components (e.g. badge backgrounds or gradient stops). Never put hex literals in components[]
// or pages[]; reference C.<key> instead (Rules 2 and 3). Keys are camelCase.
const tokens = {
  colors: {
    primary:       '#2563EB',
    primaryHover:  '#1D4ED8',
    primarySubtle: '#EFF6FF',
    background:    '#FFFFFF',
    surface:       '#F8FAFC',
    textPrimary:   '#0F172A',
    textSecondary: '#64748B',
    textInverse:   '#FFFFFF',
    border:        '#E2E8F0',
    error:         '#DC2626',
    errorSubtle:   '#FEF2F2',
    success:       '#16A34A',
    successSubtle: '#F0FDF4',
    warning:       '#D97706',
    black:         '#000000'
  },
  // Dark-mode values for the same keys (res/values-night/, prefers-color-scheme: dark, dark
  // asset colors). Leave empty when the project has no dark mode.
  colorsDark: {
    background:  '#0F172A',
    surface:     '#1E293B',
    textPrimary: '#F8FAFC',
    border:      '#334155'
  },
  // lineHeightPx → PIXELS · lineHeightMultiplier → PERCENT (×100) · neither → AUTO
  // letterSpacing is in px; letterSpacingEm → PERCENT (×100)
  typography: {
    headingXl: { family: 'Inter', size: 36, weight: 700, lineHeightPx: 44, letterSpacing: -0.5 },
    headingMd: { family: 'Inter', size: 24, weight: 600, lineHeightMultiplier: 1.3 },
    bodyBase:  { family: 'Inter', size: 16, weight: 400, lineHeightMultiplier: 1.5 },
    bodySm:    { family: 'Inter', size: 14, weight: 400, lineHeightMultiplier: 1.5 },
    label:     { family: 'Inter', size: 14, weight: 500 },
    caption:   { family: 'Inter', size: 12, weight: 500, letterSpacingEm: 0.02 }
  },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 },
  radius:  { sm: 4, md: 8, lg: 12, dialog: 28, full: 9999 },
  // box-shadow / elevation / .shadow() → DROP_SHADOW
  shadows: {
    card: { x: 0, y: 1, blur: 3, spread: 0, color: '#0F172A', alpha: 0.1 }
  },
  // Fixed component / layout dimensions that are not spacing
  sizes: { buttonHeight: 40, navbarHeight: 64, sidebarWidth: 240, cardWidth: 320, contentWidth: 342, dialogWidth: 312 }
};
const C = tokens.colors;
const S = tokens.spacing;
const R = tokens.radius;
const Z = tokens.sizes;
// Helpers fall back to these — never to a hardcoded token key (set them from the real tokens)
const DEFAULT_TEXT_STYLE = 'bodyBase';
const DEFAULT_TEXT_COLOR = C.textPrimary;
const DEFAULT_BACKGROUND = C.background;

// Repo font → Figma alternatives, tried in order when the family can't be loaded. Inter is always
// the last resort. e.g. 'Source Serif 4': ['Lora']
const FONT_FALLBACKS = {};

// ---- COMPONENTS ----
// Each variant is its own component (Button ×3 + Badge ×3 = 6 entries, not 2).
// Simple entry: fixed box + optional centred label. Composite entry: `children` (node specs,
// see buildNode) — may contain instances of components listed EARLIER in this array.
// Rule 10: repo-sourced strings use single quotes with ' escaped as \'.
const components = [
  { name: 'Button/Primary',   width: 120, height: Z.buttonHeight, bg: C.primary, text: 'Button', textColor: C.textInverse, radius: R.md, style: 'label' },
  { name: 'Button/Secondary', width: 120, height: Z.buttonHeight, bg: 'transparent', text: 'Button', textColor: C.primary, radius: R.md, stroke: C.primary, style: 'label' },
  { name: 'Button/Ghost',     width: 120, height: Z.buttonHeight, bg: 'transparent', text: 'Button', textColor: C.textSecondary, radius: R.md, style: 'label' },
  { name: 'Badge/Primary',    width: 80,  height: 24, bg: C.primarySubtle, text: 'Badge', textColor: C.primary, radius: R.full, style: 'caption' },
  { name: 'Badge/Success',    width: 80,  height: 24, bg: C.successSubtle, text: 'Badge', textColor: C.success, radius: R.full, style: 'caption' },
  { name: 'Badge/Error',      width: 80,  height: 24, bg: C.errorSubtle,   text: 'Badge', textColor: C.error,   radius: R.full, style: 'caption' },
  { name: 'Input/Default',    width: 280, height: Z.buttonHeight, bg: C.background, text: 'Placeholder', textColor: C.textSecondary, radius: R.md, stroke: C.border, style: 'bodyBase', align: 'MIN', paddingX: S.md },
  { name: 'Card/Default', layout: 'VERTICAL', width: Z.cardWidth, bg: C.surface, radius: R.lg, stroke: C.border,
    shadow: 'card', paddingX: S.lg, paddingY: S.lg, gap: S.sm, children: [
      { text: 'Card Title', name: 'Title', style: 'headingMd', color: C.textPrimary, fill: true },
      { text: 'Don\'t hardcode copy — this line comes from the repo.', name: 'Body', style: 'bodySm', color: C.textSecondary, fill: true },
      { instance: 'Badge/Success', label: 'New' }
    ] }
];

// ---- FRAMES (pages) ----
// One entry per screen: every route, every NavHost composable(route) / tab, every Activity
// without a NavHost. Each entry becomes one frame per FRAME_SIZES entry.
// Node specs (see buildNode): { text } · { instance, label | texts } · { detach, children } · { spacer }
// · { widget } (platform-widgets.md) · anything else = auto-layout frame with children.
// Any spec may set only: 'mobile' | 'desktop'; containers may set mobileLayout (e.g. a row on
// desktop that stacks on mobile).
const pages = [
  {
    name: '🏠 Home',
    bg: C.background,
    layout: 'VERTICAL',
    sections: [
      { name: 'Navbar', layout: 'HORIZONTAL', height: Z.navbarHeight, bg: C.background, stroke: C.border,
        paddingX: S.xl, justify: 'SPACE_BETWEEN', align: 'CENTER', children: [
          { text: 'Acme', style: 'headingMd', color: C.textPrimary },
          { instance: 'Button/Primary', label: 'Sign up' }
        ] },
      { name: 'Hero', layout: 'VERTICAL', bg: C.surface, paddingX: S.xl, paddingY: S.xxxl, gap: S.lg,
        align: 'CENTER', children: [
          { text: 'Build faster with Acme', style: 'headingXl', color: C.textPrimary, textAlign: 'CENTER' },
          { text: 'Everything you need, nothing you don\'t.', style: 'bodyBase', color: C.textSecondary, textAlign: 'CENTER' },
          { name: 'Button Row', layout: 'HORIZONTAL', gap: S.base, children: [
            { instance: 'Button/Primary', label: 'Get started' },
            { instance: 'Button/Secondary', label: 'Learn more' }
          ] }
        ] },
      { name: 'Features', layout: 'HORIZONTAL', wrap: true, paddingX: S.xl, paddingY: S.xxxl, gap: S.lg, children: [
        { instance: 'Card/Default', texts: { Title: 'Fast', Body: 'Sample text about speed.' } },
        { instance: 'Card/Default', texts: { Title: 'Flexible' } },
        // Rule 11: content INSIDE a component → detach first, then add children
        { detach: 'Card/Default', name: 'Feature Card (custom)', children: [
          { instance: 'Badge/Primary', label: 'Beta' }
        ] }
      ] }
    ]
  },
  {
    name: '📊 Dashboard',
    bg: C.surface,
    layout: 'HORIZONTAL',
    mobileLayout: 'VERTICAL',
    sections: [
      { name: 'Top Bar', only: 'mobile', layout: 'HORIZONTAL', height: Z.navbarHeight, bg: C.textPrimary,
        paddingX: S.base, gap: S.base, align: 'CENTER', children: [
          { widget: 'menuIcon', color: C.textInverse },
          { text: 'Acme', style: 'headingMd', color: C.textInverse }
        ] },
      { name: 'Sidebar', only: 'desktop', layout: 'VERTICAL', width: Z.sidebarWidth, bg: C.textPrimary,
        paddingX: S.base, paddingY: S.lg, gap: S.sm, children: [
          { text: 'Acme', style: 'headingMd', color: C.textInverse },
          { text: 'Overview', style: 'label', color: C.textInverse },
          { text: 'Settings', style: 'label', color: C.textSecondary }
        ] },
      { name: 'Main', layout: 'VERTICAL', grow: true, paddingX: S.xl, paddingY: S.xl, gap: S.lg, children: [
        { text: 'Overview', style: 'headingXl', color: C.textPrimary },
        { instance: 'Input/Default', label: 'Search…' },
        { instance: 'Card/Default', fill: true }
      ] }
    ]
  }
];

// ---- STATES AND DIALOGS ----
// Every distinct non-default state (loading, empty, error…) and every dialog a screen can show
// gets its own frame, stacked BELOW that screen with `variantOf`. A dialog frame = the host
// screen's own sections + one last `overlay` section: the scrim with the dialog centred in it.
const dashboard = pages.find(p => p.name === '📊 Dashboard');
pages.push({
  name: '📊 Dashboard – Empty',
  variantOf: '📊 Dashboard',
  bg: C.surface,
  layout: 'HORIZONTAL',
  mobileLayout: 'VERTICAL',
  sections: [
    ...dashboard.sections.slice(0, 2),
    { name: 'Main', layout: 'VERTICAL', grow: true, justify: 'CENTER', align: 'CENTER', paddingX: S.xl, gap: S.sm, children: [
      { text: 'Nothing here yet', style: 'headingMd', color: C.textPrimary },
      { text: 'Create your first project to see it here.', style: 'bodySm', color: C.textSecondary }
    ] }
  ]
});
pages.push({
  name: '📊 Dashboard – Delete dialog',
  variantOf: '📊 Dashboard',
  bg: C.surface,
  layout: 'HORIZONTAL',
  mobileLayout: 'VERTICAL',
  sections: [
    ...dashboard.sections,
    { overlay: true, name: 'Scrim', layout: 'VERTICAL', bg: C.black, bgAlpha: 0.32, justify: 'CENTER', align: 'CENTER', children: [
      // references/platform-widgets.md → AlertDialog
      { name: 'Dialog', layout: 'VERTICAL', width: Z.dialogWidth, radius: R.dialog, bg: C.background,
        paddingX: S.lg, paddingY: S.lg, gap: S.base, children: [
          { text: 'Delete project?', style: 'headingMd', color: C.textPrimary },
          { text: 'This can\'t be undone.', style: 'bodySm', color: C.textSecondary, fill: true },
          { name: 'Actions', layout: 'HORIZONTAL', fill: true, justify: 'MAX', gap: S.sm, children: [
            { instance: 'Button/Ghost', label: 'Cancel' },
            { instance: 'Button/Primary', label: 'Delete' }
          ] }
        ] }
    ] }
  ]
});

// Rule 4: mobile (390) always. Desktop (1440) only when the app has a desktop/tablet layout.
// For a phone-only app delete the Desktop entry and keep a line like:
//   // Rule 4: desktop frames omitted — <reason, e.g. phone-only Android app, no sw600dp layouts>
const FRAME_SIZES = [
  { label: 'Mobile',  width: 390,  height: 844 },
  { label: 'Desktop', width: 1440, height: 960 }
];

// ---- WIDGET BUILDERS ----
// Platform widgets with no source in the repo (M3 TimePicker, Switch, Slider…). Copy the
// recipes you need from references/platform-widgets.md. Each returns an unattached node.
// Icons are drawn as shapes too — glyphs like ☰ or ✕ are not in Inter and render as boxes (Rule 12).
const WIDGET_BUILDERS = {
  menuIcon({ color = DEFAULT_TEXT_COLOR, size = 24 }) {
    const icon = figma.createFrame();
    icon.name = 'Icon/Menu';
    icon.resize(size, size);
    icon.fills = [];
    for (const y of [0.25, 0.5, 0.75]) {
      const bar = figma.createRectangle();
      bar.resize(size * 0.75, 2);
      bar.x = size * 0.125; bar.y = size * y - 1;
      bar.cornerRadius = 1;
      bar.fills = solidColor(color);
      icon.appendChild(bar);
    }
    return icon;
  }
};

// ---- HELPERS ----
function hexToRgb(hex) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`Invalid color "${hex}" — use a 6-digit token hex`);
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255
  };
}

// undefined / 'transparent' → no fill. Anything else must be a valid token hex.
function solidColor(hex, alpha = 1) {
  if (hex === undefined || hex === null || hex === 'transparent') return [];
  return [{ type: 'SOLID', color: hexToRgb(hex), opacity: alpha }];
}

// Gradient stops: a hex string, or { hex, alpha } — positions are spread evenly
function gradientStops(stops) {
  const last = Math.max(stops.length - 1, 1);
  return stops.map((s, i) => {
    const stop = typeof s === 'string' ? { hex: s, alpha: 1 } : s;
    return { position: stop.position ?? i / last, color: { ...hexToRgb(stop.hex), a: stop.alpha ?? 1 } };
  });
}

// direction: 'vertical' (top → bottom) or 'horizontal' (left → right)
function linearGradient(stops, direction = 'vertical') {
  const gradientTransform = direction === 'horizontal' ? [[1, 0, 0], [0, 1, 0]] : [[0, 1, 0], [-1, 0, 1]];
  return [{ type: 'GRADIENT_LINEAR', gradientTransform, gradientStops: gradientStops(stops) }];
}

// Centre (cx, cy) and radius r are fractions of the layer size (0.5, 0.5, 0.5 = centred, touching edges)
function radialGradient(stops, cx = 0.5, cy = 0.5, r = 0.5) {
  const k = 0.5 / r;
  return [{
    type: 'GRADIENT_RADIAL',
    gradientTransform: [[k, 0, 0.5 - k * cx], [0, k, 0.5 - k * cy]],
    gradientStops: gradientStops(stops)
  }];
}

// Two-stop shorthands
function hGrad(h1, h2) { return linearGradient([h1, h2], 'horizontal'); }
function vGrad(h1, h2) { return linearGradient([h1, h2], 'vertical'); }

// fill spec on a node: bg + bgAlpha, or gradient: { type: 'linear'|'radial', stops, direction, cx, cy, r }
// gradient may also be an array of layers (bottom first) — e.g. a linear background + a radial wash
function fillsFor(spec) {
  if (spec.gradient) {
    const layers = Array.isArray(spec.gradient) ? spec.gradient : [spec.gradient];
    return layers.flatMap(g => g.type === 'radial'
      ? radialGradient(g.stops, g.cx, g.cy, g.r)
      : linearGradient(g.stops, g.direction));
  }
  return solidColor(spec.bg, spec.bgAlpha);
}

function shadowEffects(key) {
  const s = tokens.shadows[key];
  if (!s) throw new Error(`Unknown shadow token "${key}"`);
  return [{
    type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL',
    color: { ...hexToRgb(s.color), a: s.alpha ?? 1 },
    offset: { x: s.x || 0, y: s.y || 0 }, radius: s.blur || 0, spread: s.spread || 0
  }];
}

// Figma style names differ per family ("Semi Bold" in Inter, "SemiBold" in Roboto) — try in order
const STYLE_CANDIDATES = {
  100: ['Thin'],
  200: ['Extra Light', 'ExtraLight', 'Light'],
  300: ['Light'],
  400: ['Regular'],
  500: ['Medium', 'Regular'],
  600: ['Semi Bold', 'SemiBold', 'Medium', 'Bold'],
  700: ['Bold'],
  800: ['Extra Bold', 'ExtraBold', 'Bold'],
  900: ['Black', 'Heavy', 'Extra Bold', 'ExtraBold', 'Bold']
};
const loadedFonts = new Set();

// A family counts as loaded when every weight the tokens use has at least one loadable style
async function loadWeights(family, weights) {
  let allOk = true;
  for (const weight of weights) {
    let ok = false;
    for (const style of [...(STYLE_CANDIDATES[weight] || []), 'Regular']) {
      try {
        await figma.loadFontAsync({ family, style });
        loadedFonts.add(`${family}|${style}`);
        ok = true;
        break;
      } catch {}
    }
    if (!ok) allOk = false;
  }
  return allOk;
}

// Loads exactly the families in tokens.typography. A family that can't be loaded is replaced by
// its FONT_FALLBACKS, then Inter, and the typography tokens are rewritten to what loaded —
// otherwise the failure would only show up later, when a text node is created.
async function loadFonts() {
  const typos = Object.values(tokens.typography);
  for (const family of [...new Set(typos.map(t => t.family))]) {
    const weights = [...new Set(typos.filter(t => t.family === family).map(t => t.weight))];
    let used = null;
    for (const candidate of [family, ...(FONT_FALLBACKS[family] || []), 'Inter']) {
      if (await loadWeights(candidate, weights)) { used = candidate; break; }
    }
    if (!used) throw new Error(`No font could be loaded for "${family}" (not even Inter)`);
    if (used !== family) {
      // Not a warning: this is an expected approximation — list it in the summary (Rule 15)
      console.log(`  ℹ️ Font "${family}" is not available in Figma — using "${used}"`);
      for (const t of typos) if (t.family === family) t.family = used;
    }
  }
  console.log(`  Loaded ${loadedFonts.size} font style(s): ${[...loadedFonts].join(', ')}`);
}

function fontFor(typo) {
  for (const style of [...(STYLE_CANDIDATES[typo.weight] || []), 'Regular']) {
    if (loadedFonts.has(`${typo.family}|${style}`)) return { family: typo.family, style };
  }
  throw new Error(`No loadable style for ${typo.family} ${typo.weight}`);
}

// Works on TextNode and TextStyle
function applyTypography(target, key) {
  const typo = tokens.typography[key];
  if (!typo) throw new Error(`Unknown typography token "${key}"`);
  target.fontName = fontFor(typo);
  target.fontSize = typo.size;
  if (typo.lineHeightPx) target.lineHeight = { unit: 'PIXELS', value: typo.lineHeightPx };
  else if (typo.lineHeightMultiplier) target.lineHeight = { unit: 'PERCENT', value: typo.lineHeightMultiplier * 100 };
  else target.lineHeight = { unit: 'AUTO' };
  if (typo.letterSpacing) target.letterSpacing = { unit: 'PIXELS', value: typo.letterSpacing };
  else if (typo.letterSpacingEm) target.letterSpacing = { unit: 'PERCENT', value: typo.letterSpacingEm * 100 };
}

// Create a text node in one call (must be called after loadFonts)
function txt(chars, styleKey = DEFAULT_TEXT_STYLE, hexColor = DEFAULT_TEXT_COLOR, alpha = 1) {
  const n = figma.createText();
  applyTypography(n, styleKey);
  n.characters = chars;
  n.fills = solidColor(hexColor, alpha);
  return n;
}

// Runs one phase; a failure is logged and the next phase still runs
async function runPhase(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`❌ Phase "${label}" failed:`, err);
  }
}

// ---- CREATE TOKEN STYLES ----
function tryEach(label, entries, fn) {
  let ok = 0;
  for (const [name, value] of entries) {
    try { fn(name, value); ok++; } catch (err) { console.warn(`  ⚠️ Skipped ${label} "${name}": ${err.message || err}`); }
  }
  return ok;
}

async function createTokenStyles() {
  let made = 0;
  made += tryEach('color style', Object.entries(tokens.colors), (name, hex) => {
    const style = figma.createPaintStyle();
    style.name = `Colors/${name}`;
    style.paints = solidColor(hex);
  });
  made += tryEach('dark color style', Object.entries(tokens.colorsDark || {}), (name, hex) => {
    const style = figma.createPaintStyle();
    style.name = `Colors/Dark/${name}`;
    style.paints = solidColor(hex);
  });
  made += tryEach('text style', Object.entries(tokens.typography), (name) => {
    const style = figma.createTextStyle();
    style.name = `Typography/${name}`;
    applyTypography(style, name);
  });
  made += tryEach('shadow style', Object.entries(tokens.shadows || {}), (name) => {
    const style = figma.createEffectStyle();
    style.name = `Shadows/${name}`;
    style.effects = shadowEffects(name);
  });
  console.log(`  Created ${made} style(s)`);

  // Spacing / radius / size → number variables (one mode, works on the free plan)
  try {
    const collection = figma.variables.createVariableCollection('Tokens');
    const modeId = collection.modes[0].modeId;
    let vars = 0;
    for (const group of ['spacing', 'radius', 'sizes']) {
      vars += tryEach(`${group} variable`, Object.entries(tokens[group] || {}), (name, value) => {
        const v = figma.variables.createVariable(`${group}/${name}`, collection, 'FLOAT');
        v.setValueForMode(modeId, value);
      });
    }
    console.log(`  Created ${vars} number variable(s)`);
  } catch (err) {
    console.warn(`  ⚠️ Number variables not created (variables API unavailable?): ${err.message || err}`);
  }
}

// ---- NODE BUILDERS (shared by components and frames) ----
const componentRegistry = {};

// Auto-layout container props. keepPaint = true leaves fills/strokes/radius alone when the spec
// does not set them (detached instances already carry the component's look).
function applyContainer(f, spec, keepPaint = false) {
  if (spec.name) f.name = spec.name;
  f.layoutMode = (currentSize === 'mobile' && spec.mobileLayout) || spec.layout || 'VERTICAL';
  if (spec.wrap && f.layoutMode === 'HORIZONTAL') { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = spec.gap || 0; }
  f.itemSpacing = spec.gap || 0;
  f.paddingLeft = f.paddingRight = spec.paddingX || 0;
  f.paddingTop = spec.paddingTop ?? spec.paddingY ?? 0;
  f.paddingBottom = spec.paddingBottom ?? spec.paddingY ?? 0;
  f.primaryAxisAlignItems = spec.justify || 'MIN';
  f.counterAxisAlignItems = spec.align || 'MIN';
  f.clipsContent = !!spec.clip;
  if (spec.bg || spec.gradient) f.fills = fillsFor(spec);
  else if (!keepPaint) f.fills = [];
  if (spec.stroke) {
    f.strokes = solidColor(spec.stroke, spec.strokeAlpha);
    f.strokeWeight = spec.strokeWeight || 1;
    f.strokeAlign = 'INSIDE';
  }
  if (spec.radius) f.cornerRadius = spec.radius;
  if (spec.topRadius) { f.topLeftRadius = spec.topRadius; f.topRightRadius = spec.topRadius; }
  if (spec.shadow) f.effects = shadowEffects(spec.shadow);
}

// Change an instance's label by editing its existing text layer — an override, not a new child,
// so there is no appendChild on the instance (Rule 11)
function setInstanceLabel(inst, label) {
  const t = inst.findOne(n => n.type === 'TEXT' && n.name === 'Label') || inst.findOne(n => n.type === 'TEXT');
  if (!t) throw new Error(`instance "${inst.name}" has no text layer to relabel`);
  t.characters = label;
}

// Relabel several text layers in layer order; null / undefined entries keep the component text
function setInstanceLabels(inst, labels) {
  const texts = inst.findAll(n => n.type === 'TEXT');
  labels.forEach((label, i) => {
    if (label === null || label === undefined) return;
    if (!texts[i]) throw new Error(`instance "${inst.name}" has no text layer #${i + 1}`);
    texts[i].characters = label;
  });
}

// Relabel text layers by layer name: { Title: 'Revenue', Body: '$12,400' }. Safer than layer
// order — adding a text layer to the component later can't shift the overrides.
function setInstanceTexts(inst, texts) {
  for (const [layer, value] of Object.entries(texts)) {
    const t = inst.findOne(n => n.type === 'TEXT' && n.name === layer);
    if (!t) throw new Error(`instance "${inst.name}" has no text layer named "${layer}"`);
    t.characters = value;
  }
}

// Which frame size is being built ('mobile' | 'desktop'); null while building components
let currentSize = null;

function buildChildren(specs, parent) {
  for (const child of (specs || [])) {
    try {
      buildNode(child, parent);
    } catch (err) {
      console.warn(`    ⚠️ Skipped "${child.name || child.text || child.instance || child.widget || 'node'}" in ${parent.name}: ${err.message || err}`);
    }
  }
}

// Builds one spec into parent. layoutSizing* is set AFTER appendChild.
//   { text, style, color, alpha, textAlign, decoration, fill, grow, truncate }
//   { instance: 'Component/Name', label | labels: [], fill, grow } — never gets children (Rule 11)
//   { detach: 'Component/Name', children, …container props }  — detached, then children
//   { spacer: <px> }
//   { widget: '<builder>', …builder params }                  — WIDGET_BUILDERS
//   { name, layout, children, …container props }              — plain auto-layout frame
// Container props: layout, gap, paddingX/Y/Top/Bottom, justify, align, bg, bgAlpha, gradient,
//   stroke, strokeAlpha, strokeWeight, radius, topRadius, shadow, clip, wrap, width, height,
//   fill (FILL across the parent's cross axis), grow (FILL along the parent's main axis),
//   overlay (absolutely positioned layer covering the whole parent — dialog scrims)
function buildNode(spec, parent) {
  if (spec.only && currentSize && spec.only !== currentSize) return null;
  const parentIsRow = parent.layoutMode === 'HORIZONTAL';
  let n;
  let isContainer = false;

  if (spec.text !== undefined) {
    n = txt(spec.text, spec.style, spec.color, spec.alpha);
    if (spec.name) n.name = spec.name;
    parent.appendChild(n);
    if (spec.textAlign) n.textAlignHorizontal = spec.textAlign;
    if (spec.decoration) n.textDecoration = spec.decoration; // 'STRIKETHROUGH' | 'UNDERLINE'
  } else if (spec.instance) {
    const main = componentRegistry[spec.instance];
    if (!main) throw new Error(`component "${spec.instance}" was not built`);
    n = main.createInstance();
    parent.appendChild(n);
    if (spec.label !== undefined) setInstanceLabel(n, spec.label);
    if (spec.labels) setInstanceLabels(n, spec.labels);
    if (spec.texts) setInstanceTexts(n, spec.texts);
  } else if (spec.detach) {
    const main = componentRegistry[spec.detach];
    if (!main) throw new Error(`component "${spec.detach}" was not built`);
    // Rule 11 — detach first, then it is a plain frame that may take children
    n = main.createInstance().detachInstance();
    parent.appendChild(n);
    applyContainer(n, { layout: n.layoutMode === 'NONE' ? 'VERTICAL' : n.layoutMode, ...spec }, true);
    buildChildren(spec.children, n);
    isContainer = true;
  } else if (spec.spacer !== undefined) {
    n = figma.createFrame();
    n.name = 'Spacer';
    n.fills = [];
    parent.appendChild(n);
    if (parentIsRow) n.resize(spec.spacer, 1); else n.resize(1, spec.spacer);
    return n;
  } else if (spec.widget) {
    const build = WIDGET_BUILDERS[spec.widget];
    if (!build) throw new Error(`widget builder "${spec.widget}" is not defined`);
    n = build(spec);
    parent.appendChild(n);
  } else {
    n = figma.createFrame();
    parent.appendChild(n);
    applyContainer(n, spec);
    buildChildren(spec.children, n);
    isContainer = true;
  }

  // Overlay: taken out of the parent's auto layout and stretched over it. Put it LAST in the
  // parent's children so it draws on top (e.g. scrim + dialog over the real screen).
  if (spec.overlay) {
    n.layoutPositioning = 'ABSOLUTE';
    n.x = 0;
    n.y = 0;
    if (isContainer) { n.primaryAxisSizingMode = 'FIXED'; n.counterAxisSizingMode = 'FIXED'; }
    n.resize(parent.width, parent.height);
    return n;
  }

  // Sizing inside the parent's auto layout:
  //   fill = stretch across the parent's cross axis (width in a column, height in a row)
  //   grow = take the remaining space along the parent's main axis
  // resize() pins both axes to FIXED, so resize first and set FILL / HUG after it
  const fillW = (spec.fill && !parentIsRow) || (spec.grow && parentIsRow);
  const fillH = (spec.fill && parentIsRow) || (spec.grow && !parentIsRow);
  if (spec.width || spec.height) n.resize(spec.width || n.width, spec.height || n.height);
  if (spec.width) n.layoutSizingHorizontal = 'FIXED';
  if (spec.height) n.layoutSizingVertical = 'FIXED';
  if (fillW && !spec.width) n.layoutSizingHorizontal = 'FILL';
  if (fillH && !spec.height) n.layoutSizingVertical = 'FILL';
  if (isContainer) {
    if (!fillW && !spec.width) n.layoutSizingHorizontal = 'HUG';
    if (!fillH && !spec.height) n.layoutSizingVertical = 'HUG';
  }
  if (spec.text !== undefined) {
    if (fillW) n.textAutoResize = 'HEIGHT';
    if (spec.truncate) { n.textTruncation = 'ENDING'; n.maxLines = 1; }
  }
  return n;
}

// ---- CREATE COMPONENTS ----
function buildSimpleComponent(comp) {
  const node = figma.createComponent();
  node.name = comp.name;
  // Auto layout keeps the label centred when an instance is resized (e.g. FILL width)
  node.layoutMode = 'HORIZONTAL';
  node.primaryAxisAlignItems = comp.align || 'CENTER';
  node.counterAxisAlignItems = 'CENTER';
  node.paddingLeft = node.paddingRight = comp.paddingX || 0;
  node.primaryAxisSizingMode = 'FIXED';
  node.counterAxisSizingMode = 'FIXED';
  node.resize(comp.width, comp.height);
  node.cornerRadius = comp.radius || 0;
  node.fills = fillsFor(comp);
  if (comp.stroke) {
    node.strokes = solidColor(comp.stroke, comp.strokeAlpha);
    node.strokeWeight = comp.strokeWeight || 1;
    node.strokeAlign = 'INSIDE';
  }
  if (comp.shadow) node.effects = shadowEffects(comp.shadow);
  if (comp.text !== undefined) {
    const t = txt(comp.text, comp.style || DEFAULT_TEXT_STYLE, comp.textColor || DEFAULT_TEXT_COLOR);
    t.name = 'Label';
    t.textAlignHorizontal = comp.align === 'MIN' ? 'LEFT' : 'CENTER';
    node.appendChild(t);
    if (comp.truncate) {
      t.layoutSizingHorizontal = 'FILL';
      t.textTruncation = 'ENDING';
      t.maxLines = 1;
    }
  }
  return node;
}

// Children go into the COMPONENT node, never into an instance (Rule 11).
// width / height are optional — an axis without one hugs its content (badges, chips).
function buildCompositeComponent(comp) {
  const node = figma.createComponent();
  applyContainer(node, comp);
  node.name = comp.name;
  node.resize(comp.width || 1, comp.height || 1);
  const row = node.layoutMode === 'HORIZONTAL';
  node.primaryAxisSizingMode = (row ? comp.width : comp.height) ? 'FIXED' : 'AUTO';
  node.counterAxisSizingMode = (row ? comp.height : comp.width) ? 'FIXED' : 'AUTO';
  buildChildren(comp.children, node);
  return node;
}

async function createComponents() {
  const page = figma.createPage();
  page.name = '🧩 Components';
  await figma.setCurrentPageAsync(page);
  // Canvas = app background, so light-on-dark components stay visible
  page.backgrounds = solidColor(DEFAULT_BACKGROUND);

  let x = 40;
  let built = 0;
  console.log(`  Building ${components.length} component(s)...`);
  for (const comp of components) {
    try {
      const node = comp.children ? buildCompositeComponent(comp) : buildSimpleComponent(comp);
      page.appendChild(node);
      node.x = x;
      node.y = 40;
      componentRegistry[comp.name] = node;
      x += node.width + 24;
      built++;
    } catch (err) {
      console.warn(`  ⚠️ Skipped component "${comp.name}": ${err.message || err}`);
    }
  }
  console.log(`  Built ${built}/${components.length} components`);
}

// ---- BUILD FRAMES ----
// ALL frames on ONE page — never create a page per route (free plan = 3 pages max).
// Screens run left → right, 80px apart. An entry with `variantOf: '<screen name>'` (a state or a
// dialog of that screen) is stacked in a column BELOW that screen instead of adding a new column.
//
// Frame height = max(device height, content height), so long screens are never clipped. Sizing
// that depends on the final height (sections stretching down a row, `grow` down a column, dialog
// overlays) is applied after that resize — FILL inside a parent that is still hugging is unreliable.
function buildFrame(pageData, size, x, y) {
  const frame = figma.createFrame();
  frame.name = `${pageData.name} – ${size.label} (${size.width})`;
  frame.fills = (pageData.bg || pageData.gradient) ? fillsFor(pageData) : solidColor(DEFAULT_BACKGROUND);
  frame.clipsContent = true;
  frame.layoutMode = (currentSize === 'mobile' && pageData.mobileLayout) || pageData.layout || 'VERTICAL';
  figmaPage.appendChild(frame);
  frame.x = x; frame.y = y;
  const row = frame.layoutMode === 'HORIZONTAL';
  frame.resize(size.width, size.height);
  // Fixed device width, height hugs the content for now
  frame.primaryAxisSizingMode = row ? 'FIXED' : 'AUTO';
  frame.counterAxisSizingMode = row ? 'AUTO' : 'FIXED';

  const deferred = [];
  for (const section of (pageData.sections || [])) {
    try {
      // Sections span the page's width by default; vertical stretching waits for the final height
      const spec = { fill: !row, ...section };
      // Row: every section stretches down to the frame's final height unless it opts out (fill: false)
      const stretch = row ? (section.fill !== false && !spec.height) : (spec.grow && !spec.height);
      const n = buildNode(stretch ? { ...spec, fill: row ? false : spec.fill, grow: row ? spec.grow : false } : spec, frame);
      if (n && (stretch || section.overlay)) deferred.push(n);
    } catch (err) {
      console.warn(`    ⚠️ Skipped section "${section.name}" in ${frame.name}: ${err.message || err}`);
    }
  }

  frame.resize(size.width, Math.max(size.height, frame.height));
  for (const n of deferred) {
    if (n.layoutPositioning === 'ABSOLUTE') n.resize(frame.width, frame.height);
    else n.layoutSizingVertical = 'FILL';
  }
  return frame;
}

let figmaPage = null;

async function buildFrames() {
  figmaPage = figma.createPage();
  figmaPage.name = '📐 Frames';
  await figma.setCurrentPageAsync(figmaPage);

  const GAP = 80;
  let xOff = 0;
  let built = 0;
  const columns = {};
  console.log(`  Building ${pages.length} page(s) × ${FRAME_SIZES.length} size(s)`);

  for (const pageData of pages) {
    let pageOk = true;
    const base = pageData.variantOf ? columns[pageData.variantOf] : null;
    if (pageData.variantOf && !base) {
      console.warn(`  ⚠️ "${pageData.name}": variantOf "${pageData.variantOf}" is not an earlier page — placed in its own column`);
    }
    const xs = [];
    let tallest = 0;
    // Mobile first, other sizes 80px to the right (Rule 4)
    FRAME_SIZES.forEach((size, si) => {
      const x = base ? base.xs[si] : xOff;
      const y = base ? base.y : 0;
      currentSize = size.label.toLowerCase();
      try {
        const frame = buildFrame(pageData, size, x, y);
        tallest = Math.max(tallest, frame.height);
        console.log(`  ✓ Frame: ${frame.name}`);
      } catch (err) {
        pageOk = false;
        tallest = Math.max(tallest, size.height);
        console.warn(`  ⚠️ Skipped frame "${pageData.name} – ${size.label}": ${err.message || err}`);
      }
      xs.push(x);
      if (!base) xOff += size.width + GAP;
    });
    currentSize = null;
    if (base) base.y += tallest + GAP;
    else columns[pageData.name] = { xs, y: tallest + GAP };
    if (pageOk) built++;
  }

  console.log(`  Built ${built}/${pages.length} pages`);
}

// ---- RUN EVERYTHING ----
// Top-level await — no IIFE wrapper (console crashes with async IIFE)
console.log('🚀 Design import starting...');
console.log('   Phases: fonts → token styles → components → frames');

await runPhase('Load Fonts', async () => {
  console.log('⏳ [1/4] Loading fonts...');
  await loadFonts();
  console.log('✅ [1/4] Fonts loaded');
});

await runPhase('Token Styles', async () => {
  console.log('⏳ [2/4] Creating token styles...');
  await createTokenStyles();
  console.log('✅ [2/4] Token styles created');
});

await runPhase('Components', async () => {
  console.log('⏳ [3/4] Building components...');
  await createComponents();
  console.log('✅ [3/4] Components built');
});

await runPhase('Frames', async () => {
  console.log('⏳ [4/4] Building frames...');
  await buildFrames();
  console.log('✅ [4/4] Frames built');
});

console.log('');
console.log('🎉 Import complete. Check each phase above for any partial failures.');
```


### Why the template is built this way (learned in real Figma)

| Pattern | Problem it prevents |
|---|---|
| Text with `fill: true` gets `textAutoResize = 'HEIGHT'` | Text defaults to auto-width and runs past the edge of cards and other fixed-width containers |
| Resize first, then set `FILL` / `HUG` | `resize()` pins **both** axes to fixed, overwriting sizing set before it |
| Frames hug, then `resize(width, max(device, content))` | Fixed 844/960 heights clip long screens |
| Vertical `FILL` (row sections, `grow` in a column) and overlays applied after the final resize | `FILL` inside a parent that is still hugging is unreliable |
| Declarative node specs + `componentRegistry` | Every section has real text and real component instances — no empty placeholder boxes (Rule 2) |
| `texts: { Layer: '…' }` / `label:` on instances; `detach:` only for new children | Instances allow text, font size and padding overrides, but not new children (Rule 11) |
| `STYLE_CANDIDATES` + `fontFor()` | Style names differ per family: Inter "Semi Bold", Roboto "SemiBold" (confirmed in real Figma) |
| `loadWeights()` + `FONT_FALLBACKS` | A family that can't load would only fail later, at text creation; now it's replaced and reported |
| `lineHeightPx` / `lineHeightMultiplier` in the token | A px line height written as PERCENT collapses the lines (24.sp → 24%) |
| `DEFAULT_TEXT_STYLE` / `DEFAULT_TEXT_COLOR` / `DEFAULT_BACKGROUND` | Helpers that fall back to sample keys (`bodySm`, `surface`) break on real tokens |
| `tryEach()` around every style | One unloadable font no longer kills the whole Token Styles phase |
| `variantOf` + `overlay` | States and dialogs get their own frames under the screen, drawn over the real screen |
| `WIDGET_BUILDERS` (`menuIcon`, platform-widgets.md) | Glyphs like ☰ and ✕ aren't in Inter; platform widgets have no source in the repo |
| `page.backgrounds = solidColor(DEFAULT_BACKGROUND)` | Light-on-dark components vanish on a white canvas |
| Number variables for spacing / radius / sizes | Spacing and radius otherwise exist only as script constants |

---

## Framework compatibility

| Framework | Screens source | Layout signal |
|-----------|----------------|---------------|
| Next.js App | `app/**/page.tsx` | Tailwind classes |
| Next.js Pages | `pages/**/*.tsx` | Tailwind/CSS |
| React + Router | `App.tsx` routes | Tailwind/CSS |
| HTML/CSS | `*.html` files | CSS classes |
| SwiftUI | `*View.swift` destinations, `TabView` tabs | SwiftUI modifiers |
| Vue | `views/**/*.vue` / router | Tailwind/CSS |
| Android XML Views | Activities/Fragments + `res/layout/*.xml`, `res/navigation/*.xml` | XML attributes |
| Android Jetpack Compose | `setContent {}` roots + every `NavHost` `composable(route)` | Modifiers, Column/Row/Box |
| C++ (Qt) | `.ui` XML files | Widget hierarchy |
