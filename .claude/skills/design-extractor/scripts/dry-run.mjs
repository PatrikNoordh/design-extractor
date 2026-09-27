#!/usr/bin/env node
// dry-run.mjs — runs a generated figma-import.js against a mock figma API
// Usage: node dry-run.mjs figma-import.js [--verbose]
//
// The mock enforces the Figma rules that grep can't see:
//   - appendChild on an INSTANCE (or inside one) or on a TEXT node throws (Rule 11)
//   - icon glyphs like ☰ or ✕ in text throw (Rule 12)
//   - setting text/font on a font that was never loaded throws
//   - layoutSizing "FILL" needs an auto-layout parent; "HUG" needs auto layout or text
//   - resize() on an auto-layout frame pins both axes to FIXED
//   - fonts load like real Figma: Inter spells "Semi Bold", Roboto "SemiBold"; device fonts fail
//   - every paint color must be valid; lineHeight MULTIPLIER throws (Rule 6)
//   - ABSOLUTE positioning needs an auto-layout parent; figma.currentPage = … is Rule 8
// Prints one summary line: DRY_RUN pages=N components=N frames=N mobile=N desktop=N … errors=N
// Exit 0 = ran with no errors or warnings. Exit 1 = a phase failed, an item was skipped, or
// the script printed any warning.

import { readFileSync } from "fs";

const file = process.argv[2];
const verbose = process.argv.includes("--verbose");
if (!file) { console.error("Usage: node dry-run.mjs figma-import.js"); process.exit(2); }

// Style names as real Figma spells them (confirmed in real runs). Other families get the
// generic set — a style outside it (e.g. "Light") fails, so fallbacks get exercised.
const FONTS = {
  Inter:  ["Thin", "Extra Light", "Light", "Regular", "Medium", "Semi Bold", "Bold", "Extra Bold", "Black"],
  Roboto: ["Thin", "ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"],
};
const GENERIC_STYLES = ["Regular", "Medium", "Semi Bold", "Bold"];
const DEVICE_FONTS = /^(SF Pro|SF Pro Display|SF Pro Text|-apple-system|BlinkMacSystemFont|system-ui|system|sans-serif|serif|monospace)$/i;
// Common icon glyphs that are not in Inter and render as empty boxes (Rule 12)
const ICON_GLYPHS = /[☰✕✖✗✘✓✔➜➔★☆♥♡⚙⌂☎✉]/;
const loadedFonts = new Set();
const fontKey = (f) => `${f.family}|${f.style}`;
function requireFont(f, what) {
  if (!loadedFonts.has(fontKey(f))) throw new Error(`${what}: font "${f.family} ${f.style}" was not loaded with loadFontAsync`);
}

function checkPaints(paints, where) {
  if (!Array.isArray(paints)) throw new Error(`${where}: paints must be an array`);
  for (const p of paints) {
    const cols = p.type === "SOLID" ? [p.color] : (p.gradientStops || []).map((st) => st.color);
    for (const c of cols) {
      if (!c || ![c.r, c.g, c.b].every((v) => Number.isFinite(v) && v >= 0 && v <= 1))
        throw new Error(`${where}: invalid color ${JSON.stringify(c)} — undefined token?`);
    }
  }
}
function checkLineHeight(v, where) {
  if (v && v.unit === "MULTIPLIER") throw new Error(`${where}: lineHeight unit MULTIPLIER is invalid — Rule 6`);
}

let nextId = 1;
function insideInstance(n) {
  for (let p = n; p; p = p.parent) if (p.type === "INSTANCE") return true;
  return false;
}
function walk(n, fn, out) {
  for (const c of n.children || []) { if (fn(c)) out.push(c); walk(c, fn, out); }
  return out;
}

