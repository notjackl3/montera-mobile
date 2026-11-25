# MONTERA mobile

A low-fidelity but working mobile prototype of [MONTERA](https://github.com/phintruong/MONTERA) —
interactive 3D assembly guidance for IKEA flat-pack furniture. The web MVP answers
"what does this step look like in 3D?"; this is what the same idea feels like on a
phone, where you are actually sitting on the floor with the parts.

Built with Expo + React Native, so it runs on a real device via Expo Go.

---

## Run it

```bash
npm install
npx expo start
```

Then scan the QR code with **Expo Go** on your phone, or press `i` for the iOS
simulator / `a` for Android.

The camera scanners want a physical device to be interesting. In the simulator
they fall back to a simulated viewfinder and still resolve, so the whole flow is
demoable without a camera.

## Design

Ported from the web app's `DESIGN.md`, which derives from IKEA.com tokens and the
paper manual — so this is the same light system, not a mobile reinterpretation.

| Token | Value | Use |
|---|---|---|
| canvas | `#FFFEFB` | page **and** 3D background |
| ink | `#111111` | text, part outlines, dark fills |
| ink-soft | `#484848` | secondary text |
| hairline | `#DADADA` | 1 px dividers and outlines |
| blue | `#0058A3` | primary action, active parts |
| yellow | `#FFDB00` | current step marker, warnings |

Three rules do most of the work, and a test enforces each:

- **Flat.** No shadows, no blur. Separation comes from hairlines and colour blocks.
- **Blue is the primary action; yellow never carries text.** Yellow on white is
  about 1.5:1, so it is only ever a fill or a marker — text on yellow is ink.
- **The 3D is a line drawing.** Parts are canvas-white with ink edges, blue edges
  on the part being fitted, light grey on parts not yet reached. No floor grid —
  only a soft contact shadow, which ghosted parts do not cast.

Type is Noto Sans in 400 and 700 only, loaded via `@expo-google-fonts/noto-sans`;
if the font fails to load the app still renders in the system face.

## Test it

```bash
npm test          # 85 unit tests
npm run typecheck # strict TypeScript
```

The logic layer — catalogue, generators, pose engine, scanners, study maths —
imports nothing from React Native, so it runs under plain Node with no native
mocking. The suite's load-bearing checks are the cross-file invariants that fail
silently in the app rather than throwing:

- every guide step references a part id the generator **actually emits** (a typo or
  generator rename otherwise makes that part never appear, with no error anywhere)
- every guide places **all** of its product's parts by the final step
- authored per-step camera angles sit inside `useOrbit`'s clamp, so no step parks
  the camera below the floor
- each guided build totals **less** than the paper baseline it claims to beat
- article numbers and EANs are unique, so a scan is never ambiguous
- the study comparison only averages products built under **both** conditions
- the design rules above: every text colour clears WCAG AA on canvas, and no
  source file uses yellow as a text or icon colour

UI layout and 3D rendering are not unit tested — those are verified by running the
app.

---

## What is in it

### Four scanners
All reachable from the **Scan** tab, each with its own reticle and read behaviour.

| Scanner | What it does | Real or simulated |
|---|---|---|
| **Article number** | Reads the barcode or 8-digit article number off the flat-pack label and opens that product | **Real** — any EAN-13/EAN-8/Code 128/QR in frame is decoded by `expo-camera` and looked up against the catalogue |
| **Box / product photo** | Identifies the model from a photo of the box or the assembled item | Simulated, returned as a confidence-ranked match list |
| **Manual page** | Finds which step of the paper manual you are on and opens the 3D version of that exact step | Simulated, resolves to a step index |
| **Loose hardware** | Names the fittings spread out in front of you and says which step needs them | Simulated, reads from the product's fittings list |

Every scanner has a **demo target** control at the bottom of the viewfinder. Tap it
to cycle which product the scan will resolve to, so a live demo never surprises
you. There is also a keyboard fallback on the Scan tab — type `404.312.09` — for
rooms with bad lighting.

### Four ways to view a product
The viewer (`/viewer/[id]`) has a mode switcher:

- **Solid** — the finished product, drag to orbit, pinch to zoom
- **Exploded** — every panel pushed out along the direction it is fitted from, with a separation slider
- **Parts** — tap any piece to isolate it; everything else drops to a ghost
- **Size** — wireframe footprint cage plus the real width/depth/height

The camera pulls back as the separation slider rises, so a fully exploded unit
still fits the frame.

### Step-by-step build mode
The core screen (`/build/[id]`). Parts from earlier steps sit assembled, the
current step's parts float just off their destination so the animation reads as
them being fitted, and later parts are ghosted. Plus:

- Per-step instructions, fittings with quantities and part codes, tool needed, tips and tip-over warnings
- Camera auto-frames each step from the angle that step is best seen from
- Swipe the instruction card sideways to move between steps; drag the model above to orbit
- Live timer against the product's real-world baseline, screen kept awake, haptics on each step
- Progress is saved, so leaving and coming back resumes where you were

### Study mode
MONTERA's research angle: paper manual as the control condition against the 3D
guide. Aggregate and per-product comparison bars, a session log with each run's
delta against baseline, and an **Export** button that writes the sessions to JSON
and opens the share sheet.

---

## How the 3D works

There are no model files in this repo. Every product is described only by its real
IKEA dimensions plus a generator name:

```ts
{ gen: 'grid', w: 77, d: 39, h: 77, cols: 2, rows: 2, t: 3.5 }   // KALLAX 2×2
```

`src/engine/generators.ts` turns that into the actual panels, legs, dividers and
back boards that come in the box, with **deterministic part ids** (`side-l`,
`shelf-3`, `div-v-1`). That matters because it means the hand-authored guides in
`src/data/guides.ts` can reference parts by id without any asset pipeline — and
every product in the catalogue gets a 3D model, an exploded view and a parts
inspector for free.

`src/engine/pose.ts` is the pose engine: given a product, a guide and the current
step or view mode, it resolves where every part should be and how opaque it is.
Screens never position anything themselves — they pass a `mode` and a `step`.

The same generated geometry also powers the list thumbnails: `src/ui/Thumb.tsx`
projects the parts through a fixed isometric camera and paints them as SVG
polygons back-to-front, so a 34-row catalogue costs zero GL contexts.

---

## Catalogue

34 seeded products across the three tiers MONTERA uses:

- **Guided** (3) — LACK side table, BILLY bookcase, KALLAX 2×2. Hand-authored steps with per-step timings, fittings and warnings.
- **3D model** (18) — procedural model, dimensions, fittings list and a baseline time, but no authored steps.
- **Parts only** (13) — catalogue depth so search has something to find.

Dimensions, article numbers and prices track real listings. Hardware codes follow
IKEA's six-digit fittings numbering and are representative rather than
authoritative. Baseline timings reference the IKEA-ASM, IKEA-Manual and IKEA
Manuals-at-Work datasets (CC BY-NC / CC BY-NC-SA); the seeded study sessions are
illustrative, not collected data.

---

## Layout

```
app/                      expo-router routes
  (tabs)/
    index.tsx             Home — resume a build, scanner shortcuts, guided builds
    scan.tsx              Scanner hub + type-an-article-number fallback
    catalog.tsx           Search, category and detail-level filters
    study.tsx             Paper vs 3D comparison, session log, JSON export
  product/[id].tsx        Hero 3D, specs, panel list, fittings bag
  viewer/[id].tsx         Solid / exploded / parts / size
  build/[id].tsx          Step-by-step player
  scanner/[mode].tsx      All four scanners
src/
  data/                   types, catalogue, hardware, authored guides
  engine/                 generators, pose engine, scanner logic
  three/                  Canvas, camera rig, part meshes, touch orbit
  ui/                     design tokens, components, isometric thumbnails
  store/                  progress, recents, study sessions
```

## Known prototype edges

- Three of the four scanners are simulated by design; the article-number one is real.
- The 3D drops per-finish colour: a black-brown LACK and a white BILLY both render
  as white-with-ink-edges, because that is what the line-drawing style specifies.
  The finish is still named in the product's text.
- Procedural models read as the right product but are not accurate down to the fitting — a KALLAX divider is a box, not a routed panel.
- State is in memory only. Progress and sessions reset when the app is reloaded, and **Reset demo data** in Study mode restores the seeded set deliberately.
- Drawers and doors are rendered as faces rather than opening assemblies.
