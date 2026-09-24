#!/usr/bin/env node
// dry-run.mjs — runs a generated figma-import.js against a mock figma API
// Usage: node dry-run.mjs figma-import.js [--verbose]
//
// The mock enforces the Figma rules that grep can't see:
//   - appendChild on an INSTANCE (or inside one) or on a TEXT node throws (Rule 11)
//   - setting text/font on a font that was never loaded throws
//   - layoutSizing "FILL" needs an auto-layout parent; "HUG" needs auto layout or text
//   - resize() on an auto-layout frame pins both axes to FIXED
// Prints one summary line: DRY_RUN pages=N components=N frames=N mobile=N desktop=N errors=N
// Exit 0 = ran with no errors. Exit 1 = a phase failed or an item was skipped.

import { readFileSync } from "fs";

const file = process.argv[2];
const verbose = process.argv.includes("--verbose");
if (!file) { console.error("Usage: node dry-run.mjs figma-import.js"); process.exit(2); }

const SYSTEM_FONTS = ["SF Pro", "SF Pro Display", "SF Pro Text", "-apple-system", "BlinkMacSystemFont", "system-ui"];
const loadedFonts = new Set();
const fontKey = (f) => `${f.family}|${f.style}`;
function requireFont(f, what) {
  if (!loadedFonts.has(fontKey(f))) throw new Error(`${what}: font "${f.family} ${f.style}" was not loaded with loadFontAsync`);
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
    parent: null, children: [], fills: [], strokes: [], effects: [], backgrounds: [],
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
      if (!(w >= 0.01 && h >= 0.01)) throw new Error(`resize(${w}, ${h}) on "${this.name}": size must be >= 0.01`);
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
      const c = makeNode(this.type);
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
      return c;
    },
    createInstance() {
      if (this.type !== "COMPONENT") throw new Error(`createInstance() on ${this.type} "${this.name}" — only components have instances`);
      const inst = this.clone();
      inst.type = "INSTANCE"; inst.mainComponent = this;
      figma.currentPage.appendChild(inst);
      return inst;
    },
    detachInstance() {
      if (this.type !== "INSTANCE") throw new Error(`detachInstance() on ${this.type} "${this.name}"`);
      this.type = "FRAME"; delete this.mainComponent;
      return this;
    },
  };

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
        state[prop] = v;
      },
    });
  }
  return n;
}

function checkSizing(n, v, axis) {
  if (v === "FILL" && (!n.parent || n.parent.layoutMode === "NONE"))
    throw new Error(`layoutSizing${axis} = "FILL" on "${n.name}": parent is not auto layout (set it after appendChild)`);
  if (v === "HUG" && n.layoutMode === "NONE" && n.type !== "TEXT")
    throw new Error(`layoutSizing${axis} = "HUG" on "${n.name}": only auto-layout frames and text can hug`);
}

const root = makeNode("DOCUMENT");
const firstPage = makeNode("PAGE");
root.appendChild(firstPage);
const styles = [];
const unmocked = new Set();

function create(type) { const n = makeNode(type); figma.currentPage.appendChild(n); return n; }
function textStyle() {
  let fontName = { family: "Inter", style: "Regular" };
  return {
    type: "TEXT_STYLE", name: "", fontSize: 12, lineHeight: { unit: "AUTO" },
    get fontName() { return fontName; },
    set fontName(v) { requireFont(v, "Text style fontName"); fontName = v; },
  };
}

const api = {
  root,
  currentPage: firstPage,
  async setCurrentPageAsync(p) { api.currentPage = p; },
  async loadFontAsync(f) {
    if (SYSTEM_FONTS.includes(f.family)) throw new Error(`Font "${f.family}" is a system font — Figma cannot load it`);
    loadedFonts.add(fontKey(f));
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
  createPaintStyle() { const s = { type: "PAINT_STYLE", name: "", paints: [] }; styles.push(s); return s; },
  createTextStyle() { const s = textStyle(); styles.push(s); return s; },
  createEffectStyle() { const s = { type: "EFFECT_STYLE", name: "", effects: [] }; styles.push(s); return s; },
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
console.warn = (...a) => {
  const msg = a.map(String).join(" ");
  if (/skip|fail/i.test(msg)) errors.push(msg);
  if (verbose || /skip|fail/i.test(msg)) orig.warn(msg);
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
console.log(`DRY_RUN pages=${scriptPages} components=${components} frames=${frames.length} mobile=${mobile} desktop=${desktop} errors=${errors.length}`);
process.exit(errors.length ? 1 : 0);
