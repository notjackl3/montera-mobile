import { hw } from './hardware';
import type { Guide, Step } from './types';

/**
 * Hand-authored step guides for the `full` tier.
 *
 * Part ids line up with what `generateParts` emits for each product's
 * `ModelSpec`, and step order is also the build order — the pose engine reveals
 * parts in exactly this sequence. `seconds` are per-step baselines taken from
 * the timing datasets MONTERA cites.
 */

const DEG = Math.PI / 180;

/*
 * Writing rules (from the paper-prototype study and DESIGN.md):
 * - `detail` is one or two short sentences. Anything else goes in `tip`.
 * - Name a fitting by its letter token, `{hw:<id>}`, never by its code.
 * - Only steps where builds really go wrong carry a `warning`; that makes them
 *   critical (Next holds once on unticked checks, yellow marker on the
 *   timeline). Everything else flows.
 * - `checks` describe a visible end state ("4 screws are in, heads flush").
 */

const lack: Step[] = [
  {
    id: 'lack-1',
    title: 'Lay the top face down',
    detail: 'Put the top on the flat carton, drilled holes facing up.',
    parts: ['top'],
    hardware: [],
    seconds: 35,
    tip: 'The carton stops the finish getting scratched.',
    checks: ['The four holes face up'],
    view: [35 * DEG, 68 * DEG],
  },
  {
    id: 'lack-2',
    title: 'Screw in two legs',
    detail: 'Put a screw {hw:screw50} in each leg, then turn the leg into a corner hole by hand.',
    parts: ['leg-1', 'leg-2'],
    hardware: [hw('screw50', 2)],
    seconds: 95,
    tip: 'Hand-tight is enough. Forcing it strips the particleboard.',
    checks: ['Both legs are tight and straight'],
    undo: 'Unscrew the two legs: turn each one anticlockwise by hand.',
    view: [-30 * DEG, 72 * DEG],
  },
  {
    id: 'lack-3',
    title: 'Screw in the other two legs',
    detail: 'Same again on the two empty corners.',
    parts: ['leg-3', 'leg-4'],
    hardware: [hw('screw50', 2)],
    seconds: 85,
    checks: ['All four legs are tight'],
    undo: 'Unscrew these two legs: turn each one anticlockwise by hand.',
    view: [150 * DEG, 72 * DEG],
  },
  {
    id: 'lack-4',
    title: 'Stand it up',
    detail: 'Turn the table over and press each corner. If it rocks, back one leg off a quarter turn.',
    parts: [],
    hardware: [],
    seconds: 45,
    tip: 'A wobble is almost always one leg not fully in, not the floor.',
    checks: ['It does not rock'],
    view: [25 * DEG, 78 * DEG],
  },
];

