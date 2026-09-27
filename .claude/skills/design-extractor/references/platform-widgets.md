# Platform Widgets – Recipes for Widgets With No Source in the Repo

Built-in platform widgets (Material3 `TimePicker`, `Switch`, `Slider`, SwiftUI `Toggle`, …) have
no layout code in the repo, only a call site. Drawing them as a plain rectangle or circle loses
what makes them recognisable — e.g. a time picker drawn as an empty grey circle no longer reads
as a clock.

Rules:
- Use a builder from this file whenever a screen contains one of these widgets.
- Colors come from the project's tokens: map each widget slot to the color the app's theme gives
  it (e.g. M3 `primary` → the token the `ColorScheme` assigns to `primary`). If the theme does not
  override a slot, add the platform default as its own token (e.g. `m3SurfaceContainerHighest`)
  and flag it as a platform default in the summary.
- If a widget in the app has **no recipe here**, draw the closest approximation and list it in
  `design-system-summary.md` under "approximated as a plain shape". Never leave it silent.

How to use: copy the builder into the script's `WIDGET_BUILDERS` object, then place it in a
screen with `{ widget: '<name>', …params }`. Builders return an unattached node; `buildNode`
appends it and applies `fill` / `grow` / `width` / `height`.

The four builders below (`timePickerDial24`, `ringProgress`, `switch`, `slider`) pass the dry run
in `scripts/validate.sh`. The mock can't see rendering problems — the arc limit below was only
found in real Figma — so check a new builder in real Figma once (see tests/TESTING.md).

---

## Material3 TimePicker — dial (24-hour)

Compose `TimePicker(state, is24Hour = true)` / View `MaterialTimePicker` (clock input).
Geometry from Material3 specs: 256dp dial, numerals on an outer ring at 101dp and an inner ring
at 69dp, 48dp selector circle, 2dp hand, 8dp centre dot. Outer ring: 00, 1 … 11. Inner ring:
12, 13 … 23. Numerals are 12 positions clockwise from the top.

| Param | M3 slot |
|---|---|
| `bg` | `surfaceContainerHighest` (clock dial container) |
| `selectorColor` | `primary` (selector circle + hand + centre dot) |
| `numeralColor` | `onSurface` |
| `selectedNumeralColor` | `onPrimary` |
| `numeralStyle` | `bodyLarge` (typography token) |

```javascript
WIDGET_BUILDERS.timePickerDial24 = (spec) => {
  const size = spec.size || 256;
  const c = size / 2;
  const dial = figma.createFrame();
  dial.name = spec.name || 'Time Picker Dial';
  dial.resize(size, size);
  dial.cornerRadius = size / 2;
  dial.fills = solidColor(spec.bg);
  dial.clipsContent = false;

  const outerR = size * 101 / 256;
  const innerR = size * 69 / 256;
  const selectorD = size * 48 / 256;
  const hour = spec.selectedHour ?? 0;
  const selInner = hour >= 12;
  const selIndex = hour % 12;
  // Index 0 is 12 o'clock, clockwise in 30° steps
  const at = (i, r) => ({ x: c + r * Math.sin(i * Math.PI / 6), y: c - r * Math.cos(i * Math.PI / 6) });
  const sel = at(selIndex, selInner ? innerR : outerR);

  const selector = figma.createEllipse();
  selector.name = 'Selector';
  dial.appendChild(selector);
  selector.resize(selectorD, selectorD);
  selector.x = sel.x - selectorD / 2;
  selector.y = sel.y - selectorD / 2;
  selector.fills = solidColor(spec.selectorColor);

  // Hand: a line starts at its own (x, y) and points right; Figma's rotation property turns it
  // counter-clockwise around that start point, so 90° − clock angle points it at the selector.
  const hand = figma.createLine();
  hand.name = 'Hand';
  dial.appendChild(hand);
  hand.x = c;
  hand.y = c;
  hand.resize(Math.hypot(sel.x - c, sel.y - c), 0);
  hand.strokes = solidColor(spec.selectorColor);
  hand.strokeWeight = 2;
  hand.rotation = 90 - selIndex * 30;

  const dot = figma.createEllipse();
  dot.name = 'Centre';
  dial.appendChild(dot);
  dot.resize(8, 8);
  dot.x = c - 4;
  dot.y = c - 4;
  dot.fills = solidColor(spec.selectorColor);

  const rings = [
    { r: outerR, inner: false, label: i => (i === 0 ? '00' : String(i)) },
    { r: innerR, inner: true,  label: i => String(i + 12) }
  ];
  for (const ring of rings) {
    for (let i = 0; i < 12; i++) {
      const selected = ring.inner === selInner && i === selIndex;
      const t = txt(ring.label(i), spec.numeralStyle, selected ? spec.selectedNumeralColor : spec.numeralColor);
      dial.appendChild(t);
      const p = at(i, ring.r);
      t.x = p.x - t.width / 2;
      t.y = p.y - t.height / 2;
    }
  }
  return dial;
};
```

