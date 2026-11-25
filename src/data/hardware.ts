import type { Hardware } from './types';

/**
 * The fittings bag. Codes follow IKEA's six-digit fittings numbering and are
 * representative rather than authoritative — enough for the hardware scanner
 * and the parts lists to read as real.
 */
export const HARDWARE: Record<string, Hardware> = {
  hexkey: { id: 'hexkey', code: '100214', name: 'Hex key', glyph: 'hexkey' },
  screw50: { id: 'screw50', code: '101350', name: 'Screw 6×50 mm', glyph: 'screw', lengthMm: 50 },
  screw35: { id: 'screw35', code: '118331', name: 'Screw 4×35 mm', glyph: 'screw', lengthMm: 35 },
  screw15: { id: 'screw15', code: '109570', name: 'Screw 4×15 mm', glyph: 'screw', lengthMm: 15 },
  dowel: { id: 'dowel', code: '110630', name: 'Wood dowel 8×35 mm', glyph: 'dowel', lengthMm: 35 },
  camlock: { id: 'camlock', code: '114176', name: 'Cam lock', glyph: 'camlock' },
  camstud: { id: 'camstud', code: '100347', name: 'Cam lock stud', glyph: 'camstud', lengthMm: 24 },
  shelfpin: { id: 'shelfpin', code: '109041', name: 'Shelf support pin', glyph: 'shelfpin' },
  nail: { id: 'nail', code: '101345', name: 'Hardboard nail 20 mm', glyph: 'nail', lengthMm: 20 },
  bracket: { id: 'bracket', code: '108490', name: 'Wall mount bracket', glyph: 'bracket' },
};

export const hw = (id: string, qty: number) => ({ id, qty });
