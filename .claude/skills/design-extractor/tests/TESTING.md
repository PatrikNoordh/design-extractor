# Testing the design-extractor skill end-to-end

## Prerequisites
- Claude Code installed
- Figma account (free tier is fine)
- The design-extractor skill in `.claude/skills/design-extractor/`

---

## Test 1: Fixture extraction (2 minutes)

The test fixture at `tests/fixture/` is a minimal HTML/CSS project covering every extraction path: CSS custom properties, 4 component types with variants, system font reference (`system-ui`), and 2 routes.

**Step 1 — Run the skill against the fixture:**
```
Ask Claude Code: "Generate figma-import.js for the project at .claude/skills/design-extractor/tests/fixture/"
```

**Step 2 — Validate the output before opening Figma:**
```bash
bash .claude/skills/design-extractor/scripts/validate.sh figma-import.js
```
Expected: all checks pass, exit 0. The dry-run line must include:
```
✅ PASS: Dry run: pages=2 components=8 frames=4 mobile=2 desktop=2 … errors=0
```

**Step 3 — Run in Figma:**
- Use a **fresh, empty Figma file** — running the script twice in the same file duplicates every page and style
- Open Figma → Plugins → Development → Open Console
- Paste `figma-import.js` → Enter

**Step 4 — Watch the console output. Expected sequence:**
```
🚀 Design import starting...
   Phases: fonts → token styles → components → frames
⏳ [1/4] Loading fonts...
✅ [1/4] Fonts loaded
⏳ [2/4] Creating token styles...
✅ [2/4] Token styles created
⏳ [3/4] Building components...
  Building 8 component(s)...
  Built 8/8 components
✅ [3/4] Components built
⏳ [4/4] Building frames...
  Building 2 page(s) × 2 sizes (mobile + desktop)
  ✓ Frame: Home – Mobile (390)
  ✓ Frame: Home – Desktop (1440)
  ✓ Frame: Dashboard – Mobile (390)
  ✓ Frame: Dashboard – Desktop (1440)
  Built 2/2 pages
✅ [4/4] Frames built

🎉 Import complete. Check each phase above for any partial failures.
```