12-hour variant: one ring (12, 1 … 11) at 101dp, plus an AM/PM segmented toggle beside the
hour/minute selectors.

### Time selector boxes (above the dial)

Plain node specs — no builder needed:

```javascript
{ name: 'Time Selector', layout: 'HORIZONTAL', align: 'CENTER', gap: S.<8>, children: [
  // selected field: primaryContainer / onPrimaryContainer
  { name: 'Hour', layout: 'HORIZONTAL', width: 96, height: 80, radius: R.<8>, bg: C.<primaryContainer>,
    justify: 'CENTER', align: 'CENTER', children: [{ text: '23', style: '<displayLarge 57>', color: C.<onPrimaryContainer> }] },
  { text: ':', style: '<displayLarge 57>', color: C.<onSurface> },
  // unselected field: surfaceContainerHighest / onSurface
  { name: 'Minute', layout: 'HORIZONTAL', width: 96, height: 80, radius: R.<8>, bg: C.<surfaceContainerHighest>,
    justify: 'CENTER', align: 'CENTER', children: [{ text: '00', style: '<displayLarge 57>', color: C.<onSurface> }] }
] }
```

---

## Material3 CircularProgressIndicator / progress rings drawn on a Canvas

`CircularProgressIndicator` (40dp, 4dp stroke) and custom `drawArc` rating rings. The indicator
uses Figma's arc support (`arcData`), so it keeps a true hole. Figma cannot round arc end caps
(`StrokeCap.Round`) — note it as approximated when the app uses them.

Seen in a real Figma run: an arc whose angles go past π — or a full 2π sweep — renders as
nothing (Figma normalises the angles). The builder therefore draws the full track as a stroked
ellipse and splits the indicator into pieces that each stay inside [−π, π].

| Param | M3 slot / source |
|---|---|
| `color` | `primary` (indicator) or the arc's draw color |
| `track` | `surfaceContainerHighest` / the track arc's color — omit for no track |
| `progress` | 0–1 (indeterminate spinners: use ~0.25) |
| `text`, `textStyle`, `textColor` | optional centre label (e.g. `'4.2'`) |
| `subText`, `subTextStyle`, `subTextColor` | optional second centre line (e.g. `'/ 5'`) |

