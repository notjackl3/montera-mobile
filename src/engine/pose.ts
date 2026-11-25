import type { Guide, Part, Product } from '@/data/types';
import { generateParts } from './generators';

/** How the viewport is presenting the product right now. */
export type ViewMode = 'assembled' | 'exploded' | 'step';

export type PartState = 'placed' | 'active' | 'pending';

export type PartPose = {
  part: Part;
  /** Where the part should animate to. */
  target: [number, number, number];
  state: PartState;
  /** 0 hides the mesh entirely. */
  opacity: number;
};

const MEMO = new Map<string, Part[]>();

/** Parts for a product, generated once and cached. */
export function partsFor(product: Product): Part[] {
  const cached = MEMO.get(product.id);
  if (cached) return cached;
  const parts = generateParts(product.model, product.finish).map((p) => ({
    ...p,
    name: product.partNames?.[p.id] ?? p.name,
  }));
  MEMO.set(product.id, parts);
  return parts;
}

export type Bounds = {
  /** Centre of the bounding box. */
  center: [number, number, number];
  size: [number, number, number];
  /** Radius of the bounding sphere, used to frame the camera. */
  radius: number;
};

/** Rotation matrix for three's default Euler order, R = Rx * Ry * Rz. */
function eulerMatrix(rx: number, ry: number, rz: number): number[][] {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  const Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]];
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  const mul = (a: number[][], b: number[][]) =>
    a.map((row, i) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
  return mul(mul(Rx, Ry), Rz);
}

/**
 * Half-extents of a part in world space, accounting for its rotation.
 *
 * A rotated part's axis-aligned footprint is `|R| · halfExtents`. Without this,
 * a drawer pull — a cylinder laid on its side — is measured as if its length
 * ran vertically, which inflates the product's bounding box and throws off both
 * camera framing and the dimension cage.
 */
export function halfExtent(p: Part): [number, number, number] {
  const local: [number, number, number] =
    p.shape.kind === 'box'
      ? [p.shape.size[0] / 2, p.shape.size[1] / 2, p.shape.size[2] / 2]
      : [p.shape.r, p.shape.h / 2, p.shape.r];

  if (!p.rotation) return local;

  const R = eulerMatrix(p.rotation[0], p.rotation[1], p.rotation[2]);
  return [0, 1, 2].map((i) =>
    R[i].reduce((sum, v, j) => sum + Math.abs(v) * local[j], 0),
  ) as [number, number, number];
}

export function boundsOf(parts: Part[]): Bounds {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of parts) {
    const [hx, hy, hz] = halfExtent(p);
    const [x, y, z] = p.position;
    minX = Math.min(minX, x - hx); maxX = Math.max(maxX, x + hx);
    minY = Math.min(minY, y - hy); maxY = Math.max(maxY, y + hy);
    minZ = Math.min(minZ, z - hz); maxZ = Math.max(maxZ, z + hz);
  }
  const size: [number, number, number] = [maxX - minX, maxY - minY, maxZ - minZ];
  const center: [number, number, number] = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  return { center, size, radius: Math.hypot(size[0], size[1], size[2]) / 2 };
}

/** Fall back to "outward from the centre" when a part has no explode hint. */
function explodeDir(part: Part, center: [number, number, number]): [number, number, number] {
  if (part.explode) return part.explode;
  const d: [number, number, number] = [
    part.position[0] - center[0],
    part.position[1] - center[1],
    part.position[2] - center[2],
  ];
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  return [d[0] / len, d[1] / len, d[2] / len];
}

function offsetBy(
  part: Part,
  center: [number, number, number],
  distance: number,
): [number, number, number] {
  const [dx, dy, dz] = explodeDir(part, center);
  const len = Math.hypot(dx, dy, dz) || 1;
  return [
    part.position[0] + (dx / len) * distance,
    part.position[1] + (dy / len) * distance,
    part.position[2] + (dz / len) * distance,
  ];
}

/** Map every part id to the step that installs it. */
export function stepIndexByPart(guide: Guide | undefined): Record<string, number> {
  const map: Record<string, number> = {};
  if (!guide) return map;
  guide.steps.forEach((s, i) => s.parts.forEach((id) => (map[id] = i)));
  return map;
}

export type PoseOptions = {
  mode: ViewMode;
  /** Current step for `step` mode. */
  step?: number;
  /** 0..1 slider for `exploded` mode. */
  spread?: number;
  /** Show not-yet-installed parts as faint ghosts instead of hiding them. */
  ghostPending?: boolean;
};

/**
 * Resolve the pose of every part for the current viewport state.
 *
 * In `step` mode, parts installed by earlier steps sit at their final pose, the
 * current step's parts float just off their destination so the animation reads
 * as them being fitted, and later parts are hidden (or ghosted).
 */
export function resolvePoses(
  product: Product,
  guide: Guide | undefined,
  opts: PoseOptions,
): PartPose[] {
  const parts = partsFor(product);
  const { center, radius } = boundsOf(parts);

  if (opts.mode === 'assembled') {
    return parts.map((part) => ({ part, target: part.position, state: 'placed' as PartState, opacity: 1 }));
  }

  if (opts.mode === 'exploded') {
    const distance = radius * 0.55 * (opts.spread ?? 1);
    return parts.map((part) => ({
      part,
      target: offsetBy(part, center, distance),
      state: 'placed' as PartState,
      opacity: 1,
    }));
  }

  const byPart = stepIndexByPart(guide);
  const step = opts.step ?? 0;
  // Parts no step mentions (e.g. simplified products) are treated as always present.
  const unowned = Object.keys(byPart).length === 0;
  const liftIn = Math.max(radius * 0.22, 8);

  return parts.map((part) => {
    const owner = byPart[part.id];
    if (unowned || owner === undefined) {
      return { part, target: part.position, state: 'placed' as PartState, opacity: 1 };
    }
    if (owner < step) {
      return { part, target: part.position, state: 'placed' as PartState, opacity: 1 };
    }
    if (owner === step) {
      return { part, target: offsetBy(part, center, liftIn), state: 'active' as PartState, opacity: 1 };
    }
    return {
      part,
      target: offsetBy(part, center, liftIn * 1.6),
      state: 'pending' as PartState,
      opacity: opts.ghostPending ? 0.09 : 0,
    };
  });
}

/** Camera distance that frames the whole product with a little breathing room. */
export const fitDistance = (radius: number, fovDeg = 40) =>
  (radius / Math.sin((fovDeg * Math.PI) / 360)) * 0.92;

/** Count of distinct physical pieces, for the parts list header. */
export const pieceCount = (product: Product) => partsFor(product).length;
