# MONTERA mobile: frontend update plan

A brief for an agent working alone in this repo (`~/Programming/montera-mobile`). Read it all
before changing anything. It is self-contained: you do not need the conversation it came from.

## 1. What this is and why

MONTERA is a CSC318 (UofT, Group 18) course project: an interactive 3D assembly guide for IKEA
flat-pack furniture. The job it serves, in the team's words:

> When I assemble flat-pack furniture, I want to be sure I have the right part, facing the right
> way, while both of my hands are busy, so that I don't find the mistake three steps later.

There are two builds, and the owner wants both to show and to use:

- **Web** (`~/Programming/MONTERA`, Vite + react-three-fiber): the step player. It was reworked
  recently and already has most of the fixes below. Treat it as the reference for behaviour and
  wording. **Do not edit it.**
- **Mobile** (this repo, Expo SDK 58 + React Native 0.88 + expo-router): home, four scanners,
  catalogue, 3D viewer, build mode, study mode. It was built before the paper-prototype study and
  has none of the study's fixes. **This plan brings its frontend up to the design the team
  committed to.**

The app is a prototype for a usability study (8 to 12 participants, 35 minutes, a real phone, real
boards and screws, voice run Wizard-of-Oz). The course staff said plainly: **the system does not
have to work.** Simulated scanning and simulated voice are fine as long as the interface and flow
are good. Do not build real computer vision or real speech recognition.

## 2. Ground rules

- **Git.** Almost the whole app is uncommitted and there is no remote. Do not commit, push, or
  create a remote unless the owner asks. Before your first edit, tell the owner the work is
  unprotected and ask whether they want a baseline commit first. Never include AI attribution in
  commit messages unless asked.
- **`AGENTS.md` applies.** Expo changes every SDK: read the `expo` version in `package.json` and
  check the matching docs (`https://docs.expo.dev/versions/v58.0.0/`, index at
  `https://docs.expo.dev/llms.txt`) before using any Expo or React Native API. Install packages
  with `npx expo install`, never `npm install <pkg>`.
- **Routes live in `app/`** in this repo (not `src/app/` as `AGENTS.md` says). Non-route code is
  in `src/`.
- **Expo Go only.** Do not add a library that needs a development build (custom native code)
  without asking the owner first. Say what it is for and what the fallback is.
- **Logic stays testable.** `src/engine`, `src/data` and `src/store` import nothing from React
  Native so they run under plain Node in vitest. Keep it that way: put new logic there, with
  tests, and keep screens thin.
- **Known traps** (already hit once, do not rediscover them):
  - `metro.config.js` aliases bare `three` to `three/build/three.module.js`. three's CommonJS
    entry crashes on Hermes. Do not remove the alias.
  - react-three-fiber renders **nothing** on the iOS Simulator under Expo Go SDK 58. Do not debug
    3D from simulator screenshots. Verify 3D with `npx expo start --web` or on a real device.
- **Checks before you call anything done:** `npm test`, `npm run typecheck`, and a walk through
  the changed flow on web (`npx expo start --web`, narrow the browser to phone width). UI layout
  and 3D are not unit tested, so the walk-through is the only check on them.

## 3. Design system (do not reinterpret)

Tokens are in `src/ui/theme.ts`, ported from the web app's `DESIGN.md`. `tests/theme.test.ts`
enforces the rules, so breaking them fails the suite.

- Light theme only: canvas `#FFFEFB`, ink `#111111`, hairline `#DADADA`.
- **Flat.** No shadows, no blur. Separate with hairlines and colour blocks.
- **Blue `#0058A3` is the primary action** and marks the parts a step is about.
- **Yellow `#FFDB00` never carries text.** It is a fill or marker (current step, warning block);
  text on yellow is ink.
- **Red is for one thing:** checks still open when the user presses Next (web uses `#CC0008` on a
  `#FDECEB` tint; `colors.danger` / `colors.dangerDim` here are the equivalents).
