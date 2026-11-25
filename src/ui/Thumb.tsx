import Svg, { G, Path, Polygon } from 'react-native-svg';

import type { Part, Product } from '@/data/types';
import { halfExtent, partsFor } from '@/engine/pose';
import { colors } from './theme';

/**
 * Isometric product thumbnail.
 *
 * Rather than spinning up a GL context per list row, this projects the same
 * generated parts the 3D viewport uses through a fixed isometric camera and
 * paints them as SVG polygons, far to near. Every product in the catalogue gets
 * a real preview of its actual geometry for essentially no cost.
 */

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

const project = (x: number, y: number, z: number) => ({
  x: (x - z) * COS30,
  y: (x + z) * SIN30 - y,
});

/** Shift a hex colour toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) =>
    Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount))
      .toString(16)
      .padStart(2, '0');
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

type Quad = { pts: string; fill: string; depth: number };

/**
 * Face shading for the manual line-drawing look: near-white throughout, with
 * just enough separation between the top, front and side planes to read as a
 * solid. The ink outline does the real work.
 */
const FACE = { top: 0.0, front: -0.04, side: -0.11 };

function facesFor(part: Part): Quad[] {
  // Cylinders are approximated by their bounding box; at thumbnail scale a
  // table leg reads identically either way. Rotation is folded into the extent
  // so a sideways drawer pull draws horizontally rather than standing upright.
  const [cx, cy, cz] = part.position;
  const [hx, hy, hz] = halfExtent(part);

  const v = (dx: number, dy: number, dz: number) => project(cx + dx * hx, cy + dy * hy, cz + dz * hz);
  const poly = (...pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  const base = colors.mat[part.finish];
  const depth = cx + cy + cz;

  return [
    // Top (+Y)
    { pts: poly(v(-1, 1, -1), v(1, 1, -1), v(1, 1, 1), v(-1, 1, 1)), fill: shade(base, FACE.top), depth },
    // Right (+X)
    { pts: poly(v(1, 1, -1), v(1, 1, 1), v(1, -1, 1), v(1, -1, -1)), fill: shade(base, FACE.side), depth },
    // Front (+Z)
    { pts: poly(v(-1, 1, 1), v(1, 1, 1), v(1, -1, 1), v(-1, -1, 1)), fill: shade(base, FACE.front), depth },
  ];
}

export function Thumb({ product, size = 72 }: { product: Product; size?: number }) {
  const parts = partsFor(product);

  // Painter's algorithm: along the (1,1,1) view axis, larger sums are nearer.
  const quads = parts
    .slice()
    .sort((a, b) => a.position[0] + a.position[1] + a.position[2] - (b.position[0] + b.position[1] + b.position[2]))
    .flatMap(facesFor);

  // Fit the projected drawing into the viewBox.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const q of quads) {
    for (const pair of q.pts.split(' ')) {
      const [px, py] = pair.split(',').map(Number);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
  }
  const pad = Math.max(maxX - minX, maxY - minY) * 0.06;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;

  return (
    <Svg width={size} height={size} viewBox={vb}>
      <G>
        {quads.map((q, i) => (
          <Polygon key={i} points={q.pts} fill={q.fill} stroke={colors.ink} strokeWidth={0.6} strokeLinejoin="round" />
        ))}
      </G>
    </Svg>
  );
}

/** Tiny line drawings for the fittings bag. */
export function HardwareGlyph({
  glyph,
  size = 26,
  color = colors.ink,
}: {
  glyph: string;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, string> = {
    // Threaded shaft with a flat head and a cross slot.
    screw: 'M4 5 h10 M9 5 v14 M6.5 8 h5 M6.5 11 h5 M6.5 14 h5 M9 19 l0 2',
    // Plain wooden peg with rounded ends.
    dowel: 'M9 4 v16 M6 5.5 h6 M6 18.5 h6',
    // Cam lock disc with its keyway arrow.
    camlock: 'M9 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M9 6.5 v5 M9 12 h4',
    camstud: 'M9 4 v6 M5.5 10 h7 M9 10 v9 M7 13 h4 M7 16 h4',
    nail: 'M4.5 4.5 h9 M9 4.5 v15.5 M9 20 l1.2 -2',
    hexkey: 'M5 4 v12 a2 2 0 0 0 2 2 h7 M5 4 l-1.5 1.5 M5 4 l1.5 1.5',
    shelfpin: 'M4 9 h5 v6 h-5 z M9 10.5 h6 M9 13.5 h6',
    bracket: 'M4 4 v15 h11 M4 4 h4 M15 19 v-4 M6 7 h0.01 M6 16 h0.01',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 18 24">
      <Path
        d={paths[glyph] ?? paths.screw}
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
