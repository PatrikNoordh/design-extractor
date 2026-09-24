# design-extractor

**Stop manually syncing Figma with your code. Let Claude do it.**

This repo contains two Claude Code skills that bridge the gap between your code and your design tool — in one paste.

> **Status: Early Beta** — core extraction works, but the skills are still being tested across different frameworks and project structures. Expect rough edges.
> **If something crashes or breaks, please [open an issue](../../issues/new) — that's the most helpful thing you can do.**

---

## The problem (you've been here before)

Maybe you built a quick prototype with Claude — got something working, something that looks roughly right. Then you started coding it for real. Now the design lives in your head and in the code, but nowhere you can actually edit visually.

Or maybe you've been coding for a while and the design has drifted. Figma says one thing, the code does another, and nobody's sure which one is correct anymore.

Either way, you're stuck doing something that shouldn't be manual: extracting your own design from your own code so you can look at it, refine it, and make it feel human — not like something an AI spat out.

That's what these skills are for. Extract the design from your code (or your Pencil file), get it into Figma in one paste, and then put your own touch on it — adjust the spacing, soften the corners, make it yours. No more burning tokens asking Claude to tweak a border radius six times. Do that part in Figma, where it belongs.

**Use Claude to get the design out. Use Figma to make it yours.**

---

## Don't want to read? Ask Claude instead.

Since you're probably already using Claude — skip the docs. Copy the prompt below, paste it into Claude (claude.ai, Claude Code, whatever you have open), and let it walk you through everything based on your specific setup.

```
I found a repo called design-extractor that contains two Claude Code skills:

1. design-extractor — scans a codebase and generates a paste-ready Figma script
   (colors, typography, components, and page frames from the actual code values)

2. pen-to-figma — reads a .pen file from Pencil and converts it into a Figma script

The idea is: use Claude to get the design out of the code or Pencil file,
paste it into Figma in one go, then do the human refinement there — adjusting
spacing, softening corners, making it feel less AI-generated — without burning
more tokens on Claude for visual tweaks.

Can you:
1. Ask me a few questions about my project (framework, styling approach,
   whether I use Pencil) so you understand my setup
2. Tell me which skill fits my situation best
3. Walk me through exactly how to install and run it, step by step
```

That's it. Claude will ask about your stack and give you a guide that fits your actual project — not a generic one.

---

## The skills

### `design-extractor` — Code → Figma

Reads your entire codebase and generates a single JavaScript file. Paste it into the Figma console and your full design system appears: color styles, typography, components and page frames — built from the actual values in your code.

