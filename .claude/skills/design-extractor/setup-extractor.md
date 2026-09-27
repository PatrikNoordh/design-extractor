# Setup Design Extractor

Your goal is to calibrate the `design-extractor` skill for the user's local repository, so later
runs know **where the tokens, components and screens live** and **how to map them into the
Figma import script**. The skill never generates app/frontend code — its output is always
`figma-import.js` + `design-system-summary.md`.

## Steps to execute

1. **Audit the project.** Detect every UI technology in use (a project can have more than one):

   | Look for | Means |
   |---|---|
   | `package.json` deps: `next`, `react`, `vue`, `svelte`; `tailwind.config.*`, `*.module.css`, `styled-components` | Web framework + styling approach |
   | `*.xcodeproj`, `Package.swift`, `*.swift` with `import SwiftUI` | SwiftUI |
   | `build.gradle(.kts)` + `res/layout/*.xml` inflated by Activities/Fragments | Android XML Views |
   | `@Composable`, `setContent {`, `androidx.compose` in Gradle | Android Jetpack Compose |
   | `*.ui` files, `QWidget` | Qt |

   Then record:
   - **Token sources** — the files tokens come from, in priority order (e.g. Compose
     `ui/theme/Color.kt` before `res/values/colors.xml`; `tailwind.config.js` before CSS vars)
   - **Component locations** — folders holding reusable components (`src/components/ui`,
     `…/components/`, `res/layout/`)
   - **Screen sources** — how screens are defined (App Router folders, React Router file,
     `NavHost` graph file, `*View.swift` destinations) and how many there are
   - **Coverage** — for mixed projects, how much UI each technology covers
   - **Font mapping** — which Figma family the app's fonts map to (Rule 5)
   - **Dark mode** — present (where) or absent
   - **Frame sizes** — does the app have a desktop/tablet layout? (Rule 4)

2. **Open** `.claude/skills/design-extractor/SKILL.md`.

3. **Replace the existing `## Local Project Formatting` section in place** (it sits between the
   "Correct main block" section and the "SwiftUI Project Notes" section). Do not append a
   second section at the bottom. Write the findings from step 1 as short, explicit rules, for
   example:
   - "Token source of truth: `app/ui/theme/*.kt`; `res/values/colors.xml` only mirrors 2 colors"
   - "Screens: every `composable(route)` in `navigation/AppNavGraph.kt` + `AlarmActivity`"
   - "Fonts: `FontFamily.Default` → `'Roboto'`"
   - "Phone-only: omit desktop frames (Rule 4 comment)"

4. **Preserve core rules.** Do not remove, alter or break anything outside that section —
   especially the CRITICAL RULES (1–15) and the Figma Script Generation Rules.

5. **Confirm.** Print a short message stating the technologies, token sources and screen count
   detected, and that design-extractor is now calibrated for this repo.
