import type { Hardware } from '@/data/types';

/**
 * Real-size drawing of fittings.
 *
 * Device DPI APIs do not report physical size reliably (and the layout unit is
 * a point, not a pixel), so the user calibrates against a bank card: an
 * ISO/IEC 7810 ID-1 card is 53.98 × 85.60 mm. They drag until a box on screen
 * is as wide as the card's short edge, and the result is points per mm.
 */
export const CARD_SHORT_MM = 53.98;
export const CARD_LONG_MM = 85.6;

/** Sensible slider limits: about 2 to 9 points per mm covers phones and tablets. */
export const CARD_MIN_PT = 110;
export const CARD_MAX_PT = 480;

export const ptPerMmFromCard = (cardWidthPt: number) => cardWidthPt / CARD_SHORT_MM;

/** Uncalibrated guess, always labelled "not to scale" on screen. */
export const DEFAULT_PT_PER_MM = 4;

export type Silhouette = { lengthPt: number; widthPt: number; headPt: number };

/** On-screen size of a fitting at `ptPerMm`. */
export function silhouette(h: Hardware, ptPerMm: number): Silhouette | undefined {
  if (!h.lengthMm) return undefined;
  const d = h.diameterMm ?? 4;
  return {
    lengthPt: h.lengthMm * ptPerMm,
    widthPt: Math.max(d * ptPerMm, 3),
    // Screw and nail heads are roughly twice the shank.
    headPt: h.glyph === 'screw' || h.glyph === 'nail' ? Math.max(d * 2 * ptPerMm, 6) : 0,
  };
}

/** How the drawing should be labelled. Estimated sizes never claim to be real. */
export function scaleLabel(h: Hardware, calibrated: boolean): 'actual' | 'estimate' | 'not-to-scale' {
  if (h.estimated) return 'estimate';
  return calibrated ? 'actual' : 'not-to-scale';
}
