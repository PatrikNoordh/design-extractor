# Component Patterns – Extraction Guide

## How to identify components

### React/Next.js
Look in: `components/`, `src/components/`, `app/components/`, `ui/`

Priority files:
- `Button.tsx`, `button.tsx`, `Button/index.tsx`
- `Card.tsx`, `Input.tsx`, `Modal.tsx`, `Badge.tsx`
- `Typography.tsx`, `Text.tsx`, `Heading.tsx`
- `Avatar.tsx`, `Chip.tsx`, `Tag.tsx`
- `Navbar.tsx`, `Sidebar.tsx`, `Footer.tsx`
- `Dialog.tsx`, `Toast.tsx`, `Alert.tsx`

### SwiftUI
Look in: `Views/`, `Components/`, `UI/`
- `ButtonView.swift`, `CardView.swift`
- All files with `View` suffix
- `Color+Extensions.swift`, `Font+Extensions.swift` (tokens!)

### HTML/CSS
Look in: root, `components/`, `partials/`
- Reusable sections with clear class names
- Repeated patterns across `.html` files

### Android — XML Views
Look in: `res/layout/*.xml` (all files, not only `component_*.xml`), `res/values*/themes.xml` / `styles.xml`
- A layout used through `<include layout="@layout/x">` → component `x`
- A `style="@style/X"` shared by several widgets → one component per style; a widget that
  overrides one of the style's attributes (e.g. `android:textColor`) is a separate variant
- `MaterialButton`, `MaterialCardView`, `Chip`, `TextInputLayout`, `MaterialToolbar`
- Notification / widget RemoteViews layouts count too — they are real UI

### Android — Jetpack Compose
Look in: `components/`, `ui/`, `ui/components/`, `designsystem/`, and any `@Composable` used by
two or more screens
- `PrimaryButton.kt`, `Buttons.kt`, `*Card.kt`, `*Chip.kt`, `*Toggle.kt`, `*Rating.kt`
- Custom `Modifier` extensions that paint (`fun Modifier.glassCard()`) → a component of their own
- `@Preview` functions → sample text and one preview per variant

---

## What to extract per component

### Minimal documentation (required)
```
Component: Button
Variants: primary | secondary | ghost | destructive
Sizes: sm | md | lg
States: default | hover | disabled | loading
Tokens used: color.primary, spacing.4, radius.md, typography.button
```

### Reading variants from TSX

```tsx
// From this code:
const Button = ({ variant = 'primary', size = 'md', disabled }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'border border-blue-600 text-blue-600',
    ghost: 'text-gray-600 hover:bg-gray-100'
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
}

// Extract:
// Name: Button
// Variants: primary (#3B82F6 bg), secondary (border), ghost
// Sizes: sm (px-3 py-1.5), md (px-4 py-2), lg (px-6 py-3)
```

### Reading variants from Compose

```kotlin
// From this code:
@Composable
fun SecondaryButton(text: String, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = AppColors.Cyan),
        border = null,
        modifier = Modifier.fillMaxWidth().height(56.dp)
            .border(1.dp, AppColors.Cyan.copy(alpha = 0.6f), RoundedCornerShape(12.dp)),
    ) { Text(text, style = AppType.BodyLarge) }
}

// Extract:
// Name: Button/Secondary
// Fill: none · stroke: cyan at 60% (1px) · radius 12 · height 56 (sizes token) · width: fill
// Label: bodyLarge, cyan
```

A parameter that changes the look (`isSelected`, `isPassed`, `quality: Quality`) → one Figma
component per value that a call site or `@Preview` actually uses.

### Reading variants from Android XML

```xml
<!-- themes.xml -->
<style name="RatingAction">
    <item name="android:layout_height">@dimen/touch_target</item>
    <item name="android:textColor">?android:attr/textColorPrimary</item>
</style>

<!-- layout -->
<TextView style="@style/RatingAction" android:text="@string/skip" />
<TextView style="@style/RatingAction" android:textColor="?android:attr/textColorSecondary"
          android:text="@string/turn_off" />
```

```
// Extract:
// RatingAction/Primary   — textColorPrimary (theme attribute → approximated)
// RatingAction/Secondary — textColorSecondary override (theme attribute → approximated)
```

---

## Record parsed vs inferred

For every variant write down how you know its look:
- **parsed** — read from the component's own code/XML
- **inferred** — from a convention (e.g. Material "ghost" button), a platform default
  (M3 slot not overridden by the theme), or a theme attribute that resolves outside the repo

List both in `design-system-summary.md`.

---

## Standard components to always look for

| Component | Key props | Design tokens |
|-----------|-----------|---------------|
| Button | variant, size, disabled | color, spacing, radius, typography |
| Input/TextField | state (error, focus), size | color, border, spacing, typography |
| Card | elevation, padding | color, radius, shadow, spacing |
| Badge/Tag | color, size | color, typography, spacing, radius |
| Avatar | size, shape | color, spacing, radius |
| Modal/Dialog | size | color, shadow, radius, spacing |
| Toast/Alert | type (success/error/warn/info) | color, spacing, radius |
| Navigation | orientation, active state | color, typography, spacing |
| Switch/Toggle, Slider, Picker | on/off, value | color — see `platform-widgets.md` |

---

## Tips for Claude Code

1. Scan all files in `components/` recursively
2. Prioritize files using `cva()` or `tv()` (class-variance-authority / tailwind-variants) — they define all variants explicitly
3. If the project uses `shadcn/ui`, document which components are installed
4. If Storybook exists (`*.stories.tsx`), extract stories as variant documentation
5. Compose: `@Preview` functions are the equivalent of stories — one preview per variant
6. Platform widgets with no source in the repo → `references/platform-widgets.md`
