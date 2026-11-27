import type { ModelSpec, Part } from '@/data/types';
import type { FinishKey } from '@/ui/theme';

/**
 * Procedural part generation.
 *
 * Every product in the catalogue is described only by its real IKEA dimensions
 * plus a generator name; the generator turns that into the individual panels,
 * legs and shelves that come in the box. Part ids are deterministic
 * (`shelf-1`, `side-l`, `leg-3`...) so hand-authored guides in `guides.ts` can
 * reference them without any model files existing.
 */

type Ctx = { finish: FinishKey };

const box = (
  id: string,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  finish: FinishKey,
  explode?: [number, number, number],
): Part => ({ id, name, shape: { kind: 'box', size }, position, finish, explode });

const cyl = (
  id: string,
  name: string,
  r: number,
  h: number,
  position: [number, number, number],
  finish: FinishKey,
  explode?: [number, number, number],
): Part => ({ id, name, shape: { kind: 'cyl', r, h }, position, finish, explode });

/** Back panels are thin hardboard, always a shade browner than the carcass. */
const BACK: FinishKey = 'back';

function table(s: Extract<ModelSpec, { gen: 'table' }>, ctx: Ctx): Part[] {
  const { w, d, h } = s;
  const topT = s.topT ?? 5;
  const legR = s.legR ?? 2.5;
  const legH = h - topT;
  const inset = legR + 1.5;
  const parts: Part[] = [
    box('top', 'Table top', [w, topT, d], [0, h - topT / 2, 0], ctx.finish, [0, 1, 0]),
  ];
  const xs = [-(w / 2 - inset), w / 2 - inset];
  const zs = [-(d / 2 - inset), d / 2 - inset];
  let n = 1;
  for (const z of zs) {
    for (const x of xs) {
      const pos: [number, number, number] = [x, legH / 2, z];
      parts.push(
        s.round
          ? cyl(`leg-${n}`, `Leg ${n}`, legR, legH, pos, 'metal', [Math.sign(x), -0.4, Math.sign(z)])
          : box(`leg-${n}`, `Leg ${n}`, [legR * 2, legH, legR * 2], pos, ctx.finish, [
              Math.sign(x),
              -0.4,
              Math.sign(z),
            ]),
      );
      n++;
    }
  }
  return parts;
}

function shelfUnit(s: Extract<ModelSpec, { gen: 'shelfUnit' }>, ctx: Ctx): Part[] {
  const { w, d, h, shelves } = s;
  const t = s.t ?? 2;
  const plinth = s.plinth ?? 0;
  const innerW = w - t * 2;
  const parts: Part[] = [
    box('side-l', 'Left side panel', [t, h, d], [-(w - t) / 2, h / 2, 0], ctx.finish, [-1, 0, 0]),
    box('side-r', 'Right side panel', [t, h, d], [(w - t) / 2, h / 2, 0], ctx.finish, [1, 0, 0]),
    box('top', 'Top panel', [innerW, t, d], [0, h - t / 2, 0], ctx.finish, [0, 1, 0]),
    box('bottom', 'Bottom panel', [innerW, t, d], [0, plinth + t / 2, 0], ctx.finish, [0, -1, 0]),
  ];
  // Fixed shelves spread evenly through the clear interior height.
  const lo = plinth + t;
  const hi = h - t;
  for (let i = 1; i <= shelves; i++) {
    const y = lo + ((hi - lo) * i) / (shelves + 1);
    parts.push(box(`shelf-${i}`, `Shelf ${i}`, [innerW, t, d - 1], [0, y, -0.5], ctx.finish, [0, 0, 1]));
  }
  parts.push(box('back', 'Back panel', [w - 1, h - plinth - 1, 0.4], [0, plinth + (h - plinth) / 2, -d / 2 + 0.2], BACK, [0, 0, -1]));
  return parts;
}