- 3D is a line drawing: white parts, ink edges, blue edges on the active part.
- Readable from 1 m, hands full: nothing important under 16 px, touch targets at least 48 px,
  one instruction at a time, every word earns its place.
- Anti-references: dashboards, card stacks, drop shadows, emoji icons.

The files in `screenshots/` are dark-themed and older than the code. Do not copy their look.
Replace them once the work is done (section 7).

## 4. Evidence: what the study and the mentors said

Paper-prototype study, 4 participants, think-aloud plus heuristic inspection. Severity is Nielsen
0 to 4.

| Finding | Severity | Committed fix |
|---|---|---|
| Restart Build icon exposed on the build screen | 4.0 | Move into a settings menu with a two-step confirm |
| Six-digit part codes meant nothing ("can you show me a picture of screw 108…?") | 3.3 | Part A/B/C labels, plus a 1:1 on-screen screw scale |
| The "check your screws" entry was tiny; people tapped Help instead, and did not know a screw row was tappable | 3.3 | A tappable parts bag from step 1 |
| After undoing step 3, people stared at the screen; the small "I'm done" button was not seen | 3.0 | Full-width action bar with an explicit "back to step 2" label |
| Home screen clutter: competing cards hid catalogue search and mid-build start (4 of 4) | 3.0 | One hero "Start build / Scan box" card taking about 60% of the screen |
| Voice: people spoke without tapping the pill; one tapped twice because nothing showed the mic was on | 2.7 | "Hey IKEA" always-on listening, with a chime and a live waveform |

Bright spot to keep: 3 of 4 found Scan immediately ("that reminds me of a barcode").

Mentor feedback, in order of weight:

1. **Undo is a state-mapping problem, not a wording problem.** The user thinks they are moving
   forward; the app is taking them backward; a "done" button sitting where "next" sits makes it
   worse. Show a **timeline of states** so "I am going back now, in order to go forward" is
   visible.
2. **80/20.** Most steps are easy and a few cause the errors. Focus friction and warnings on the
   critical steps; let the easy ones flow.
3. **Many people arrive only after a mistake.** Support starting mid-build and a "something went
   wrong" entry, not only a start-to-finish flow.
4. **Warn about problem steps up front**, the way a maps app warns about roadworks.
5. **You may change the physical product slightly**: lettered bags, orientation stickers.
6. **Script the voice** so sessions are comparable, and **simulate a wake-word failure** at a
   planned step to test the fallback.

## 5. Where the app stands today

Read from the code on 25 Nov 2026. Verify before relying on anything marked "not read".

- `app/(tabs)/index.tsx` (home): wordmark, "Continue building" cards, a 2×2 grid of four scanner
  tiles, a "Guided builds" carousel, recents. This is the clutter the study reported.
- `app/(tabs)/_layout.tsx`: tabs are Build, Scan, Catalogue, Study.
- `app/build/[id].tsx` (build mode): full-screen 3D, header with close / timer / ghost toggle,
  non-interactive step pips, a bottom sheet with title, detail text, **hardware chips showing the
  six-digit `code`**, tool chip, tip, warning, and Back / Next step buttons. Swipe changes step.
  Progress is saved per product. No checks, no undo, no voice, no parts bag.
- `src/data/types.ts`: `Step` has `title`, `detail`, `parts`, `hardware`, `tool`, `seconds`,
  `tip`, `warning`, `view`. `Hardware` has `code`, `name`, `glyph`, `lengthMm`.
- `src/data/guides.ts`: hand-authored guides for `lack-side-table`, `billy-bookcase`,
  `kallax-2x2` only. Detail text runs to two or three sentences.
- `src/data/hardware.ts`: ten fittings; codes are "representative rather than authoritative".
- `src/engine/generators.ts`: products have no model files. A `ModelSpec` (`{gen:'grid', w, d, h,
  …}`) generates parts with deterministic ids that guides reference. Tests check every guide
  references ids the generator emits and places all parts by the last step.