```javascript
WIDGET_BUILDERS.ringProgress = (spec) => {
  const size = spec.size || 40;
  const stroke = spec.stroke || 4;
  const root = figma.createFrame();
  root.name = spec.name || 'Progress Ring';
  root.resize(size, size);
  root.fills = [];
  root.clipsContent = false;
  // Full track: a stroked circle (a 2π arc collapses to nothing in Figma)
  if (spec.track) {
    const t = figma.createEllipse();
    t.name = 'Track';
    root.appendChild(t);
    t.resize(size, size);
    t.fills = [];
    t.strokes = solidColor(spec.track);
    t.strokeWeight = stroke;
    t.strokeAlign = 'INSIDE';
  }
  // Indicator: arcData angles are radians, clockwise from 3 o'clock; start at 12 o'clock.
  // Split the sweep into pieces that never cross π, so Figma's angle normalisation keeps them.
  const p = Math.min(Math.max(spec.progress ?? 0.25, 0), 1);
  let from = -Math.PI / 2;
  let left = 2 * Math.PI * p;
  let piece = 0;
  while (left > 1e-6) {
    if (from >= Math.PI) from -= 2 * Math.PI;
    const to = Math.min(from + left, Math.PI);
    const e = figma.createEllipse();
    e.name = `Indicator ${++piece}`;
    root.appendChild(e);
    e.resize(size, size);
    e.arcData = { startingAngle: from, endingAngle: to, innerRadius: 1 - (2 * stroke) / size };
    e.fills = solidColor(spec.color);
    left -= to - from;
    from = to;
  }
  const lines = [];
  if (spec.text !== undefined) lines.push(txt(spec.text, spec.textStyle, spec.textColor));
  if (spec.subText !== undefined) lines.push(txt(spec.subText, spec.subTextStyle, spec.subTextColor));
  const total = lines.reduce((h, t) => h + t.height, 0);
  let y = (size - total) / 2;
  for (const t of lines) {
    root.appendChild(t);
    t.x = (size - t.width) / 2;
    t.y = y;
    y += t.height;
  }
  return root;
};
```

---

## Material3 Switch / SwiftUI Toggle

M3: 52×32 track, thumb 24dp (on) / 16dp (off), 2dp outline when off.
iOS: 51×31 track, 27pt thumb, no outline, `trackOn` = system green or the app tint.

| Param | M3 slot (on) | M3 slot (off) |
|---|---|---|
| `track` | `primary` | `surfaceContainerHighest` |
| `thumb` | `onPrimary` | `outline` |
| `outline` | — | `outline` |

```javascript
WIDGET_BUILDERS.switch = (spec) => {
  const ios = spec.platform === 'ios';
  const w = ios ? 51 : 52;
  const h = ios ? 31 : 32;
  const thumb = ios ? 27 : (spec.on ? 24 : 16);
  const track = figma.createFrame();
  track.name = spec.name || `Switch – ${spec.on ? 'On' : 'Off'}`;
  track.resize(w, h);
  track.cornerRadius = h / 2;
  track.fills = solidColor(spec.track);
  if (!spec.on && spec.outline) {
    track.strokes = solidColor(spec.outline);
    track.strokeWeight = 2;
    track.strokeAlign = 'INSIDE';
  }
  const knob = figma.createEllipse();
  knob.name = 'Thumb';
  track.appendChild(knob);
  knob.resize(thumb, thumb);
  const inset = (h - thumb) / 2;
  knob.x = spec.on ? w - thumb - inset : inset;
  knob.y = inset;
  knob.fills = solidColor(spec.thumb);
  return track;
};
```

---

## Material3 Slider / SwiftUI Slider

Track 4dp (M3 2024: 16dp with a 4×44 handle — use the older look unless the app sets
`SliderDefaults` for the new one). Active part left of the thumb.

| Param | M3 slot |
|---|---|
| `active` | `primary` |
| `inactive` | `secondaryContainer` |
| `thumb` | `primary` |

```javascript
WIDGET_BUILDERS.slider = (spec) => {
  const w = spec.width || 280;
  const h = 44;
  const value = Math.min(Math.max(spec.value ?? 0.5, 0), 1);
  const root = figma.createFrame();
  root.name = spec.name || 'Slider';
  root.resize(w, h);
  root.fills = [];
  const thumbD = 20;
  const cx = thumbD / 2 + value * (w - thumbD);
  const bar = (name, x, width, color) => {
    const r = figma.createRectangle();
    r.name = name;
    root.appendChild(r);
    r.resize(Math.max(width, 0.01), 4);
    r.x = x;
    r.y = h / 2 - 2;
    r.cornerRadius = 2;
    r.fills = solidColor(color);
  };
  bar('Inactive', cx, w - cx, spec.inactive);
  bar('Active', 0, cx, spec.active);
  const t = figma.createEllipse();
  t.name = 'Thumb';
  root.appendChild(t);
  t.resize(thumbD, thumbD);
  t.x = cx - thumbD / 2;
  t.y = h / 2 - thumbD / 2;
  t.fills = solidColor(spec.thumb);
  return root;
};
```