function makeNode(type) {
  const state = {
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
    fontName: { family: "Inter", style: "Regular" }, fontSize: 12, characters: "",
  };
  const n = {
    id: String(nextId++), type, name: "", x: 0, y: 0, width: 100, height: 100,
    parent: null, children: [], effects: [],
    layoutMode: "NONE", primaryAxisSizingMode: "AUTO", counterAxisSizingMode: "AUTO",
    textAutoResize: "WIDTH_AND_HEIGHT",

    appendChild(child) {
      if (this.type === "TEXT") throw new Error(`Cannot appendChild to TEXT node "${this.name}"`);
      if (insideInstance(this)) throw new Error(`Cannot add children to an instance ("${this.name}") — Rule 11`);
      if (child.parent) child.parent.children = child.parent.children.filter((c) => c !== child);
      child.parent = this;
      this.children.push(child);
    },
    insertChild(i, child) { this.appendChild(child); },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; },
    resize(w, h) {
      // Lines have no height in Figma: resize(length, 0) is valid for a LINE
      const minH = this.type === "LINE" ? 0 : 0.01;
      if (!(w >= 0.01 && h >= minH)) throw new Error(`resize(${w}, ${h}) on "${this.name}": size must be >= 0.01`);
      this.width = w; this.height = h;
      if (this.layoutMode !== "NONE") {
        this.primaryAxisSizingMode = "FIXED"; this.counterAxisSizingMode = "FIXED";
        state.layoutSizingHorizontal = "FIXED"; state.layoutSizingVertical = "FIXED";
      }
      if (this.type === "TEXT") this.textAutoResize = "NONE";
    },
    findOne(fn) { return walk(this, fn, [])[0] || null; },
    findAll(fn = () => true) { return walk(this, fn, []); },
    clone() {
      // A nested instance is built as a FRAME and becomes an INSTANCE after its children
      // are copied — otherwise the copy's own appendChild trips the Rule 11 check
      const c = makeNode(this.type === "INSTANCE" ? "FRAME" : this.type);
      for (const k of ["name", "width", "height", "fills", "strokes", "effects", "layoutMode", "primaryAxisSizingMode",
                       "counterAxisSizingMode", "textAutoResize", "fontName", "fontSize", "characters",
                       "layoutSizingHorizontal", "layoutSizingVertical"]) {
        try { c[k] = this[k]; } catch { /* sizing checks need a parent — copied below */ }
      }
      for (const ch of this.children) {
        const cc = ch.clone();
        c.appendChild(cc);
        cc.layoutSizingHorizontal = ch.layoutSizingHorizontal;
        cc.layoutSizingVertical = ch.layoutSizingVertical;
      }
      if (this.type === "INSTANCE") { c.type = "INSTANCE"; c.mainComponent = this.mainComponent; }
      return c;
    },
    createInstance() {
      if (this.type !== "COMPONENT") throw new Error(`createInstance() on ${this.type} "${this.name}" — only components have instances`);
      const inst = this.clone();
      inst.type = "INSTANCE"; inst.mainComponent = this;
      counts.instances++;
      figma.currentPage.appendChild(inst);
      return inst;
    },
    detachInstance() {
      if (this.type !== "INSTANCE") throw new Error(`detachInstance() on ${this.type} "${this.name}"`);
      this.type = "FRAME"; delete this.mainComponent;
      return this;
    },
  };

  for (const prop of ["fills", "strokes", "backgrounds"]) {
    Object.defineProperty(n, prop, {
      get: () => state[prop] || [],
      set(v) { checkPaints(v, `${prop} on "${n.name || n.type}"`); state[prop] = v; },
    });
  }
  Object.defineProperty(n, "lineHeight", {
    get: () => state.lineHeight || { unit: "AUTO" },
    set(v) { checkLineHeight(v, `"${n.name || n.type}"`); state.lineHeight = v; },
  });
  Object.defineProperty(n, "layoutPositioning", {
    get: () => state.layoutPositioning || "AUTO",
    set(v) {
      if (v === "ABSOLUTE" && (!n.parent || n.parent.type === "PAGE" || n.parent.layoutMode === "NONE"))
        throw new Error(`layoutPositioning ABSOLUTE on "${n.name}": needs an auto-layout parent (append first)`);
      state.layoutPositioning = v;
    },
  });
  Object.defineProperty(n, "layoutSizingHorizontal", {
    get: () => state.layoutSizingHorizontal,
    set(v) { checkSizing(n, v, "Horizontal"); state.layoutSizingHorizontal = v; },
  });
  Object.defineProperty(n, "layoutSizingVertical", {
    get: () => state.layoutSizingVertical,
    set(v) { checkSizing(n, v, "Vertical"); state.layoutSizingVertical = v; },
  });
  for (const prop of ["fontName", "fontSize", "characters"]) {
    Object.defineProperty(n, prop, {
      get: () => state[prop],
      set(v) {
        if (n.type !== "TEXT") { state[prop] = v; return; }
        requireFont(prop === "fontName" ? v : state.fontName, `Setting ${prop} on "${n.name || "text"}"`);
        if (prop === "characters" && ICON_GLYPHS.test(v))
          throw new Error(`Text "${v}" contains an icon glyph — draw icons as shapes (Rule 12)`);
        state[prop] = v;
      },
    });
  }
  return n;
}

function checkSizing(n, v, axis) {
  if (v === "FILL" && (!n.parent || n.parent.type === "PAGE" || n.parent.layoutMode === "NONE"))
    throw new Error(`layoutSizing${axis} = "FILL" on "${n.name}": parent is not auto layout (set it after appendChild)`);
  if (v === "HUG" && n.layoutMode === "NONE" && n.type !== "TEXT")
    throw new Error(`layoutSizing${axis} = "HUG" on "${n.name}": only auto-layout frames and text can hug`);
}

const root = makeNode("DOCUMENT");
const firstPage = makeNode("PAGE");
root.appendChild(firstPage);
const unmocked = new Set();

function create(type) { const n = makeNode(type); figma.currentPage.appendChild(n); return n; }
function textStyle() {
  let fontName = { family: "Inter", style: "Regular" };
  return {
    type: "TEXT_STYLE", name: "", fontSize: 12, _lh: { unit: "AUTO" },
    get fontName() { return fontName; },
    set fontName(v) { requireFont(v, "Text style fontName"); fontName = v; },
    get lineHeight() { return this._lh; },
    set lineHeight(v) { checkLineHeight(v, "Text style"); this._lh = v; },
  };
}