const billy: Step[] = [
  {
    id: 'billy-1',
    title: 'Sort the panels and the bag',
    detail: 'Lay out every panel. Tap Parts to check the fittings bag.',
    parts: [],
    hardware: [],
    seconds: 185,
    tip: 'Keep the fittings in the bag lid. Cam locks roll a long way.',
    checks: ['Nothing is missing from the bag'],
    view: [25 * DEG, 70 * DEG],
  },
  {
    id: 'billy-2',
    title: 'Prepare both side panels',
    detail: 'Push dowels {hw:dowel} into the small holes. Screw cam studs {hw:camstud} into the threaded ones.',
    parts: ['side-l', 'side-r'],
    hardware: [hw('dowel', 8), hw('camstud', 8)],
    tool: 'Screwdriver',
    seconds: 255,
    warning: 'The side panels are mirrored. The blue dot and the shelf-pin holes face in.',
    checks: ['Blue dots face each other', '8 dowels and 8 studs are in'],
    view: [20 * DEG, 74 * DEG],
  },
  {
    id: 'billy-3',
    title: 'Attach the top panel',
    detail: 'Seat the top on the dowels. Lock it with cam locks {hw:camlock}, a half turn clockwise.',
    parts: ['top'],
    hardware: [hw('camlock', 4)],
    tool: 'Screwdriver',
    seconds: 175,
    tip: 'The arrow on the cam lock points at the stud it grabs.',
    checks: ['4 cam locks are turned, no gap at the joint'],
    view: [35 * DEG, 55 * DEG],
  },
  {
    id: 'billy-4',
    title: 'Attach the bottom panel',
    detail: 'Same at the other end, with cam locks {hw:camlock}.',
    parts: ['bottom'],
    hardware: [hw('camlock', 4)],
    tool: 'Screwdriver',
    seconds: 170,
    checks: ['The frame is a rectangle that holds its shape'],
    view: [35 * DEG, 85 * DEG],
  },
  {
    id: 'billy-5',
    title: 'Fit the shelves',
    detail: 'Push in shelf pins {hw:shelfpin}, two per side, and rest each shelf on them.',
    parts: ['shelf-1', 'shelf-2', 'shelf-3', 'shelf-4'],
    hardware: [hw('shelfpin', 16)],
    seconds: 300,
    tip: 'Leave the tallest gap at the bottom, for the heavy books.',
    checks: ['Every shelf sits flat on four pins'],
    view: [15 * DEG, 72 * DEG],
  },
  {
    id: 'billy-6',
    title: 'Nail on the back panel',
    detail: 'Nail the back on with nails {hw:nail}, from the middle of each edge outward.',
    parts: ['back'],
    hardware: [hw('nail', 24)],
    tool: 'Hammer',
    seconds: 430,
    tip: 'Measure both diagonals first. Once nailed, the shape is fixed.',
    checks: ['Both diagonals match', 'The back is flat, with no bulge'],
    undo: 'Lever the nails out from the front edge, one corner at a time, and lift the back off.',
    view: [175 * DEG, 72 * DEG],
  },
  {
    id: 'billy-7',
    title: 'Fix it to the wall',
    detail: 'Stand it up. Screw the bracket {hw:bracket} to the top with the short screws {hw:screw20}, then to the wall {hw:screw25}.',
    parts: [],
    hardware: [hw('bracket', 1), hw('screw20', 2), hw('screw25', 2)],
    tool: 'Screwdriver',
    seconds: 240,
    warning: 'Short screws {hw:screw20} into the bookcase. A longer one comes out through the top.',
    checks: ['The bracket is in the top with the 20 mm screws', 'It does not tip when pulled'],
    view: [25 * DEG, 80 * DEG],
  },
];

