# Figma Plugin Script Template

This is runnable JavaScript for Figma's built-in plugin environment.

## How to run a script in Figma

1. Open Figma
2. Menu (top left) → Plugins → Development → Open Console
3. Paste the script
4. Press Enter

No installation. No accounts. No API keys. Just paste and run.

## What gets created

```
Figma Pages (maximum 2 — free plan limit):
  🧩 Components → all components side by side
  📐 Frames     → ALL page frames side by side on one canvas
```

All page frames sit on a single "📐 Frames" page, positioned with an xOffset (80px gap).
Never create a separate Figma page per route.

## Template reference

The full combined script template (tokens + components + frames) is in:
→ `references/frame-generator.md`

Use that as the base. Claude Code will fill in the actual values from the repo.

## Tips for Claude Code

1. Replace all sample values (`tokens`, `components`, `pages`, `FRAME_SIZES`) with values extracted from the repo
2. Add one component per variant found in the component scan
3. Add every screen found in the screen scan (every route / NavHost destination / tab)
4. Keep helper functions intact — they are tested; do not write a second `loadFonts` or `txt`
5. Set `DEFAULT_TEXT_STYLE`, `DEFAULT_TEXT_COLOR` and `DEFAULT_BACKGROUND` to real token keys
6. Copy the widget builders you need from `references/platform-widgets.md` into `WIDGET_BUILDERS`
7. Always generate a single ready-to-run script, never a template
8. Add a comment header with project name and generation date
9. Run `scripts/validate.sh` — it also executes the script against a Figma API mock