- `src/engine/pose.ts`: step view places earlier parts, floats the current step's parts, ghosts
  later ones. Parts slide in; there is no tip-over or rotate animation.
- `src/store/useApp.ts`: zustand, in memory only by design (Study tab has "Reset demo data").
- Not read: `app/scanner/[mode].tsx`, `app/product/[id].tsx`, `app/viewer/[id].tsx`,
  `app/(tabs)/scan.tsx`, `app/(tabs)/study.tsx`, `app/(tabs)/catalog.tsx`. In particular, find
  out where a build can be restarted or progress cleared before doing package G.

## 6. Work packages

In priority order. Each is independently shippable; finish and verify one before starting the
next. A to E are the core; F to I are next; J is a stretch.

### A. Home: one hero action

- Replace the scanner grid and guided-builds carousel with a single hero card, roughly 60% of the
  screen height: **"Start a build"**, primary button **"Scan the box"** (opens the article-number
  scanner), secondary text link "Pick from the catalogue".
- If a build is in progress, show **one** "Continue" row above the hero for the most recent build
  (name, "Step 2 of 7", progress bar). More than one in progress: a "2 more" link, not more
  cards.
- Add a clear mid-build entry: **"Already partway through?"** which lets the user pick a product
  and then pick the step their build is at (reuse the timeline from D).
- Everything removed from home must still be reachable: scanners from the Scan tab, guided builds
  from Catalogue.
- Done when: a first-time user sees one obvious thing to tap; nothing on home scrolls on a
  390 × 844 screen unless builds are in progress.

### B. Part letters instead of six-digit codes

- Add a pure helper in `src/engine` (for example `lettersFor(product)`) that assigns A, B, C… to
  the product's fittings in the order of `product.hardware`, and returns a map from hardware id to
  letter. Test it: stable order, unique, covers every fitting a guide uses.
- Show the letter as a blue round badge everywhere a fitting appears: build-screen chips, the
  product page parts list, the hardware scanner result, the parts bag (C). The six-digit `code`
  moves to secondary small text inside the parts bag detail only.
- Use the same letter in step text where a fitting is named ("Drive a screw (B) into…").
- Done when: no six-digit code is visible on the build screen.

### C. Parts bag, open from step 1, with 1:1 compare

- A large, labelled **"Parts"** button on the build screen from the first step, not a small pill.
  It opens a sheet listing this product's fittings: letter badge, glyph, short name, quantity,
  length in mm. Fittings needed in the current step are listed first and marked.
- Rows must look tappable (chevron, full-row press state). In the study people did not realise a
  screw was tappable.
- Tapping a fitting opens a **1:1 view**: the silhouette at real size, with "Hold yours against
  the screen". Offer **Compare** when the product has a look-alike of the same glyph, showing the
  two side by side at the same scale with the differing length called out.
- Real size needs calibration. Copy the web approach: the user holds a bank card (short edge
  53.98 mm) against a box and drags a slider until they match; store pixels per mm in the app
  store. Until calibrated, label the drawing "not to scale" and offer "Set actual size". Do not
  trust device DPI APIs for this.
- The study task is a 20 mm versus 25 mm screw pick. Make sure the study product has two such
  look-alike screws in its hardware list (add representative entries to `hardware.ts` if needed).
- Done when: from step 1, two taps reach a 1:1 silhouette, and two look-alike screws can be
  compared side by side.

### D. Build screen: lighter steps, critical checks, a real timeline

Mirror the web app's current behaviour.

- **Shorten every step's text** to one or two short sentences. Move extra detail into `tip`.
- Add `checks?: string[]` to `Step` ("Done when"). One or two per step, phrased as a visible
  end state ("4 screws are in, heads flush").
- **Critical steps only.** A step with a `warning` is a critical step. Keep warnings on the steps
  where a build actually goes wrong (mirrored panels, a pegged or handed part, wall anchoring) and
  remove or demote the rest to `tip`.