/** KALLAX-style open grid of square compartments. */
function grid(s: Extract<ModelSpec, { gen: 'grid' }>, ctx: Ctx): Part[] {
  const { w, d, h, cols, rows } = s;
  const t = s.t ?? 3.5;
  const parts: Part[] = [
    box('side-l', 'Left side panel', [t, h, d], [-(w - t) / 2, h / 2, 0], ctx.finish, [-1, 0, 0]),
    box('side-r', 'Right side panel', [t, h, d], [(w - t) / 2, h / 2, 0], ctx.finish, [1, 0, 0]),
    box('top', 'Top panel', [w - t * 2, t, d], [0, h - t / 2, 0], ctx.finish, [0, 1, 0]),
    box('bottom', 'Bottom panel', [w - t * 2, t, d], [0, t / 2, 0], ctx.finish, [0, -1, 0]),
  ];
  const innerW = w - t * 2;
  const innerH = h - t * 2;
  // Vertical dividers run the full interior height.
  for (let c = 1; c < cols; c++) {
    const x = -innerW / 2 + (innerW * c) / cols;
    parts.push(box(`div-v-${c}`, `Vertical divider ${c}`, [t, innerH, d], [x, h / 2, 0], ctx.finish, [0, 1, 0]));
  }
  // Horizontal dividers are cut per compartment, as they are in the real box.
  const cellW = (innerW - t * (cols - 1)) / cols;
  for (let r = 1; r < rows; r++) {
    const y = t + (innerH * r) / rows;
    for (let c = 0; c < cols; c++) {
      const cx = -innerW / 2 + t * c + cellW * c + cellW / 2;
      parts.push(
        box(`div-h-${r}-${c + 1}`, `Shelf ${r}-${c + 1}`, [cellW, t, d], [cx, y, 0], ctx.finish, [0, 0, 1]),
      );
    }
  }
  return parts;
}

function cabinet(s: Extract<ModelSpec, { gen: 'cabinet' }>, ctx: Ctx): Part[] {
  const { w, d, h, doors } = s;
  const t = 1.8;
  const parts = shelfUnit({ gen: 'shelfUnit', w, d: d - 2, h, shelves: s.shelves ?? 1, t }, ctx);
  const doorW = (w - 1) / doors - 0.4;
  for (let i = 1; i <= doors; i++) {
    const x = -w / 2 + 0.5 + ((w - 1) / doors) * (i - 0.5);
    parts.push(
      box(`door-${i}`, doors > 1 ? `Door ${i}` : 'Door', [doorW, h - 2, 1.6], [x, h / 2, d / 2 - 0.8], ctx.finish, [0, 0, 1]),
    );
    parts.push(
      cyl(`handle-${i}`, `Handle ${i}`, 0.7, 10, [x + doorW / 2 - 4, h / 2, d / 2 + 0.6], 'metal', [0, 0, 1]),
    );
  }
  return parts;
}

function drawers(s: Extract<ModelSpec, { gen: 'drawers' }>, ctx: Ctx): Part[] {
  const { w, d, h, drawers: n } = s;
  const t = 1.8;
  const parts: Part[] = [
    box('side-l', 'Left side panel', [t, h, d], [-(w - t) / 2, h / 2, 0], ctx.finish, [-1, 0, 0]),
    box('side-r', 'Right side panel', [t, h, d], [(w - t) / 2, h / 2, 0], ctx.finish, [1, 0, 0]),
    box('top', 'Top panel', [w, t, d], [0, h - t / 2, 0], ctx.finish, [0, 1, 0]),
    box('bottom', 'Bottom panel', [w - t * 2, t, d], [0, t / 2, 0], ctx.finish, [0, -1, 0]),
    box('back', 'Back panel', [w - 1, h - 1, 0.4], [0, h / 2, -d / 2 + 0.2], BACK, [0, 0, -1]),
  ];
  const lo = t;
  const hi = h - t;
  const faceH = (hi - lo) / n - 0.6;
  for (let i = 1; i <= n; i++) {
    const y = lo + ((hi - lo) * (i - 0.5)) / n;
    parts.push(box(`drawer-${i}`, `Drawer ${i} front`, [w - t * 2 - 0.6, faceH, 1.6], [0, y, d / 2 - 0.8], ctx.finish, [0, 0, 1]));
    parts.push(cyl(`pull-${i}`, `Drawer ${i} handle`, 0.6, w * 0.4, [0, y, d / 2 + 0.5], 'metal', [0, 0, 1]));
  }
  return parts.map((p) =>
    p.id.startsWith('pull-') ? { ...p, rotation: [0, 0, Math.PI / 2] as [number, number, number] } : p,
  );
}

