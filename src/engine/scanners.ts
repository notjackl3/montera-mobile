import { HARDWARE } from '@/data/hardware';
import { BY_ID, PRODUCTS, lookupCode } from '@/data/products';
import { getGuide } from '@/data/guides';

export type ScanMode = 'article' | 'box' | 'manual' | 'hardware';

export type ScanResult =
  | {
      kind: 'product';
      productId: string;
      confidence: number;
      /** The article number or EAN that was read, when there was one. */
      code?: string;
      alternatives: { productId: string; confidence: number }[];
    }
  | { kind: 'step'; productId: string; stepIndex: number; confidence: number }
  | {
      kind: 'hardware';
      productId: string;
      items: { hardwareId: string; qty: number; confidence: number }[];
      /** Step that consumes some of what was detected. */
      neededStep?: number;
    };

export type ModeConfig = {
  mode: ScanMode;
  title: string;
  tagline: string;
  icon: 'barcode-outline' | 'cube-outline' | 'document-text-outline' | 'hardware-chip-outline';
  /** Instruction shown under the reticle. */
  instruction: string;
  reticle: 'barcode' | 'box' | 'page' | 'scatter';
  /** How long a convincing detection takes, in milliseconds. */
  dwellMs: number;
  /** True where the camera does real work rather than a simulation. */
  live: boolean;
  liveNote?: string;
};

export const MODES: Record<ScanMode, ModeConfig> = {
  article: {
    mode: 'article',
    title: 'Article number',
    tagline: 'Read the label on the flat-pack',
    icon: 'barcode-outline',
    instruction: 'Line the barcode or the 8-digit article number up inside the frame',
    reticle: 'barcode',
    dwellMs: 2100,
    live: true,
    liveNote: 'Real barcode decoding — any EAN-13 or Code 128 in frame is read for real',
  },
  box: {
    mode: 'box',
    title: 'Box or product',
    tagline: 'Identify it from a photo',
    icon: 'cube-outline',
    instruction: 'Fit the whole box, or the assembled product, inside the frame',
    reticle: 'box',
    dwellMs: 2600,
    live: false,
    liveNote: 'Prototype: returns a ranked match list rather than running a vision model',
  },
  manual: {
    mode: 'manual',
    title: 'Manual page',
    tagline: 'Jump from paper to the same step in 3D',
    icon: 'document-text-outline',
    instruction: 'Hold the open manual page flat and fill the frame',
    reticle: 'page',
    dwellMs: 2400,
    live: false,
    liveNote: 'Prototype: resolves to a step number rather than reading the diagram',
  },
  hardware: {
    mode: 'hardware',
    title: 'Loose hardware',
    tagline: 'Work out which screw is which',
    icon: 'hardware-chip-outline',
    instruction: 'Spread the fittings on a plain surface and hold the phone above them',
    reticle: 'scatter',
    dwellMs: 2800,
    live: false,
    liveNote: 'Prototype: reads from the parts list rather than detecting real fittings',
  },
};

export const MODE_ORDER: ScanMode[] = ['article', 'box', 'manual', 'hardware'];

/** Products a demo is most likely to want to land on. */
export const DEMO_TARGETS = ['lack-side-table', 'hutten-wine-rack', 'kallax-2x2', 'billy-bookcase', 'malm-dresser'];

const confidenceJitter = (base: number) => Math.min(0.99, base + (Math.random() * 0.06 - 0.03));

/**
 * Produce a plausible detection for `mode`, landing on `targetId`.
 *
 * The scanners are deliberately deterministic about *what* they find — the demo
 * picks the target up front — and only the surrounding detail (confidence,
 * runner-up matches) is randomised, so a live demo cannot surprise you.
 */
export function simulate(mode: ScanMode, targetId: string): ScanResult {
  const product = BY_ID[targetId] ?? BY_ID[DEMO_TARGETS[0]];

  if (mode === 'article') {
    return {
      kind: 'product',
      productId: product.id,
      confidence: confidenceJitter(0.97),
      code: product.article,
      alternatives: [],
    };
  }

  if (mode === 'box') {
    // Runner-ups are drawn from the same category so the list looks like a
    // real classifier's output rather than random products.
    const siblings = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 2);
    return {
      kind: 'product',
      productId: product.id,
      confidence: confidenceJitter(0.89),
      alternatives: siblings.map((p, i) => ({ productId: p.id, confidence: confidenceJitter(0.42 - i * 0.2) })),
    };
  }

  if (mode === 'manual') {
    const guide = getGuide(product.id);
    const total = guide?.steps.length ?? 1;
    // Land mid-build, which is where somebody reaching for their phone is.
    const stepIndex = Math.min(total - 1, Math.max(1, Math.round(total * 0.45)));
    return { kind: 'step', productId: product.id, stepIndex, confidence: confidenceJitter(0.91) };
  }

  const guide = getGuide(product.id);
  // Prefer the fittings of a step in the middle of the build; otherwise fall
  // back to the product's overall parts list.
  const step = guide?.steps.find((s) => s.hardware.length > 0);
  const lines = (step?.hardware.length ? step.hardware : product.hardware).slice(0, 4);
  return {
    kind: 'hardware',
    productId: product.id,
    items: lines
      .filter((l) => HARDWARE[l.id])
      .map((l) => ({ hardwareId: l.id, qty: l.qty, confidence: confidenceJitter(0.86) })),
    neededStep: step ? guide?.steps.indexOf(step) : undefined,
  };
}

/** Resolve a barcode the camera actually decoded. */
export function fromBarcode(raw: string): ScanResult | undefined {
  const product = lookupCode(raw);
  if (!product) return undefined;
  return {
    kind: 'product',
    productId: product.id,
    confidence: 1,
    code: product.article,
    alternatives: [],
  };
}