- **Next behaviour:**
  - Ordinary step: Next goes straight on.
  - Critical step with unticked checks: the first Next does not advance. The checks stay where
    they are and turn red (heading becomes "Check these first"), and the button label becomes
    "Next anyway". Ticking them all, or pressing again, advances. Nothing moves or jumps. No
    hidden hold-to-skip gesture.
- **Full-width bottom action bar** for the primary action, with Back as a smaller button beside
  it. The last step's button is "Finish" and leads to the existing completion screen.
- **Step pips become a timeline:** tappable, each showing its step number, with the title shown
  for the current one and on press. Critical steps carry a small yellow marker so problem steps
  are visible up front. Tapping a pip jumps to that step.
- Keep: swipe to change step, haptics, keep-awake, timer, saved progress.
- Done when: an ordinary step is one tap; a critical step cannot be passed without seeing its
  checks; the timeline can be used to jump.

### E. Undo and recovery

The highest-value piece and the one both mentors asked for.

- Add a clearly labelled **"Something's wrong"** button on the build screen (not an icon).
- It opens the timeline with the question **"Which step went wrong?"**. The user taps a step.
- The app enters **undo mode**, visibly different from build mode: a banner across the top
  ("Undoing: step 3 of 5 to take apart"), the timeline drawn with a backward arrow from the
  current step to the target, and the 3D showing the parts of the step being taken off.
- Undo steps run in reverse order, one at a time. Each says what to remove. Add an optional
  `undo?: string` to `Step`; when absent, generate "Take off: <part names>. Remove: <fittings>."
  from the step's `parts` and `hardware`.
- The action bar never says "Done" or "Next" in undo mode. It names the transition: **"Step 3
  undone, back to step 2"**.
- Warn before undoing a step that can damage the furniture (cam locks, nails, anything threaded
  into particleboard): "Back the screw out slowly; the thread strips easily."
- Undo only the steps that have to come apart. For this prototype that is every step from the
  current one back to the chosen one; say so in a code comment so a dependency graph can replace
  it later.
- When the last one is undone, leave undo mode with a banner: **"Back on track. Redo step 2."**
  and return to build mode at that step.
- Put the sequencing logic in `src/engine` (which steps to undo, in what order, the generated
  text) and test it.
- Done when: starting at step 4 and choosing step 2, a user is walked back through 4, 3, 2 with
  the direction always visible, and lands on step 2 in build mode.

### F. Voice, simulated

- Do **not** add speech recognition. The study runs voice Wizard-of-Oz.
- Replace any tap-to-talk idea with an always-on **"Hey IKEA" listening banner** on the build
  screen with four visible states: listening (calm waveform), heard (waveform active, caption of
  what was heard), acting (the command echoed: "Next step"), and **not understood** (flat line,
  "Didn't catch that. Tap Next or try again").
- Play a short chime and a haptic on wake. Check the Expo SDK 58 docs for what audio works in
  Expo Go before choosing an API; if nothing suitable is available without a development build,
  use haptic plus the visual and tell the owner.
- **Wizard panel** for the facilitator, reached by a long-press on the banner or from the Study
  tab: buttons to fire "next", "back", "repeat", "undo", "parts", and a free-text "heard" caption.
  Include a setting **"Fail the wake word at step N"** so the fallback can be tested on purpose.
- Keep the large on-screen buttons fully usable at all times; voice is never the only way.
- Done when: a facilitator can drive a whole build from the wizard panel, and a planned failure
  shows the not-understood state.

### G. Restart behind settings

- Find every place a build can be restarted or its progress cleared. Remove any such control from
  the build screen itself.
- Put "Restart this build" in a settings menu, with a two-step confirm that names the cost
  ("You are on step 4 of 7. Restarting loses your place.").
- Done when: no single tap anywhere discards progress.