function chair(s: Extract<ModelSpec, { gen: 'chair' }>, ctx: Ctx): Part[] {
  const { w, d, h } = s;
  const seatH = Math.round(h * 0.45);
  const legT = 4;
  const seatFinish: FinishKey = s.upholstered ? 'fabric' : ctx.finish;
  const parts: Part[] = [
    box('seat', 'Seat', [w, 4, d], [0, seatH, 0], seatFinish, [0, 1, 0]),
    box('back', 'Backrest', [w, h - seatH - 4, 3], [0, seatH + (h - seatH) / 2, -d / 2 + 2], seatFinish, [0, 0, -1]),
  ];
  const xs = [-(w / 2 - legT / 2 - 1), w / 2 - legT / 2 - 1];
  const zs = [-(d / 2 - legT / 2 - 1), d / 2 - legT / 2 - 1];
  let n = 1;
  for (const z of zs) {
    for (const x of xs) {
      parts.push(
        box(`leg-${n}`, `Leg ${n}`, [legT, seatH - 2, legT], [x, (seatH - 2) / 2, z], ctx.finish, [
          Math.sign(x),
          -0.4,
          Math.sign(z),
        ]),
      );
      n++;
    }
  }
  if (s.arms) {
    for (const [side, x] of [['l', -(w / 2 + 1)], ['r', w / 2 + 1]] as const) {
      parts.push(box(`arm-${side}`, `Armrest ${side === 'l' ? 'left' : 'right'}`, [3, 3, d * 0.8], [x, seatH + 18, 0], ctx.finish, [Math.sign(x), 0, 0]));
      parts.push(box(`arm-post-${side}`, `Arm support ${side === 'l' ? 'left' : 'right'}`, [3, 18, 3], [x, seatH + 9, d * 0.3], ctx.finish, [Math.sign(x), 0, 0]));
    }
  }
  return parts;
}

function bed(s: Extract<ModelSpec, { gen: 'bed' }>, ctx: Ctx): Part[] {
  const { w, d, h } = s;
  const hb = s.headboard ?? h;
  const railH = 18;
  const railY = h * 0.42;
  const parts: Part[] = [
    box('headboard', 'Headboard', [w, hb, 4], [0, hb / 2, -d / 2 + 2], ctx.finish, [0, 0, -1]),
    box('footboard', 'Footboard', [w, h * 0.5, 4], [0, (h * 0.5) / 2, d / 2 - 2], ctx.finish, [0, 0, 1]),
    box('rail-l', 'Left side rail', [3, railH, d - 8], [-(w / 2 - 1.5), railY, 0], ctx.finish, [-1, 0, 0]),
    box('rail-r', 'Right side rail', [3, railH, d - 8], [w / 2 - 1.5, railY, 0], ctx.finish, [1, 0, 0]),
    box('midbeam', 'Centre support beam', [4, 8, d - 10], [0, railY - 8, 0], ctx.finish, [0, -1, 0]),
  ];
  const slats = 13;
  for (let i = 1; i <= slats; i++) {
    const z = -(d / 2 - 8) + ((d - 16) * (i - 1)) / (slats - 1);
    parts.push(box(`slat-${i}`, `Slat ${i}`, [w - 8, 1.4, 6], [0, railY + railH / 2 - 1, z], 'panelWhite', [0, 1, 0]));
  }
  return parts;
}

