import type { FinishKey } from '@/ui/theme';

/** Primitive geometry. All dimensions are centimetres. */
export type Shape =
  | { kind: 'box'; size: [number, number, number] }
  | { kind: 'cyl'; r: number; h: number; seg?: number };

/**
 * One physical piece in the box.
 *
 * `position` is the pose in the finished product, with the origin on the floor
 * at the centre of the footprint and +Y up. `explode` is the direction the part
 * travels in exploded view; it defaults to a sensible guess from the position.
 */
export type Part = {
  id: string;
  name: string;
  shape: Shape;
  position: [number, number, number];
  rotation?: [number, number, number];
  finish: FinishKey;
  /** Direction the part slides in from, used by step and exploded views. */
  explode?: [number, number, number];
};

export type Hardware = {
  id: string;
  /** Real IKEA hardware part number. */
  code: string;
  name: string;
  /** Rendered as a tiny SVG glyph in parts lists and the hardware scanner. */
  glyph: 'screw' | 'dowel' | 'camlock' | 'camstud' | 'nail' | 'hexkey' | 'shelfpin' | 'bracket';
  lengthMm?: number;
  /** Shank diameter, for the 1:1 silhouette. */
  diameterMm?: number;
  /** Short name for the parts bag ("Short screw"); falls back to `name`. */
  short?: string;
  /**
   * Sizes were estimated from photos rather than measured. The parts bag still
   * draws them, but never as "actual size": matching a real screw against an
   * estimate would teach the wrong pick.
   */
  estimated?: boolean;
};

export type ModelSpec =
  | { gen: 'table'; w: number; d: number; h: number; topT?: number; legR?: number; round?: boolean }
  | { gen: 'shelfUnit'; w: number; d: number; h: number; shelves: number; t?: number; plinth?: number }
  | { gen: 'grid'; w: number; d: number; h: number; cols: number; rows: number; t?: number }
  | { gen: 'cabinet'; w: number; d: number; h: number; doors: number; shelves?: number }
  | { gen: 'drawers'; w: number; d: number; h: number; drawers: number }
  | { gen: 'chair'; w: number; d: number; h: number; arms?: boolean; upholstered?: boolean }
  | { gen: 'bed'; w: number; d: number; h: number; headboard?: number }
  | { gen: 'desk'; w: number; d: number; h: number; drawers?: number; shelf?: boolean }
  | { gen: 'wallShelf'; w: number; d: number; h: number; shelves: number }
  | { gen: 'stool'; w: number; d: number; h: number }
  /** HUTTEN-style rack: four posts, two loose rods per side, ready-made rod shelves. */
  | { gen: 'rack'; w: number; d: number; h: number; levels: number[]; post?: number };

export type Tier = 'full' | 'simplified' | 'parts';
export type Category = 'table' | 'shelf' | 'storage' | 'seating' | 'bed' | 'desk';

export type Product = {
  id: string;
  name: string;
  /** e.g. "Side table, black-brown" */
  descriptor: string;
  category: Category;
  /** IKEA article number, formatted. */
  article: string;
  /** EAN-13 on the flat-pack label. */
  ean: string;
  dims: { w: number; d: number; h: number };
  price: number;
  finish: FinishKey;
  finishName: string;
  tier: Tier;
  /** 1 = two minutes and an Allen key, 5 = clear your afternoon. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Real-world baseline in minutes, from the IKEA-ASM / Manuals-at-Work timings. */
  baselineMin: number;
  /** The baseline is the team's estimate, not a recorded time. Shown as "est.". */
  baselineEstimated?: boolean;
  people: 1 | 2;
  model: ModelSpec;
  /** Overrides generated part names where the real manual names them. */
  partNames?: Record<string, string>;
  hardware: { id: string; qty: number }[];
  /**
   * Fixed part letters, where the guide letters panels as well as fittings
   * (HUTTEN: A post … E dowel). Keys are hardware ids. Without it, fittings are
   * lettered A, B, C… in `hardware` order; see `lettersFor`.
   */
  hardwareLetters?: Record<string, string>;
  /** Letters for panel groups, keyed by part id. Drawn in the parts list. */
  partLetters?: Record<string, string>;
  /** Faces that carry an orientation sticker, drawn as a dot in 3D. */
  marks?: OrientationMark[];
  tools: string[];
  rating: number;
  reviews: number;
  blurb: string;
  /** Present for `full` tier products. */
  hasGuide?: boolean;
  /** Dataset the timing came from, shown in Study mode for attribution. */
  source?: 'IKEA-ASM' | 'IKEA-Manual' | 'Manuals-at-Work' | 'measured';
};

/**
 * A coloured sticker on one face of a part (mentors allowed small changes to
 * the physical product). `face` is the outward normal in the part's own frame.
 */
export type OrientationMark = {
  partId: string;
  face: '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
  /**
   * Where on the face, as fractions of its half-extents along the face's two
   * other axes in x, y, z order (an x face: [y, z]; a y face: [x, z]; a z face:
   * [x, y]). Default is the centre.
   */
  at?: [number, number];
};

export type Step = {
  id: string;
  title: string;
  /**
   * One or two short sentences. `{hw:<id>}` renders as that fitting's letter,
   * e.g. "Drive a screw {hw:screw50} in" -> "Drive a screw (A) in".
   */
  detail: string;
  /** Part ids placed during this step. */
  parts: string[];
  hardware: { id: string; qty: number }[];
  tool?: string;
  /** Baseline duration in seconds. */
  seconds: number;
  tip?: string;
  /**
   * Marks a critical step: one where builds actually go wrong (mirrored or
   * handed parts, wall anchoring). Next holds once until its checks are seen.
   */
  warning?: string;
  /** "Done when": visible end states, one or two per step. */
  checks?: string[];
  /** What to do to take this step apart. Generated from parts/hardware if absent. */
  undo?: string;
  /** Camera framing: [azimuth, polar] in radians. */
  view?: [number, number];
};

export type Guide = {
  productId: string;
  steps: Step[];
};