const kallax: Step[] = [
  {
    id: 'kallax-1',
    title: 'Lay out the panels',
    detail: 'Lay the panels on carpet or the carton.',
    parts: [],
    hardware: [],
    seconds: 95,
    tip: 'Two long sides, a top and bottom, one tall divider and two short shelves.',
    checks: ['All seven panels are out'],
    view: [25 * DEG, 70 * DEG],
  },
  {
    id: 'kallax-2',
    title: 'Prepare the left side',
    detail: 'Dowels {hw:dowel} in the plain holes, cam studs {hw:camstud} in the threaded ones.',
    parts: ['side-l'],
    hardware: [hw('dowel', 4), hw('camstud', 4)],
    tool: 'Screwdriver',
    seconds: 145,
    tip: 'Lay it finished face down. The raw edges point to the back.',
    checks: ['4 dowels and 4 studs are in'],
    view: [-35 * DEG, 70 * DEG],
  },
  {
    id: 'kallax-3',
    title: 'Add the top and bottom',
    detail: 'Stand both on the dowels and turn their cam locks {hw:camlock}.',
    parts: ['top', 'bottom'],
    hardware: [hw('camlock', 4)],
    tool: 'Screwdriver',
    seconds: 180,
    checks: ['It is a U shape with no gaps'],
    view: [40 * DEG, 62 * DEG],
  },
  {
    id: 'kallax-4',
    title: 'Fit the tall divider',
    detail: 'Drop the divider into the middle and lock it top and bottom {hw:camlock}.',
    parts: ['div-v-1'],
    hardware: [hw('dowel', 2), hw('camlock', 2)],
    tool: 'Screwdriver',
    seconds: 140,
    checks: ['The divider stands straight'],
    view: [20 * DEG, 68 * DEG],
  },
  {
    id: 'kallax-5',
    title: 'Fit the two short shelves',
    detail: 'One per column, half way up, locked with cam locks {hw:camlock}.',
    parts: ['div-h-1-1', 'div-h-1-2'],
    hardware: [hw('dowel', 2), hw('camlock', 2)],
    tool: 'Screwdriver',
    seconds: 160,
    tip: 'Both shelves are the same length. If one will not fit, the divider is the wrong way round.',
    checks: ['Both shelves are level'],
    view: [15 * DEG, 72 * DEG],
  },
  {
    id: 'kallax-6',
    title: 'Close it with the right side',
    detail: 'Lower the right side onto every dowel, then turn each cam lock {hw:camlock}.',
    parts: ['side-r'],
    hardware: [hw('camlock', 4)],
    tool: 'Screwdriver',
    seconds: 190,
    tip: 'Seat all the dowels before tightening anything, or a shelf end cracks.',
    checks: ['No gap along the right side'],
    view: [55 * DEG, 65 * DEG],
  },
  {
    id: 'kallax-7',
    title: 'Fix it to the wall',
    detail: 'Screw the bracket {hw:bracket} to the unit and to the wall {hw:screw35}.',
    parts: [],
    hardware: [hw('bracket', 1), hw('screw35', 4)],
    tool: 'Screwdriver',
    seconds: 135,
    warning: 'A loaded KALLAX can tip onto a child. The bracket is not optional.',
    checks: ['The bracket is screwed into the wall', 'It does not tip when pulled'],
    view: [25 * DEG, 78 * DEG],
  },
];

/**
 * HUTTEN, after IKEA manual AA-49900-4 and the web app's `gen-hutten.mjs`.
 * Letters: A post, B loose rod, C shelf, D screw, E dowel.
 *
 * The real build tips the rack over twice (steps 5 and 8). The mobile pose
 * engine only slides parts to where they end up in the finished rack and cannot
 * turn the body, so those two steps are text only, and frame B appears in place
 * in step 2. Step seconds are an estimate: there are no recorded HUTTEN times.
 */
