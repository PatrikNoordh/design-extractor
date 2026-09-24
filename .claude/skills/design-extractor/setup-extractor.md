# Setup Design Extractor

Your goal is to calibrate the 'design-extractor' skill for the user's specific local repository.
The skill's output is always a Figma console script (`figma-import.js`) — calibration describes
**where to read the design from** and **how to convert its values**, never how to write app code.

## Steps to execute:

1. **Audit the Project:** Scan `package.json`, configuration files (like `tailwind.config.js`, `tsconfig.json`, `build.gradle`), and the source directories to identify:
   - The framework (e.g., React, Vue, Svelte, SwiftUI, Kotlin/Android).
   - The styling methodology (e.g., Tailwind CSS, CSS Modules, Styled Components, XML resources).
   - Where tokens live (config file, `:root` variables, theme object, `colors.xml`...).
   - Where components live (e.g., `src/components/ui`) and how their variants are expressed (props, class names, style files).
   - Where screens live (router file, `app/**/page.*`, `*View.swift`, `*Activity.kt`...).

2. **Update the Skill:** Open `.claude/skills/design-extractor/SKILL.md`.

3. **Replace the placeholder:** Find the existing `## Local Project Formatting` section (it says "Not yet calibrated for this project"). Replace everything from that heading up to the next `---` separator with your calibrated rules. Do not add a second section. Include:
   - **Read tokens from:** exact file paths, in priority order.
   - **Read components from:** folder paths, and how to find each variant.
   - **Read screens from:** file paths, and the screen name to use for each.
   - **Value conversions:** units and patterns specific to this repo (e.g. rem × 16 → px, `clamp()`, `dp`/`sp`, theme lookups), and any system fonts to map (Rule 5).
   - **Known gaps:** anything the skill will have to approximate for this repo.

4. **Preserve Core Rules:** DO NOT remove, alter, or break the CRITICAL RULES (1–11) or the "Figma Script Generation Rules" (Top-Level Await, Async Setters, etc.) that ensure the Figma script runs correctly in the console.

5. **Confirm:** Print a message stating the framework, styling and token source that were detected, and confirm that the design-extractor is now calibrated for this repo.