**Step 5 — Verify in Figma:**
- [ ] Exactly 2 pages: "🧩 Components" and "📐 Frames"
- [ ] Components page has 8 components: Button/Primary, Button/Secondary, Button/Ghost, Card, Input, Badge/Primary, Badge/Success, Badge/Error
- [ ] Frames page has 4 frames: Home Mobile (390px), Home Desktop (1440px), Dashboard Mobile (390px), Dashboard Desktop (1440px)
- [ ] Colors reflect the fixture palette (blue primary #2563EB, white background, etc.)
- [ ] No font errors in console (system-ui must have been mapped to Inter)
- [ ] Text wraps inside cards and inputs — nothing runs past an edge, including the 390px mobile frames
- [ ] Long pages are not cut off at the bottom; Dashboard Desktop's Sidebar and Main reach the bottom of the frame
- [ ] Card instances on the frames show their own titles (text overrides) and are still linked to `Card/Default`
- [ ] Icons are drawn as shapes, not ☰ / ✕ boxes

---

## Test 2: Validator catches known bad patterns

Verify `validate.sh` correctly detects each rule violation:

```bash
# Rule 6 — MULTIPLIER lineHeight
echo 'style.lineHeight = { unit: "MULTIPLIER", value: 1.5 };' > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Rule 6 FAIL, exit 1

# Rule 7 — async IIFE
echo '(async () => { await loadFonts(); })();' > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Rule 7 FAIL, exit 1

# Rule 8 — synchronous page setter
echo 'figma.currentPage = page;' > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Rule 8 FAIL, exit 1

# Rule 9 — figma.notify
echo 'figma.notify("Done");' > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Rule 9 FAIL, exit 1

# Rule 5 — unmapped system font
echo 'fontName = { family: "SF Pro", style: "Regular" };' > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Rule 5 FAIL, exit 1

# Syntax error
echo 'function broken( {' > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Syntax FAIL, exit 1

# Minimal file with no pages
echo 'console.log("ok");' > /tmp/clean.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/clean.js
# Expected: Rule 1 FAIL (no createPage calls), exit 1
```

---

The checks below start from the canonical template (`references/frame-generator.md`, the
`javascript` block) saved as `/tmp/template.js` — it must pass on its own first:

```bash
awk '/^```javascript$/{f=1;next} /^```$/{if(f){exit}} f' \
  .claude/skills/design-extractor/references/frame-generator.md > /tmp/template.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/template.js
# Expected: all checks pass incl. "Dry run: … errors=0", exit 0

# Rule 3 — undefined token key (check-tokens.mjs)
sed "s/bg: C.primary, text: 'Button'/bg: C.brandBlue, text: 'Button'/" /tmp/template.js > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Rule 2/3 FAIL "C.brandBlue — not defined in tokens.colors", exit 1

# Rule 2/3 — hex literal outside tokens
sed "s/paddingY: S.xxxl, gap: S.lg,$/paddingY: S.xxxl, gap: S.lg, bg: '#EFF6FF',/" /tmp/template.js > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Rule 2/3 FAIL "hardcoded color '#EFF6FF' outside tokens", exit 1

# Rule 11 — children appended to an instance (mock run)
sed "s/n = main.createInstance().detachInstance();/n = main.createInstance();/" /tmp/template.js > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Dry run FAIL "Cannot add children to an instance … Rule 11", exit 1

# Rule 4 — desktop removed without a stated reason
sed "/{ label: 'Desktop'/d" /tmp/template.js > /tmp/bad.js
bash .claude/skills/design-extractor/scripts/validate.sh /tmp/bad.js
# Expected: Rule 4 FAIL, exit 1 — adding "// Rule 4: desktop frames omitted — phone-only app" makes it pass

# Rule 5 — the mapping comment Rule 5 asks for must NOT fail validation
# (the template's header contains "-apple-system mapped to Inter" in a comment) → covered by the template run above
```

---

`tests/dry-run.test.mjs` (run by `npm test`) covers the dry run's own checks: fonts, colors,
Rule 6/8/9/11/12, nested instances, positioning and variables.

---

## Test 3: Framework coverage

Each framework has a dedicated fixture in `tests/`. All fixtures use the same token values (primary `#2563EB`, surface `#F8FAFC`, etc.) so you can compare outputs directly.

### How to run a fixture

```
Ask Claude Code: "Generate figma-import.js for the project at
  .claude/skills/design-extractor/tests/<fixture-name>/"
```

Then validate: `bash .claude/skills/design-extractor/scripts/validate.sh figma-import.js`

### Fixture reference

| Fixture | Token source | Components | Screens | Key thing to verify |
|---------|-------------|------------|---------|---------------------|
| `fixture/` (HTML/CSS) | `styles.css` `:root` vars | Button (3), Card, Input, Badge (3) | Home, Dashboard | CSS vars extracted, system-ui → Inter |
| `nextjs-tailwind/` | `tailwind.config.js` theme | Button (3), Card, Badge | Home, Dashboard | Tailwind color keys used, not hardcoded hex |
| `react-css-modules/` | `src/tokens.css` `:root` vars | Button (3), Card | Home, Dashboard | `.module.css` components scanned correctly |
| `vue/` | `src/assets/variables.css` | AppButton (3), AppCard | HomeView, DashboardView | SFC `<style scoped>` tokens extracted |
| `swiftui/` | `DesignSystem/Colors.swift` | AppButton (3), CardView | HomeView, DashboardView | SF Pro → Inter mapping present in output |
| `kotlin-android/` | `res/values/colors.xml` + `dimens.xml` + `styles.xml` | Button (Primary parsed + Secondary/Ghost inferred), Card | HomeActivity | `@dimen`/`@color` refs resolved; `TextAppearance` parents resolved; toolbar `elevation` → shadow; phone-only → desktop omitted |
| `kotlin-compose/` | Kotlin `ui/theme/*.kt` (+ XML mirrors, `values-night/`) | Button (2), EntryCard (2), Notification: Star, Action (2), Stars row, Rating | Onboarding ×3 (pager), Home, History, Settings (NavHost), Reminder Time (sheet) | See "Kotlin/Android — Compose" below |

### Expected output per fixture

Every fixture should produce:
- **2 pages** in Figma: "🧩 Components" and "📐 Frames"
- **One component per variant** on the Components page — e.g. `fixture/` = 8 (Button ×3, Card, Input, Badge ×3). Count each fixture's variants in the table above.
- **4 frames** on the Frames page: Home Mobile (390px), Home Desktop (1440px), Dashboard Mobile (390px), Dashboard Desktop (1440px)
- **Color styles** matching the token values in each fixture's token file

Phone-only fixtures (`kotlin-android/`, `kotlin-compose/`) produce mobile frames only, with a
`// Rule 4: desktop frames omitted — …` comment — 1 frame per screen instead of 2.

### Kotlin/Android — XML Views (`kotlin-android/`)

- Colors: 10, `color_` prefix dropped (`color_text_primary` → `textPrimary`)
- Dimens: 8 spacing, 3 radius, 7 font sizes
- Styles: `TextAppearance.FixtureApp.*` resolved (Heading = 24 / 500 via `sans-serif-medium`)
- Components: `Button/Primary` (parsed), `Button/Secondary` + `Button/Ghost` (inferred, marked so), `Card/Default` = 4
- Frames: `HomeActivity` → 1 mobile frame (toolbar, hero with heading/body/button, 2 cards)

### Kotlin/Android — Jetpack Compose (`kotlin-compose/`)

This fixture reproduces every pattern that broke the skill on a real Compose app.

| Check | Expected |
|---|---|
| Framework | Jetpack Compose for all screens; XML Views only for the notification — both reported with coverage |
| Colors | 13 from `AppColors` + `#1E3A8A` (hardcoded `HeroGradient` stop) + XML `brandPrimary`, `windowBackground` (mirrors) + `purple500`, `teal200` (listed as unused) + M3 light defaults for un-overridden slots used by the sheet/time picker/switch/slider |
| Dark mode | `colorsDark` filled from `DarkScheme` + `values-night/colors.xml` → `Colors/Dark/*` styles |
| Typography | 5 from `AppType` — Display is weight **300** (Light), Headline **600** (Roboto `SemiBold` loads); Headline/Body line heights are **PIXELS** 32 / 24 / 20; `FontFamily.Default` ("Brand") → `'Roboto'`; + notification star 22sp; framework notification text appearances marked approximated |
| Dimens | no prefixes: `notification_gap` → spacing, `notification_touch_target` → sizes, `notification_star_size` → font size, `chip_corner` → radius |
| Styles | `Theme.Fixture.Translucent` → `Theme.Fixture` → framework: depth 2 (implicit dot-parent resolved); `?android:attr/textColor*` marked approximated |
| Shadows | `EntryCard` `.shadow(2.dp)` → a shadow token + `Shadows/*` effect style |
| Gradients | `HeroGradient` linear 2-stop; `GlowGradient` radial with alpha 0.2 stop |
| Components (9) | Button/Primary, Button/Secondary, EntryCard/Done, EntryCard/Pending, Notification/Star, Notification/Action/Primary, Notification/Action/Secondary, Notification/StarsRow (`<include>`), Notification/Rating — each marked parsed/inferred |
| Frames (10, mobile only) | **Home, History, Settings** (every `composable(route)`, each with the bottom NavigationBar, selected tab highlighted) + **Reminder Time** (dimmed window + bottom sheet) + **Onboarding 1/3, 2/3, 3/3** (one frame per `HorizontalPager` page, indicator dot matching the page) + stacked **below History: History – Loading, History – Empty** (`HistoryUiState` branches) + stacked **below Settings: Settings – Sign out? dialog** (Settings content + scrim + AlertDialog) |
| Widgets | Settings: M3 **Switch** (on) and **Slider** (0.4); Reminder Time: **time picker dial with numerals** (outer 00–11, inner 12–23), hand and selector on **21** |
| Rule 10 | `'Today\'s habits'` and `'What you\'ve done this week'` escaped; `%1$d days` → `'12 days'` |
| Validator | exit 0, mock run clean |

---

## Debugging failures

| Symptom | Likely cause | How to fix |
|---|---|---|
| Font load error in Figma | System font not mapped | validate.sh Rule 5 — map to Inter / Roboto |
| `Cannot read property ... of undefined` | Missing per-item try-catch | Check frame-generator.md loops |
| Nothing created, no output | Async IIFE present | validate.sh Rule 7 |
| Script stops after phase 1–3 | runPhase helper missing | validate.sh Structure check |
| `SyntaxError` on paste | Broken generated code | validate.sh Syntax check (`node --check`) |
| `Cannot add children to an instance` | appendChild on an instance | Rule 11 — override named text layers with `texts:`; `detach:` only as a last resort |
| Empty boxes where icons should be | Icon glyph (☰ ✕) in text | Rule 12 — draw the icon as shapes |
| Text runs past the edge of a card | Text left on auto-width | Give the text node `fill: true` (wraps with `textAutoResize = 'HEIGHT'`) |
| Frame content cut off at the bottom | Fixed frame height | Hug, then `resize(width, max(device, content))` — see frame-generator.md |
| `ℹ️ Font "X" is not available in Figma — using "Y"` | Repo font not in Figma | Expected — the fallback chain picked Y; list it under Approximations (Rule 15) |
| `Too many elapsed hits of react since last report` | Figma's own UI performance warning while styles are created | Harmless — ignore |
| Every page and style exists twice | Script run twice in the same file | Run it in a fresh, empty file |
| Text lines squashed together | px line height written as PERCENT | use `lineHeightPx` (Rule 6 table) |
| `font … not loaded` for weight 600 | family spells it "SemiBold" | keep `STYLE_CANDIDATES` / `fontFor()` from the template |
| Invisible text / `Cannot read properties of undefined` in a helper | token key that doesn't exist | validate.sh Rule 2/3 (check-tokens.mjs) lists it |
| Screens missing (e.g. History, Settings) | only the start destination was mapped | Step 4: every `NavHost` route / tab / destination |
| Only the first onboarding page exists | a pager was treated as one screen | Step 4: one frame per pager page / step |
| No loading / empty / error / dialog frames | only the happy path was drawn | Step 4: states and dialogs, stacked with `variantOf` |
| Time picker drawn as a plain circle | platform widget without a recipe | `references/platform-widgets.md` |
| `TypeError: unit is invalid` | lineHeight MULTIPLIER | validate.sh Rule 6 |
| Warning: setCurrentPage deprecated | Using sync setter | validate.sh Rule 8 |
| All 4 phases logged but Figma shows nothing | Too many pages created | validate.sh Rule 1 — check page count |