### H. Scanner results lead somewhere obvious

- Read `app/scanner/[mode].tsx` first. After a successful scan the next action must be one large
  primary button ("Start building LACK"), not a list of options.
- The manual-page scanner should offer "Open step 3" directly, which is the mid-build entry in
  practice.
- The hardware scanner result should show letters (B) and open the parts bag view (C).

### I. Add HUTTEN (9-bottle wine rack) as a fourth guided product

The web app has a full guide for it; the team wants it on both builds. It is a good study
product: small, real, one screw type, and an obvious wrong build.

- Facts: IKEA manual AA-49900-4; outside size 33 × 30 × 34 cm; 8 screws, 4 wooden dowels (for
  stacking only), 1 Allen key. Only the outside size is IKEA's; part sizes were estimated from
  product photos, so label them as estimates and do not offer a trustworthy 1:1 view for its
  fittings until someone measures them.
- Structure: 4 square posts (about 2.8 cm) at the corners; each side has 2 loose rods joining its
  front and back post, near the top and bottom; 3 ready-made shelves at about 4.5, 16 and 27.5 cm,
  each being 2 rails (about 3 × 1.6 cm, running across) and 4 rods (about 1.6 cm diameter, running
  front to back). Screws go through the posts into the rail ends of the top and bottom shelves;
  the middle shelf has pre-fitted wooden pegs.
- Add a generator (for example `gen: 'rack'`) to `src/engine/generators.ts` with deterministic
  ids, and tests alongside the existing generator tests.
- Steps, with part letters A post, B loose rod, C shelf, D screw, E dowel:
  1. Build a side frame: push two rods (B) into one post (A), then a second post onto the rods.
     **Critical:** keep the row of three small holes on the same side of both posts.
  2. Build the other side frame the same way.
  3. Stand the three shelves (C) on edge and stand a frame against their ends, small holes facing
     out. **Critical:** the shelf with wooden pegs goes in the middle.
  4. Screw the frame on: a screw (D) through the top and bottom hole of each post. Start all four
     before tightening any.
  5. Tip the rack over so the screwed frame lies flat on the floor.
  6. Lower the second frame onto the shelf ends, small holes facing up.
  7. Drive the last four screws (D) down into the shelf ends.
  8. Stand it up. Three bottles lie on each shelf, between the rods.
  9. Only if stacking: push a dowel (E) into the top of each post. Never stack more than three.
- The mobile pose engine slides parts into their final position and cannot tip the rack over, so
  steps 5 and 8 are text-only here. That is acceptable; say so in the guide's comment.
- There are no recorded build times for HUTTEN. Set a baseline as a clearly labelled estimate and
  do not attribute it to a dataset.
- Reference (read only): `~/Programming/MONTERA/scripts/gen-hutten.mjs` has the geometry and all
  step text, checks and FAQ answers.

### J. Stretch: orientation marks

Mentors allowed small changes to the physical product. Draw a coloured sticker mark on the face
of a part that must point a particular way (the outward face of each HUTTEN post, the inward face
of BILLY's mirrored side panels), and refer to it in the step text ("blue dot facing out"). This
turns "facing the right way" from a sentence into something visible in the 3D view.

## 7. Wrap-up

- Update `README.md` to describe the new home, parts bag, undo flow, voice wizard and HUTTEN, and
  correct the test count.
- Replace the stale dark screenshots in `screenshots/` with new ones taken from the web target or
  a real device (not the iOS Simulator, where the 3D view is blank).
- Report back to the owner: what was built, what was verified and how, what was not verified
  (especially anything only checked on web and not on a real phone), and anything you chose not
  to do and why.

## 8. Out of scope

- Real computer vision, real speech recognition, a backend, accounts, persistence beyond what
  exists.
- Changes to the web repo (`~/Programming/MONTERA`).
- New visual identity. The look is settled; this is about flow and clarity.
- Committing or pushing without being asked.