function desk(s: Extract<ModelSpec, { gen: 'desk' }>, ctx: Ctx): Part[] {
  const { w, d, h } = s;
  const parts = table({ gen: 'table', w, d, h, topT: 3, legR: 2 }, ctx);
  if (s.drawers) {
    const unitW = w * 0.3;
    const unitH = h * 0.55;
    const x = w / 2 - unitW / 2 - 3;
    parts.push(box('ped-side-l', 'Pedestal left panel', [1.6, unitH, d - 4], [x - unitW / 2, unitH / 2 + 2, 0], ctx.finish, [-1, 0, 0]));
    parts.push(box('ped-side-r', 'Pedestal right panel', [1.6, unitH, d - 4], [x + unitW / 2, unitH / 2 + 2, 0], ctx.finish, [1, 0, 0]));
    for (let i = 1; i <= s.drawers; i++) {
      const y = 4 + (unitH / s.drawers) * (i - 0.5);
      parts.push(box(`drawer-${i}`, `Drawer ${i} front`, [unitW - 2, unitH / s.drawers - 1.5, 1.6], [x, y, d / 2 - 2.8], ctx.finish, [0, 0, 1]));
    }
  }
  if (s.shelf) {
    parts.push(box('shelf-1', 'Upper shelf', [w * 0.9, 2, d * 0.45], [0, h + 28, -d * 0.2], ctx.finish, [0, 1, 0]));
    parts.push(box('shelf-post-l', 'Shelf support left', [2.5, 28, 2.5], [-(w * 0.4), h + 14, -d * 0.2], ctx.finish, [-1, 1, 0]));
    parts.push(box('shelf-post-r', 'Shelf support right', [2.5, 28, 2.5], [w * 0.4, h + 14, -d * 0.2], ctx.finish, [1, 1, 0]));
  }
  return parts;
}

function wallShelf(s: Extract<ModelSpec, { gen: 'wallShelf' }>, ctx: Ctx): Part[] {
  const { w, d, h, shelves } = s;
  const t = 2;
  const parts: Part[] = [
    box('side-l', 'Left upright', [t, h, d], [-(w - t) / 2, h / 2, 0], ctx.finish, [-1, 0, 0]),
    box('side-r', 'Right upright', [t, h, d], [(w - t) / 2, h / 2, 0], ctx.finish, [1, 0, 0]),
  ];
  for (let i = 1; i <= shelves; i++) {
    const y = (h * i) / (shelves + 1);
    parts.push(box(`shelf-${i}`, `Shelf ${i}`, [w - t * 2, t, d], [0, y, 0], ctx.finish, [0, 0, 1]));
  }
  parts.push(box('bracket-l', 'Wall bracket left', [4, 4, 2], [-(w / 2 - 6), h - 4, -d / 2 - 1], 'metal', [0, 0, -1]));
  parts.push(box('bracket-r', 'Wall bracket right', [4, 4, 2], [w / 2 - 6, h - 4, -d / 2 - 1], 'metal', [0, 0, -1]));
  return parts;
}

function stool(s: Extract<ModelSpec, { gen: 'stool' }>, ctx: Ctx): Part[] {
  const { w, d, h } = s;
  const parts: Part[] = [cyl('seat', 'Seat', w / 2, 3.5, [0, h - 1.75, 0], ctx.finish, [0, 1, 0])];
  let n = 1;
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    parts.push(
      cyl(`leg-${n}`, `Leg ${n}`, 1.8, h - 3.5, [x * (w / 2 - 4), (h - 3.5) / 2, z * (d / 2 - 4)], ctx.finish, [x, -0.4, z]),
    );
    n++;
  }
  parts.push(cyl('ring', 'Foot ring', 1.2, w - 10, [0, h * 0.3, 0], 'metal', [0, -1, 0]));
  return parts.map((p) =>
    p.id === 'ring' ? { ...p, rotation: [0, 0, Math.PI / 2] as [number, number, number] } : p,
  );
}

