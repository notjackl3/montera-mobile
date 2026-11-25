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

const lack: Step[] = [
  {
    id: 'lack-1',
    title: 'Lay the table top face down',
    detail:
      'Put the top on the flat-pack carton so you do not scuff the finish. The four pre-drilled holes face up.',
    parts: ['top'],
    hardware: [],
    seconds: 35,
    tip: 'The good face is the one without the drilled holes.',
    view: [35 * DEG, 68 * DEG],
  },
  {
    id: 'lack-2',
    title: 'Screw in the first two legs',
    detail:
      'Each leg has a threaded insert. Turn the leg itself, not a tool — it threads straight into the top by hand.',
    parts: ['leg-1', 'leg-2'],
    hardware: [hw('screw50', 2)],
    seconds: 95,
    tip: 'Hand-tight is correct. Over-tightening strips the particleboard.',
    view: [-30 * DEG, 72 * DEG],
  },
  {
    id: 'lack-3',
    title: 'Screw in the remaining two legs',
    detail: 'Same again on the opposite corners. Keep the top flat on the floor while you work.',
    parts: ['leg-3', 'leg-4'],
    hardware: [hw('screw50', 2)],
    seconds: 85,
    view: [150 * DEG, 72 * DEG],
  },
  {
    id: 'lack-4',
    title: 'Turn it upright and check for wobble',
    detail:
      'Stand the table on a flat floor and press each corner. If one leg is proud, back it off a quarter turn.',
    parts: [],
    hardware: [],
    seconds: 45,
    tip: 'A wobble is almost always one leg not fully seated, not an uneven floor.',
    view: [25 * DEG, 78 * DEG],
  },
];

const billy: Step[] = [
  {
    id: 'billy-1',
    title: 'Sort the panels and the fittings bag',
    detail:
      'Lay the two tall side panels, the top, the bottom, four shelves and the rolled back panel out on the floor. Count the fittings against the parts list before you start.',
    parts: [],
    hardware: [],
    seconds: 185,
    tip: 'Keep the fittings in the bag lid — cam locks roll a surprising distance.',
    view: [25 * DEG, 70 * DEG],
  },
  {
    id: 'billy-2',
    title: 'Fit dowels and cam studs to the side panels',
    detail:
      'Push a wood dowel into each small hole and screw a cam stud into each larger threaded hole. Both side panels get the same treatment, mirrored.',
    parts: ['side-l', 'side-r'],
    hardware: [hw('dowel', 8), hw('camstud', 8)],
    tool: 'Screwdriver',
    seconds: 255,
    warning: 'The panels are mirrored, not identical. The pre-drilled shelf-pin holes face inward.',
    view: [20 * DEG, 74 * DEG],
  },
  {
    id: 'billy-3',
    title: 'Attach the top panel',
    detail:
      'Seat the top onto the dowels of both side panels, then drop a cam lock into each round recess and turn it a half turn clockwise to bite.',
    parts: ['top'],
    hardware: [hw('camlock', 4)],
    tool: 'Screwdriver',
    seconds: 175,
    tip: 'The arrow stamped on the cam lock points at the stud it grabs.',
    view: [35 * DEG, 55 * DEG],
  },
  {
    id: 'billy-4',
    title: 'Attach the bottom panel',
    detail: 'Same method at the other end. The carcass is now a rectangle and will hold its shape.',
    parts: ['bottom'],
    hardware: [hw('camlock', 4)],
    tool: 'Screwdriver',
    seconds: 170,
    view: [35 * DEG, 85 * DEG],
  },
  {
    id: 'billy-5',
    title: 'Insert the shelf pins and fit the shelves',
    detail:
      'Push two pins per side at each height you want, then rest the shelves on them. They are not fixed, so you can move them later.',
    parts: ['shelf-1', 'shelf-2', 'shelf-3', 'shelf-4'],
    hardware: [hw('shelfpin', 16)],
    seconds: 300,
    tip: 'Leave the tallest gap at the bottom — that is where the heavy books end up.',
    view: [15 * DEG, 72 * DEG],
  },
  {
    id: 'billy-6',
    title: 'Nail on the back panel',
    detail:
      'Square the carcass first, then nail the hardboard on from the centre of each edge outward. The back panel is what stops the bookcase racking.',
    parts: ['back'],
    hardware: [hw('nail', 24)],
    tool: 'Hammer',
    seconds: 430,
    warning: 'Check the diagonals match before the first nail. Once nailed, the shape is locked in.',
    view: [175 * DEG, 72 * DEG],
  },
  {
    id: 'billy-7',
    title: 'Stand it up and secure it to the wall',
    detail:
      'Walk the bookcase upright against the wall, then fix the supplied bracket from the top panel into a stud or a suitable wall plug.',
    parts: [],
    hardware: [hw('bracket', 1), hw('screw35', 2)],
    tool: 'Screwdriver',
    seconds: 240,
    warning: 'This is a tip-over risk if skipped. The bracket is not optional.',
    view: [25 * DEG, 80 * DEG],
  },
];

