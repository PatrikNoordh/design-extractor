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
Expected: all checks pass, exit 0.

**Step 3 — Run in Figma:**
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
| `kotlin-android/` | `res/values/colors.xml` + `dimens.xml` | MaterialButton, MaterialCardView | HomeActivity | ⚠️ Not yet supported — documents the gap |

### Expected output per fixture

Every fixture should produce:
- **2 pages** in Figma: "🧩 Components" and "📐 Frames"
- **One component per variant** on the Components page — e.g. `fixture/` = 8 (Button ×3, Card, Input, Badge ×3). Count each fixture's variants in the table above.
- **4 frames** on the Frames page: Home Mobile (390px), Home Desktop (1440px), Dashboard Mobile (390px), Dashboard Desktop (1440px)
- **Color styles** matching the token values in each fixture's token file

### Kotlin/Android note

The `kotlin-android/` fixture is intentionally unsupported — running the skill against it will expose what the skill currently does with Android XML resources. Use it to spec and test Kotlin support when adding it.

---

## Debugging failures

| Symptom | Likely cause | How to fix |
|---|---|---|
| Font load error in Figma | System font not mapped | validate.sh Rule 5 — find and replace with Inter |
| `Cannot read property ... of undefined` | Missing per-item try-catch | Check frame-generator.md loops |
| Nothing created, no output | Async IIFE present | validate.sh Rule 7 |
| Script stops after phase 1–3 | runPhase helper missing | validate.sh Structure check |
| `SyntaxError` on paste | Broken generated code | validate.sh Syntax check (`node --check`) |
| `Cannot add children to an instance` | appendChild on an instance | Rule 11 — call `detachInstance()` first |
| `TypeError: unit is invalid` | lineHeight MULTIPLIER | validate.sh Rule 6 |
| Warning: setCurrentPage deprecated | Using sync setter | validate.sh Rule 8 |
| All 4 phases logged but Figma shows nothing | Too many pages created | validate.sh Rule 1 — check page count |