/**
 * HUTTEN-style wine rack, after IKEA manual AA-49900-4 and the web app's
 * `scripts/gen-hutten.mjs`. Only the outside size is IKEA's; the post, rail and
 * rod sections are estimates from product photos.
 *
 * Four square posts stand at the corners. Each side frame is its front and back
 * post joined by two loose rods (near the top and bottom). Each ready-made
 * shelf is two rails running across, flush with the posts' outer faces, and
 * four rods running front to back between them.
 *
 * Ids: `post-rf` `post-rb` `post-lf` `post-lb`, `siderod-r1..2` `siderod-l1..2`,
 * `shelf<n>-front` `shelf<n>-back` `shelf<n>-rod1..4` (n counts from the floor).
 */
function rack(s: Extract<ModelSpec, { gen: 'rack' }>, ctx: Ctx): Part[] {
  const { w, d, h, levels } = s;
  const post = s.post ?? 2.8;
  const rail = { h: 3, t: 1.6 };
  const rodR = 0.8;
  const postX = w / 2 - post / 2;
  const postZ = d / 2 - post / 2;
  const railZ = d / 2 - rail.t / 2;
  const railLen = w - 2 * post;
  const shelfRodLen = 2 * railZ - rail.t;
  const sideRodLen = d - 2 * post;
  const rodXs = [-0.43, -0.146, 0.146, 0.43].map((f) => f * railLen);
  const sideRodYs = [2.5, h - 2.5];
  // Cylinders run along their local y; this lays one front to back.
  const alongZ: [number, number, number] = [Math.PI / 2, 0, 0];

  const parts: Part[] = [];
  for (const [side, sx] of [['r', 1], ['l', -1]] as const) {
    const x = sx * postX;
    const label = side === 'r' ? 'right' : 'left';
    parts.push(box(`post-${side}f`, `Post, ${label} front`, [post, h, post], [x, h / 2, postZ], ctx.finish, [sx, 0, 0.3]));
    parts.push(box(`post-${side}b`, `Post, ${label} back`, [post, h, post], [x, h / 2, -postZ], ctx.finish, [sx, 0, -0.3]));
    sideRodYs.forEach((y, i) =>
      parts.push({
        ...cyl(`siderod-${side}${i + 1}`, `Loose rod ${i + 1}`, rodR, sideRodLen, [x, y, 0], ctx.finish, [sx, 0, 0]),
        rotation: alongZ,
      }),
    );
  }
  levels.forEach((y, i) => {
    const n = i + 1;
    parts.push(box(`shelf${n}-front`, `Shelf ${n} front rail`, [railLen, rail.h, rail.t], [0, y, railZ], ctx.finish, [0, 0.2, 1]));
    parts.push(box(`shelf${n}-back`, `Shelf ${n} back rail`, [railLen, rail.h, rail.t], [0, y, -railZ], ctx.finish, [0, 0.2, -1]));
    rodXs.forEach((x, j) =>
      parts.push({
        ...cyl(`shelf${n}-rod${j + 1}`, `Shelf ${n} rod ${j + 1}`, rodR, shelfRodLen, [x, y, 0], ctx.finish, [0, 1, 0]),
        rotation: alongZ,
      }),
    );
  });
  return parts;
}

/** Resolve a product's `ModelSpec` into the concrete pieces in its box. */
export function generateParts(model: ModelSpec, finish: FinishKey): Part[] {
  const ctx: Ctx = { finish };
  switch (model.gen) {
    case 'table':
      return table(model, ctx);
    case 'shelfUnit':
      return shelfUnit(model, ctx);
    case 'grid':
      return grid(model, ctx);
    case 'cabinet':
      return cabinet(model, ctx);
    case 'drawers':
      return drawers(model, ctx);
    case 'chair':
      return chair(model, ctx);
    case 'bed':
      return bed(model, ctx);
    case 'desk':
      return desk(model, ctx);
    case 'wallShelf':
      return wallShelf(model, ctx);
    case 'stool':
      return stool(model, ctx);
    case 'rack':
      return rack(model, ctx);
  }
}