const hutten: Step[] = [
  {
    id: 'hutten-1',
    title: 'Build a side frame',
    detail: 'Push two rods (B) into one post (A). Push a second post onto the rods.',
    parts: ['post-rf', 'post-rb', 'siderod-r1', 'siderod-r2'],
    hardware: [],
    seconds: 90,
    warning: 'Keep the row of three small holes, and the blue dot, on the same side of both posts.',
    checks: ['Rods are pushed fully into both posts', 'Both blue dots face the same way'],
    tip: 'If a rod is stiff, press the post down onto it against the floor. Do not hammer it.',
    undo: 'Pull the second post (A) off the rods, then twist the rods (B) out.',
    view: [60 * DEG, 66 * DEG],
  },
  {
    id: 'hutten-2',
    title: 'Build the other side frame',
    detail: 'Build a second frame the same way.',
    parts: ['post-lf', 'post-lb', 'siderod-l1', 'siderod-l2'],
    hardware: [],
    seconds: 75,
    checks: ['You have two matching frames'],
    undo: 'Pull the second frame apart: posts (A) off, rods (B) out.',
    view: [-55 * DEG, 66 * DEG],
  },
  {
    id: 'hutten-3',
    title: 'Stand the shelves, add a frame',
    detail: 'Stand the three shelves (C) on edge. Stand a frame against their ends, blue dots facing out.',
    parts: [1, 2, 3].flatMap((n) => [
      `shelf${n}-front`,
      `shelf${n}-back`,
      ...[1, 2, 3, 4].map((r) => `shelf${n}-rod${r}`),
    ]),
    hardware: [],
    seconds: 80,
    warning: 'The shelf with wooden pegs goes in the middle.',
    checks: ['The pegged shelf is in the middle', 'Its pegs are in the frame’s middle holes'],
    undo: 'Pull the frame off the shelf ends and lay the three shelves (C) flat.',
    view: [35 * DEG, 62 * DEG],
  },
  {
    id: 'hutten-4',
    title: 'Screw the frame on',
    detail: 'Drive a screw {hw:hutScrew} through the top and bottom hole of each post. Start all four before tightening any.',
    parts: [],
    hardware: [hw('hutScrew', 4)],
    tool: 'Allen key',
    seconds: 120,
    tip: 'Stop when the head is flush. It is solid wood and can split.',
    checks: ['4 screws are in, heads flush'],
    undo: 'Back the four screws {hw:hutScrew} out of this frame.',
    view: [70 * DEG, 70 * DEG],
  },
  {
    id: 'hutten-5',
    title: 'Tip it onto the frame',
    detail: 'Tip the rack over so the screwed frame lies flat on the floor.',
    parts: [],
    hardware: [],
    seconds: 30,
    tip: 'Hold it by the screwed frame. The other shelf ends are still loose.',
    checks: ['The screwed frame is flat on the floor'],
    undo: 'Stand the rack back on its shelf edges.',
    view: [35 * DEG, 62 * DEG],
  },
  {
    id: 'hutten-6',
    title: 'Add the second frame',
    detail: 'Lower the second frame onto the shelf ends, blue dots facing up.',
    parts: [],
    hardware: [],
    seconds: 60,
    checks: ['The pegs are in the middle holes'],
    undo: 'Lift the second frame off the shelf ends.',
    view: [-50 * DEG, 50 * DEG],
  },
  {
    id: 'hutten-7',
    title: 'Screw it on',
    detail: 'Drive the last four screws {hw:hutScrew} down into the shelf ends.',
    parts: [],
    hardware: [hw('hutScrew', 4)],
    tool: 'Allen key',
    seconds: 110,
    checks: ['All 8 screws are in, heads flush'],
    undo: 'Back the four screws {hw:hutScrew} out of the second frame.',
    view: [-65 * DEG, 60 * DEG],
  },
  {
    id: 'hutten-8',
    title: 'Stand it up',
    detail: 'Stand the rack on its four posts. Three bottles lie on each shelf, between the rods.',
    parts: [],
    hardware: [],
    seconds: 30,
    tip: 'If it rocks, loosen the screws a little, press it flat on the floor and tighten again.',
    checks: ['It stands without rocking'],
    undo: 'Lay the rack back down on the first frame.',
    view: [35 * DEG, 70 * DEG],
  },
  {
    id: 'hutten-9',
    title: 'Stacking? Add the dowels',
    detail: 'Only if stacking: push a dowel {hw:hutDowel} into the top of each post. Never stack more than three.',
    parts: [],
    hardware: [hw('hutDowel', 4)],
    seconds: 40,
    tip: 'A single rack does not need the dowels.',
    undo: 'Pull the dowels {hw:hutDowel} out of the posts.',
    view: [35 * DEG, 55 * DEG],
  },
];

export const GUIDES: Record<string, Guide> = {
  'lack-side-table': { productId: 'lack-side-table', steps: lack },
  'billy-bookcase': { productId: 'billy-bookcase', steps: billy },
  'kallax-2x2': { productId: 'kallax-2x2', steps: kallax },
  'hutten-wine-rack': { productId: 'hutten-wine-rack', steps: hutten },
};

export const getGuide = (productId?: string | null): Guide | undefined =>
  productId ? GUIDES[productId] : undefined;

/** Sum of the per-step baselines, in seconds. */
export const guideSeconds = (g: Guide) => g.steps.reduce((n, s) => n + s.seconds, 0);
