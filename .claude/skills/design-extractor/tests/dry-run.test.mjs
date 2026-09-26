/**
 * Tests for scripts/dry-run.mjs — the mock Figma API that validate.sh runs generated scripts against.
 * Each case writes a small script to a temp file and checks the dry run's exit code and summary.
 */

import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = join(here, "../scripts/dry-run.mjs");
const TEMPLATE_DOC = join(here, "../references/frame-generator.md");
const tmp = mkdtempSync(join(tmpdir(), "dry-run-test-"));

let passed = 0;
let failed = 0;

function assert(condition, label, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

function dryRun(name, source) {
  const file = join(tmp, `${name}.js`);
  writeFileSync(file, source);
  try {
    const out = execFileSync("node", [DRY_RUN, file], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { exit: 0, out };
  } catch (err) {
    return { exit: err.status, out: `${err.stdout}${err.stderr}` };
  }
}

// Two components where the outer one contains an instance of the inner one
const NESTED = `
const sw = figma.createComponent(); sw.name = "Switch/On";
sw.layoutMode = "HORIZONTAL"; sw.appendChild(figma.createRectangle());
const row = figma.createComponent(); row.name = "AdminRow";
row.layoutMode = "HORIZONTAL"; row.appendChild(sw.createInstance());
const inst = row.createInstance();
`;

console.log("\n🧪 dry-run.mjs tests\n");

// ── 1. Template ───────────────────────────────────────────

console.log("1. Template from references/frame-generator.md");
const template = readFileSync(TEMPLATE_DOC, "utf8").match(/```javascript\n([\s\S]*?)\n```/)[1];
const t = dryRun("template", template);
assert(t.exit === 0, "template runs with no errors", t.out.trim());
assert(t.out.includes("pages=2 components=8 frames=4 mobile=2 desktop=2 errors=0"),
  "template builds 2 pages, 8 components, 4 frames", t.out.trim());

// ── 2. Nested instances (Rule 11) ─────────────────────────

console.log("\n2. Nested instances");
const nested = dryRun("nested", NESTED);
assert(nested.exit === 0, "instance of a component that contains another instance is valid", nested.out.trim());

const nestedInner = dryRun("nested-inner", NESTED + `
inst.findOne(n => n.type === "INSTANCE").appendChild(figma.createText());
`);
assert(nestedInner.exit === 1 && nestedInner.out.includes("Rule 11"),
  "appending to the inner instance still fails", nestedInner.out.trim());

const nestedOuter = dryRun("nested-outer", NESTED + `
inst.appendChild(figma.createRectangle());
`);
assert(nestedOuter.exit === 1 && nestedOuter.out.includes("Rule 11"),
  "appending to the outer instance still fails", nestedOuter.out.trim());

const detached = dryRun("detached", NESTED + `
inst.detachInstance().appendChild(figma.createRectangle());
`);
assert(detached.exit === 0, "appending after detachInstance() is valid", detached.out.trim());

// ── 3. Other rules the mock enforces ──────────────────────

console.log("\n3. Other checks");
const font = dryRun("unloaded-font", `
const t = figma.createText();
t.characters = "Hello";
`);
assert(font.exit === 1 && font.out.includes("was not loaded"), "text in an unloaded font fails", font.out.trim());

const glyph = dryRun("glyph", `
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
const t = figma.createText();
t.characters = "☰ Menu";
`);
assert(glyph.exit === 1 && glyph.out.includes("Rule 12"), "icon glyph in text fails", glyph.out.trim());

const fill = dryRun("fill-no-autolayout", `
const parent = figma.createFrame();
const child = figma.createFrame();
parent.appendChild(child);
child.layoutSizingHorizontal = "FILL";
`);
assert(fill.exit === 1 && fill.out.includes("not auto layout"), "FILL without an auto-layout parent fails", fill.out.trim());

const notify = dryRun("notify", `figma.notify("Done");`);
assert(notify.exit === 1 && notify.out.includes("Rule 9"), "figma.notify() fails", notify.out.trim());

rmSync(tmp, { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