let currentPage = firstPage;
const counts = { styles: 0, variables: 0, instances: 0 };
const api = {
  root,
  get currentPage() { return currentPage; },
  set currentPage(p) { throw new Error("figma.currentPage = … used — use setCurrentPageAsync (Rule 8)"); },
  async setCurrentPageAsync(p) { currentPage = p; },
  async loadFontAsync(f) {
    if (DEVICE_FONTS.test(f.family)) throw new Error(`Font "${f.family}" is a device font — Figma cannot load it (Rule 5)`);
    if (!(FONTS[f.family] || GENERIC_STYLES).includes(f.style)) throw new Error(`Font "${f.family} ${f.style}" is not available`);
    loadedFonts.add(fontKey(f));
  },
  variables: {
    createVariableCollection(name) {
      return { name, modes: [{ modeId: "m1", name: "Mode 1" }], renameMode() {},
               addMode() { throw new Error("addMode: the free plan allows one mode per collection"); } };
    },
    createVariable(name, collection, type) {
      if (typeof collection !== "object") throw new Error("createVariable: pass the collection object, not its id");
      counts.variables++;
      return { name, type, setValueForMode(mode, v) {
        if (type === "FLOAT" && !Number.isFinite(v)) throw new Error(`variable ${name}: ${v} is not a number`);
      } };
    },
  },
  createPage() { const p = makeNode("PAGE"); root.appendChild(p); return p; },
  createFrame: () => create("FRAME"),
  createComponent: () => create("COMPONENT"),
  createRectangle: () => create("RECTANGLE"),
  createEllipse: () => create("ELLIPSE"),
  createLine: () => create("LINE"),
  createVector: () => create("VECTOR"),
  createPolygon: () => create("POLYGON"),
  createStar: () => create("STAR"),
  createText: () => create("TEXT"),
  createPaintStyle() {
    counts.styles++;
    let paints = [];
    return { type: "PAINT_STYLE", name: "",
             get paints() { return paints; }, set paints(v) { checkPaints(v, "paint style"); paints = v; } };
  },
  createTextStyle() { counts.styles++; return textStyle(); },
  createEffectStyle() { counts.styles++; return { type: "EFFECT_STYLE", name: "", effects: [] }; },
  combineAsVariants(nodes, parent) {
    const set = makeNode("COMPONENT_SET");
    parent.appendChild(set);
    for (const c of nodes) set.appendChild(c);
    return set;
  },
  group(nodes, parent) { const g = makeNode("GROUP"); parent.appendChild(g); for (const c of nodes) g.appendChild(c); return g; },
  viewport: { scrollAndZoomIntoView() {} },
  notify() { throw new Error("figma.notify() used — Rule 9"); },
  closePlugin() { throw new Error("figma.closePlugin() used — Rule 9"); },
};

// Unknown API calls are reported, not failed — the mock may simply not cover them
const figma = new Proxy(api, {
  get(t, k) {
    if (k in t) return t[k];
    unmocked.add(String(k));
    return () => makeNode("UNKNOWN");
  },
});
globalThis.figma = figma;

// ---- run the script, capturing its console output ----
const errors = [];
const orig = { log: console.log, warn: console.warn, error: console.error };
console.log = (...a) => { if (verbose) orig.log(...a); };
// Every warning counts: the template only warns when something was skipped or approximated
console.warn = (...a) => {
  const msg = a.map(String).join(" ").trim();
  errors.push(msg);
  orig.warn(msg);
};
console.error = (...a) => {
  const msg = a.map((x) => (x instanceof Error ? x.message : String(x))).join(" ");
  errors.push(msg);
  orig.error(msg);
};

const src = readFileSync(file, "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
try {
  await new AsyncFunction(src)();
} catch (err) {
  errors.push(`Uncaught: ${err.message}`);
  orig.error(`Uncaught: ${err.message}`);
}
Object.assign(console, orig);

// ---- summarize ----
const pages = root.children;
const components = root.findAll((n) => n.type === "COMPONENT").length;
const frames = pages.flatMap((p) => p.children.filter((n) => n.type === "FRAME"));
const mobile = frames.filter((f) => f.width === 390).length;
const desktop = frames.filter((f) => f.width === 1440).length;
// the mock's own default page is not created by the script
const scriptPages = pages.filter((p) => p !== firstPage).length;

if (unmocked.size) console.log(`NOTE: figma.${[...unmocked].join(", figma.")} not covered by the mock`);
console.log(`DRY_RUN pages=${scriptPages} components=${components} frames=${frames.length} mobile=${mobile} desktop=${desktop} styles=${counts.styles} variables=${counts.variables} instances=${counts.instances} errors=${errors.length}`);
process.exit(errors.length ? 1 : 0);