Give the slider an explicit `width`; its parts are positioned absolutely, so `fill` would stretch
the frame without moving the thumb.

---

## Recipes as plain node specs (no builder)

### Material3 NavigationBar (bottom navigation)
80dp tall, container = the color the app passes (`containerColor`) or `surfaceContainer`.
One item per destination, each `grow: true`, vertical, centred, gap 4:
- indicator pill 64×32 (`secondaryContainer`, or the app's `indicatorColor`) behind the icon —
  only on the selected item
- icon (24dp; use the app's glyph/text icon if it has one) and label (`labelMedium`)
- selected colors: `onSecondaryContainer` / app `selectedIconColor`; unselected: `onSurfaceVariant`

### Material3 TopAppBar
64dp tall, horizontal, `paddingX` 16, `justify: 'SPACE_BETWEEN'`, `align: 'CENTER'`.
Title `titleLarge` (or the app's style) left; action icons 48×48 right. Container transparent
or the app's `containerColor`.

### Material3 AlertDialog (and any dialog over a screen)

A dialog frame = the host screen's sections, then ONE last section with `overlay: true` (drawn on
top, stretched over the whole frame):

```javascript
{ overlay: true, name: 'Scrim', layout: 'VERTICAL', bg: C.<black>, bgAlpha: 0.32,
  justify: 'CENTER', align: 'CENTER', children: [
    { name: 'Dialog', layout: 'VERTICAL', width: <312; 390 − 2×24 for wide content>, radius: 28,
      bg: C.<containerColor or surfaceContainerHigh>, paddingX: 24, paddingY: 24, gap: 16, children: [
        { text: '<title>', style: '<headlineSmall or the app style>', color: C.<onSurface> },
        // body: text, or a widget (time picker) — width: fill
        { name: 'Actions', layout: 'HORIZONTAL', fill: true, justify: 'MAX', gap: 8, children: [
          // dismissButton first, confirmButton last (TextButtons: 40dp tall, paddingX 12)
        ] }
      ] }
  ] }
```

- Scrim: M3 dialogs 0.32 black; a translucent Activity with `backgroundDimEnabled` uses 0.6.
- `AlertDialog(containerColor = …)` overrides the container; otherwise `surfaceContainerHigh`.
- `AlertDialog(text = { TimePicker(…) })`: put the time selector + `timePickerDial24` in the body.
- Snackbars / toasts are transient — list them in the summary, do not draw them.

---

## Material3 ModalBottomSheet
The screen behind (or the dimmed window: `C.black`, alpha 0.32 for M3 scrim, 0.6 for a
translucent Activity with `backgroundDimEnabled`) → a `grow: true` spacer frame, then the sheet:
`topRadius` 28, container `surfaceContainerLow`, drag handle 32×4 pill (`onSurfaceVariant`
at alpha 0.4) with 22dp vertical padding.

### Material3 DatePicker (calendar)
Header (`headlineLarge` selected date), month row with arrows, weekday initials row, then a
7-column wrap grid of 40×40 day cells (`bodyLarge`); selected day = `primary` circle with
`onPrimary` text; today = 1dp `primary` outline.

### SwiftUI Picker (wheel style) / UIDatePicker wheels
A vertical stack of 5 rows per column (outer rows at alpha 0.3, 0.6), the middle row inside a
rounded 32pt highlight band (`secondarySystemFill`-like token).

### Material3 Chip / FilterChip
32dp tall, radius 8, 1dp `outline` stroke when unselected; selected = `secondaryContainer` fill,
no stroke, leading check mark drawn as two short rotated rectangles (not a ✓ glyph — Rule 12).

---

## Icons

Icon glyphs (☰ ✕ ✓ ➜ ★ ⚙ …) are not in Inter or Roboto and render as empty boxes (Rule 12) — the
dry run fails on them. Draw simple icons from shapes: the template's `menuIcon` builder is the
pattern (three rounded bars). For an app icon set (Material Symbols, SF Symbols, SVGs) draw the
closest simple shape and list the icon under approximations in the summary.
