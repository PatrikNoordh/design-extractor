#!/bin/bash
# validate.sh — checks figma-import.js for known bad patterns
# Usage: bash validate.sh figma-import.js
# Exit 0 = all checks passed. Exit 1 = at least one violation found.

FILE="${1:-figma-import.js}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYNTAX_OK=0
ERRORS=0

fail() {
  echo "❌ FAIL: $1"
  ERRORS=$((ERRORS + 1))
}

pass() {
  echo "✅ PASS: $1"
}

if [ ! -f "$FILE" ]; then
  echo "Error: file not found: $FILE"
  exit 2
fi

echo "Validating: $FILE"
echo "---"

# Syntax — the script must parse. Copied to .mjs because it uses top-level await.
# Also catches most Rule 10 breakage (unescaped quotes in extracted strings).
if command -v node >/dev/null 2>&1; then
  TMP_DIR=$(mktemp -d)
  cp "$FILE" "$TMP_DIR/check.mjs"
  if SYNTAX_OUT=$(node --check "$TMP_DIR/check.mjs" 2>&1); then
    pass "Syntax: script parses (node --check)"
    SYNTAX_OK=1
  else
    fail "Syntax: script does not parse — $(echo "$SYNTAX_OUT" | grep -m1 'Error')"
  fi
  rm -rf "$TMP_DIR"
else
  echo "⚠️  SKIP: Syntax check — node not installed"
fi

# Rule 6 — lineHeight MULTIPLIER
if grep -q 'unit.*MULTIPLIER\|MULTIPLIER.*unit' "$FILE"; then
  fail "Rule 6: lineHeight uses MULTIPLIER unit (must be PIXELS, PERCENT, or AUTO)"
else
  pass "Rule 6: lineHeight unit is valid"
fi

# Rule 7 — async IIFE
if grep -qE '\(async\s*\(\s*\)\s*=>' "$FILE"; then
  fail "Rule 7: async IIFE detected — use top-level await instead"
else
  pass "Rule 7: no async IIFE"
fi

# Rule 8 — synchronous page setter
if grep -qE 'figma\.currentPage\s*=' "$FILE"; then
  fail "Rule 8: figma.currentPage = used (must use setCurrentPageAsync)"
else
  pass "Rule 8: page switching uses setCurrentPageAsync"
fi

# Rule 9a — figma.notify
if grep -q 'figma\.notify(' "$FILE"; then
  fail "Rule 9: figma.notify() found (use console.log instead)"
else
  pass "Rule 9a: no figma.notify"
fi

# Rule 9b — figma.closePlugin
if grep -q 'figma\.closePlugin(' "$FILE"; then
  fail "Rule 9: figma.closePlugin() found (must not close plugin from console)"
else
  pass "Rule 9b: no figma.closePlugin"
fi

# Rule 5 — system fonts used as font family values (not in comments)
# Full-line comments are skipped so a mapping note like "// ... mapped to Inter" can't fail the check
CODE_ONLY=$(grep -vE '^[[:space:]]*(//|/\*|\*)' "$FILE")
FONT_ERRORS=0
for font in "SF Pro" "-apple-system" "BlinkMacSystemFont"; do
  if printf '%s\n' "$CODE_ONLY" | grep -qF -- "$font"; then
    fail "Rule 5: system font '$font' found — map to Inter or Roboto"
    FONT_ERRORS=$((FONT_ERRORS + 1))
  fi
done
# system-ui: only flag when used as a font family value (inside quotes in font objects)
if grep -qE 'family.*"system-ui"|family.*'"'"'system-ui'"'"'' "$FILE"; then
  fail "Rule 5: 'system-ui' used as font family — map to Inter"
  FONT_ERRORS=$((FONT_ERRORS + 1))
fi
if [ $FONT_ERRORS -eq 0 ]; then
  pass "Rule 5: no unmapped system fonts"
fi

# Rule 1 — page count (should be exactly 2 createPage calls)
# grep -c already prints 0 on no match — do not add "|| echo 0" (it yields "0\n0")
PAGE_COUNT=$(grep -c 'figma\.createPage()' "$FILE")
if [ "$PAGE_COUNT" -gt 2 ]; then
  fail "Rule 1: $PAGE_COUNT figma.createPage() calls found (max 2 allowed)"
elif [ "$PAGE_COUNT" -eq 0 ]; then
  fail "Rule 1: no figma.createPage() calls found — script may be incomplete"
else
  pass "Rule 1: page count is $PAGE_COUNT (≤ 2)"
fi

# Rule 2/3 — hex literals assigned directly instead of via tokens.colors
# (heuristic: catches solidColor("#...") and bg/stroke/textColor/border: "#..." in data)
if grep -qE 'solidColor\(\s*["'"'"']#|\b(bg|textColor|stroke|border)\s*:\s*["'"'"']#' "$FILE"; then
  fail "Rule 2/3: hardcoded hex color outside tokens — reference tokens.colors instead"
else
  pass "Rule 2/3: colors come from tokens"
fi

# Dry run — execute the script against a mock figma API (scripts/dry-run.mjs).
# Catches what grep can't: Rule 11, unloaded fonts, bad layoutSizing, runtime errors.
# Rule 4 is checked on the frames the script actually builds.
if [ "$SYNTAX_OK" = "1" ]; then
  DRY_OUT=$(node "$SCRIPT_DIR/dry-run.mjs" "$FILE" 2>&1)
  DRY_EXIT=$?
  SUMMARY=$(echo "$DRY_OUT" | grep '^DRY_RUN')
  if [ $DRY_EXIT -eq 0 ]; then
    pass "Dry run: ${SUMMARY#DRY_RUN }"
  else
    fail "Dry run: ${SUMMARY#DRY_RUN }"
    echo "$DRY_OUT" | grep -v '^DRY_RUN' | sed 's/^/     /'
  fi
  MOBILE=$(echo "$SUMMARY" | sed -n 's/.*mobile=\([0-9]*\).*/\1/p')
  DESKTOP=$(echo "$SUMMARY" | sed -n 's/.*desktop=\([0-9]*\).*/\1/p')
  if [ "${MOBILE:-0}" -gt 0 ] && [ "$MOBILE" = "$DESKTOP" ]; then
    pass "Rule 4: $MOBILE mobile (390) + $DESKTOP desktop (1440) frames built"
  else
    fail "Rule 4: built ${MOBILE:-0} mobile (390) and ${DESKTOP:-0} desktop (1440) frames — need one of each per screen"
  fi
else
  # No node, or the script doesn't parse — fall back to a text search (weak: any 390/1440 passes)
  if grep -qE '\b390\b' "$FILE" && grep -qE '\b1440\b' "$FILE"; then
    pass "Rule 4 (text search only): 390 and 1440 appear in the script"
  else
    fail "Rule 4: missing 390 (mobile) and/or 1440 (desktop) frame size"
  fi
fi

# Structure — runPhase helper must be defined, not just called
if ! grep -qE '(async\s+)?function\s+runPhase\b' "$FILE"; then
  fail "Structure: runPhase helper not defined — script lacks resilient error handling"
else
  pass "Structure: runPhase helper defined"
fi

# Structure — progress logging
if ! grep -qE 'console\.log.*\[1/4\]' "$FILE"; then
  fail "Structure: phase progress logging missing ([1/4] pattern not found)"
else
  pass "Structure: phase progress logging present"
fi

echo "---"
if [ $ERRORS -eq 0 ]; then
  echo "All checks passed."
  exit 0
else
  echo "$ERRORS check(s) failed."
  exit 1
fi