**→ [Jump to design-extractor docs](#design-extractor-1)**

---

### `pen-to-figma` *(beta)* — Pencil → Figma

Already designing in [Pencil](https://pencil.di.fm)? This skill reads your `.pen` file and converts it into the same kind of paste-ready Figma script — so your Pencil designs land in Figma with layout, variables, and components intact.

**→ [Jump to pen-to-figma docs](#pen-to-figma-1)**

---

## Quick start

**Run this one command from your project root** — it clones the repo, copies the skills into the right place, and cleans up after itself:

```bash
git clone https://github.com/PatrikNoordh/design-extractor.git _de_tmp && \
mkdir -p .claude/skills && \
cp -r _de_tmp/.claude/skills/design-extractor .claude/skills/ && \
cp -r _de_tmp/.claude/skills/pen-to-figma .claude/skills/ && \
rm -rf _de_tmp
```

Then open your project in Claude Code and ask:

```
Generate figma-import.js for this project
```

Finally, paste the output into Figma: **Plugins → Development → Open Console → paste → Enter**

That's it. No config files, no API keys, no plugins to install in Figma.

> **Note for Mac users:** The skills land in a hidden `.claude` folder. That's normal — you won't see it in Finder unless you press `Cmd + Shift + .`. The command above handles everything; you don't need to navigate there manually.

---

## design-extractor

> Reads your codebase. Generates a Figma script. One paste and your design system is in Figma.

### How it works

The skill runs in four stages every time you trigger it:

| Stage | What happens |
|-------|-------------|
| **1. Identify** | Detects the framework (Next.js, Tailwind, SwiftUI, Vue…) and locates token sources |
| **2. Extract** | Pulls colors, typography, spacing, border radius and shadows from config files and CSS |
| **3. Scan** | Finds UI components (Button, Card, Input…) and maps their variants and states |
| **4. Generate** | Produces a single `figma-import.js` that creates everything in Figma automatically |

### Usage

Install the skill and ask Claude Code:

```
"Generate figma-import.js for this project"
```

Or trigger directly:

```
/design-extractor
```

Then in Figma:
1. Plugins → Development → Open Console
2. Paste `figma-import.js`
3. Press Enter — done

### What comes out

Every run delivers three things:

1. **`figma-import.js`** — the combined, paste-ready script
2. **`design-system-summary.md`** — what was extracted and any gaps flagged
3. Three-line instructions for running it in Figma

The script creates:
- Color styles from your tokens
- Text styles from your typography scale
- A **Components** page with every component and its variants
- A **Frames** page with every route, at mobile and desktop sizes

### Supported frameworks

| Framework | Tokens | Components | Frames |
|-----------|:------:|:----------:|:------:|
| Next.js + Tailwind | ✅ | ✅ | ✅ |
| React + CSS Modules | ✅ | ✅ | ✅ |
| Vue | ✅ | ✅ | ✅ |
| HTML/CSS | ✅ | — | ✅ |
| SwiftUI | ✅ | ✅ | ✅ |
| C++ / Qt | manual | `.ui` files | widget tree |

### One-time setup (optional but recommended)

For the best results on your specific project, run the setup workflow once. It teaches the skill your exact framework and file structure:

```
"Run setup-extractor.md for this project"
```

Claude Code will scan your repo and write a "Local Project Formatting" section into `SKILL.md`. Every future extraction uses those rules automatically. You don't touch anything manually.

### Testing it yourself

The repo ships with a minimal HTML/CSS fixture you can use to verify the skill before running it on your own project:

```bash
# Step 1 — Generate against the fixture
# Ask Claude Code: "Generate figma-import.js for .claude/skills/design-extractor/tests/fixture/"

# Step 2 — Validate the output
bash .claude/skills/design-extractor/scripts/validate.sh figma-import.js

# Step 3 — Paste into Figma
# Expected: 2 pages, 8 components, 4 frames (Home + Dashboard × Mobile + Desktop)
```

See `tests/TESTING.md` for the full workflow, expected console output, and a debugging table.

### A few things worth knowing

**Figma free plan limit** — Figma free allows 3 pages max. The skill enforces a strict 2-page layout (Components + Frames) so you never hit the wall, regardless of how many routes your app has.

**No placeholders** — every value in the generated frames comes from your actual tokens. No generic rectangles, no hardcoded `#000000`.

**Read-only** — the skill never modifies your source repo.

**Transparent about gaps** — if something couldn't be extracted, `design-system-summary.md` says so explicitly.

---

## pen-to-figma

> Already designing in Pencil? This skill converts your `.pen` file into a paste-ready Figma script.

**Status: beta.** Used to move a real app design from Pencil into Figma, and the conversion engine is covered by 38 unit tests that run on every `npm test`. Known gaps: icon fonts are only partially supported, and component instances are inlined rather than linked to a Figma library. Found a bug? [Open an issue](../../issues/new).


### What it does

1. Opens your `.pen` file via the Pencil MCP integration
2. Reads all screens, components and design variables
3. Resolves variable references to their real values
4. Inlines component instances
5. Generates a `figma-plugin.js` — paste it in Figma and your Pencil design appears

### Requirements

- [Pencil](https://pencil.di.fm) installed and the Pencil MCP server connected in Claude Code
- A `.pen` file open in Pencil (or a file path you can provide)

### Usage

With a `.pen` file open in Pencil:

```
/pen-to-figma
```

Or with a specific file or page:

```
/pen-to-figma path/to/my-design.pen
/pen-to-figma — only the "Home" screen
```

Then paste `figma-plugin.js` into the Figma console, same as above.

### What transfers

| Element | Status |
|---------|--------|
| Frames and groups | ✅ |
| Auto layout (flex) | ✅ |
| Colors (hex + variables) | ✅ |
| Typography | ✅ |
| Corner radius | ✅ |
| Shadows and effects | ✅ |
| Component instances | ✅ (inlined) |
| Icon fonts | partial |
| Images | ✅ |

### Testing it yourself

Before running the skill on a real file, verify everything is wired up:

```bash
# Step 1 — Run the converter test suite
npm test
# Expected: 38 converter unit tests pass

```

See `pen-to-figma/health-check.md` for the full procedure, including what each test layer covers.

### Known limitations

- Very large files (50+ screens) may need to be converted screen by screen
- Component instances are inlined, not linked to a Figma component library
- Some Pencil-specific properties have no Figma equivalent and are silently skipped

---

## Skill file structure

```
design-extractor/
├── SKILL.md                  # main skill definition — extraction rules and Figma constraints
├── setup-extractor.md        # one-time setup workflow for calibrating to your project
├── references/               # detailed guides for patterns, templates, generation logic
├── scripts/
│   └── validate.sh           # validates a generated figma-import.js before you paste
└── tests/
    ├── fixture/              # minimal HTML/CSS project for end-to-end testing
    └── TESTING.md            # full testing workflow and debugging table

pen-to-figma/
├── SKILL.md                  # skill definition — conversion rules and Figma API constraints
└── health-check.md           # verify the skill is operational before using it on a real file

converter/
└── pen-to-figma.js           # conversion engine used by the pen-to-figma skill

tests/
├── converter.test.js         # 38 unit tests for the conversion engine
├── run.js                    # 46 end-to-end tests against a generated Figma plugin
└── figma-mock.js             # Figma API mock used by run.js
```

---

## Key principles (both skills)

- **Read-only** — neither skill modifies the source files
- **Real values only** — no placeholder colors or lorem ipsum spacing
- **Transparent about gaps** — explicit about what couldn't be converted automatically
- **No dependencies** — the output script runs in the Figma console with no plugins, no npm, nothing extra

---

## License

MIT — see [LICENSE](LICENSE)