const kallax: Step[] = [
  {
    id: 'kallax-1',
    title: 'Lay out the panels',
    detail:
      'Two long side panels, a top and bottom, one tall vertical divider and two short shelves. Work on carpet or the carton — the veneer marks easily.',
    parts: [],
    hardware: [],
    seconds: 95,
    view: [25 * DEG, 70 * DEG],
  },
  {
    id: 'kallax-2',
    title: 'Fit dowels and cam studs to the left side panel',
    detail:
      'Dowels in the plain holes, cam studs screwed into the threaded ones. Start with the left panel lying flat, finished face down.',
    parts: ['side-l'],
    hardware: [hw('dowel', 4), hw('camstud', 4)],
    tool: 'Screwdriver',
    seconds: 145,
    tip: 'All of the unfinished edges should end up pointing into the room you cannot see.',
    view: [-35 * DEG, 70 * DEG],
  },
  {
    id: 'kallax-3',
    title: 'Attach the top and bottom panels',
    detail:
      'Stand both onto the left panel’s dowels and lock them with cam locks. You now have a wide U shape.',
    parts: ['top', 'bottom'],
    hardware: [hw('camlock', 4)],
    tool: 'Screwdriver',
    seconds: 180,
    view: [40 * DEG, 62 * DEG],
  },
  {
    id: 'kallax-4',
    title: 'Fit the vertical divider',
    detail: 'The full-height divider drops into the centre and locks top and bottom.',
    parts: ['div-v-1'],
    hardware: [hw('dowel', 2), hw('camlock', 2)],
    tool: 'Screwdriver',
    seconds: 140,
    view: [20 * DEG, 68 * DEG],
  },
  {
    id: 'kallax-5',
    title: 'Fit the two horizontal shelves',
    detail:
      'One shelf per column, half way up. They are the same length as each other — if one does not fit, it is the divider that is the wrong way round.',
    parts: ['div-h-1-1', 'div-h-1-2'],
    hardware: [hw('dowel', 2), hw('camlock', 2)],
    tool: 'Screwdriver',
    seconds: 160,
    view: [15 * DEG, 72 * DEG],
  },
  {
    id: 'kallax-6',
    title: 'Close it with the right side panel',
    detail:
      'Lower the right panel onto every protruding dowel at once, then work around turning each cam lock a half turn.',
    parts: ['side-r'],
    hardware: [hw('camlock', 4)],
    tool: 'Screwdriver',
    seconds: 190,
    warning: 'Seat all dowels before tightening anything, or you will crack a shelf end.',
    view: [55 * DEG, 65 * DEG],
  },
  {
    id: 'kallax-7',
    title: 'Secure it to the wall',
    detail:
      'Whether you stand it up or lay it on its side, fix the bracket to the wall. A loaded KALLAX is heavy.',
    parts: [],
    hardware: [hw('bracket', 1), hw('screw35', 4)],
    tool: 'Screwdriver',
    seconds: 135,
    warning: 'Required for any unit a child could climb.',
    view: [25 * DEG, 78 * DEG],
  },
];

export const GUIDES: Record<string, Guide> = {
  'lack-side-table': { productId: 'lack-side-table', steps: lack },
  'billy-bookcase': { productId: 'billy-bookcase', steps: billy },
  'kallax-2x2': { productId: 'kallax-2x2', steps: kallax },
};

export const getGuide = (productId?: string | null): Guide | undefined =>
  productId ? GUIDES[productId] : undefined;

/** Sum of the per-step baselines, in seconds. */
export const guideSeconds = (g: Guide) => g.steps.reduce((n, s) => n + s.seconds, 0);
