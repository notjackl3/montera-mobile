import type { OrientationMark, Part } from '@/data/types';

/**
 * Orientation stickers: a coloured dot on the face of a part that must point a
 * particular way ("blue dot facing out"). Turns "facing the right way" from a
 * sentence into something visible in the 3D view.
 */

const AXIS = { x: 0, y: 1, z: 2 } as const;

export type MarkPose = {
  /** Centre of the dot in the part's own frame, just proud of the face. */
  offset: [number, number, number];
  /** Euler rotation that turns a y-up disc to face along the normal. */
  rotation: [number, number, number];
  radius: number;
};

/** Half-extents in the part's own (unrotated) frame. */
function localHalf(p: Part): [number, number, number] {
  return p.shape.kind === 'box'
    ? [p.shape.size[0] / 2, p.shape.size[1] / 2, p.shape.size[2] / 2]
    : [p.shape.r, p.shape.h / 2, p.shape.r];
}

export function markPose(part: Part, mark: OrientationMark): MarkPose {
  const half = localHalf(part);
  const sign = mark.face[0] === '-' ? -1 : 1;
  const axis = AXIS[mark.face[1] as 'x' | 'y' | 'z'];
  const others = [0, 1, 2].filter((i) => i !== axis);
  const [u, v] = mark.at ?? [0, 0];

  const offset: [number, number, number] = [0, 0, 0];
  offset[axis] = sign * (half[axis] + 0.08);
  offset[others[0]] = u * half[others[0]] * 0.8;
  offset[others[1]] = v * half[others[1]] * 0.8;

  // A cylinder's axis is local y; tip it onto the face normal.
  const rotation: [number, number, number] =
    axis === 0 ? [0, 0, Math.PI / 2] : axis === 2 ? [Math.PI / 2, 0, 0] : [0, 0, 0];

  const faceMin = Math.min(half[others[0]], half[others[1]]) * 2;
  const radius = Math.min(2.5, Math.max(0.6, faceMin * 0.32));
  return { offset, rotation, radius };
}
