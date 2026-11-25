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
  | { gen: 'stool'; w: number; d: number; h: number };

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
  people: 1 | 2;
  model: ModelSpec;
  /** Overrides generated part names where the real manual names them. */
  partNames?: Record<string, string>;
  hardware: { id: string; qty: number }[];
  tools: string[];
  rating: number;
  reviews: number;
  blurb: string;
  /** Present for `full` tier products. */
  hasGuide?: boolean;
  /** Dataset the timing came from, shown in Study mode for attribution. */
  source?: 'IKEA-ASM' | 'IKEA-Manual' | 'Manuals-at-Work' | 'measured';
};

export type Step = {
  id: string;
  title: string;
  detail: string;
  /** Part ids placed during this step. */
  parts: string[];
  hardware: { id: string; qty: number }[];
  tool?: string;
  /** Baseline duration in seconds. */
  seconds: number;
  tip?: string;
  warning?: string;
  /** Camera framing: [azimuth, polar] in radians. */
  view?: [number, number];
};

export type Guide = {
  productId: string;
  steps: Step[];
};
