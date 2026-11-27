import type { Hardware } from './types';

/**
 * The fittings bag. Codes follow IKEA's six-digit fittings numbering and are
 * representative rather than authoritative — enough for the hardware scanner
 * and the parts lists to read as real. The study found the codes meant nothing
 * to people ("can you show me a picture of screw 108…?"), so the app shows part
 * letters instead and keeps the code as small print in the parts bag only.
 *
 * `screw20` and `screw25` are the study's look-alike pair (BILLY's bracket
 * step): same head, same thread, 5 mm apart.
 */
export const HARDWARE: Record<string, Hardware> = {
  hexkey: { id: 'hexkey', code: '100214', name: 'Hex key', short: 'Allen key', glyph: 'hexkey' },
  screw50: { id: 'screw50', code: '101350', name: 'Screw 6×50 mm', short: 'Long screw', glyph: 'screw', lengthMm: 50, diameterMm: 6 },
  screw35: { id: 'screw35', code: '118331', name: 'Screw 4×35 mm', short: 'Screw', glyph: 'screw', lengthMm: 35, diameterMm: 4 },
  screw25: { id: 'screw25', code: '118332', name: 'Screw 4×25 mm', short: 'Wall screw', glyph: 'screw', lengthMm: 25, diameterMm: 4 },
  screw20: { id: 'screw20', code: '116947', name: 'Screw 4×20 mm', short: 'Short screw', glyph: 'screw', lengthMm: 20, diameterMm: 4 },
  screw15: { id: 'screw15', code: '109570', name: 'Screw 4×15 mm', short: 'Small screw', glyph: 'screw', lengthMm: 15, diameterMm: 4 },
  dowel: { id: 'dowel', code: '110630', name: 'Wood dowel 8×35 mm', short: 'Wood dowel', glyph: 'dowel', lengthMm: 35, diameterMm: 8 },
  camlock: { id: 'camlock', code: '114176', name: 'Cam lock', short: 'Cam lock', glyph: 'camlock' },
  camstud: { id: 'camstud', code: '100347', name: 'Cam lock stud', short: 'Cam stud', glyph: 'camstud', lengthMm: 24, diameterMm: 6 },
  shelfpin: { id: 'shelfpin', code: '109041', name: 'Shelf support pin', short: 'Shelf pin', glyph: 'shelfpin' },
  nail: { id: 'nail', code: '101345', name: 'Hardboard nail 20 mm', short: 'Nail', glyph: 'nail', lengthMm: 20, diameterMm: 1.6 },
  bracket: { id: 'bracket', code: '108490', name: 'Wall mount bracket', short: 'Wall bracket', glyph: 'bracket' },

  // HUTTEN (manual AA-49900-4). 100211 is the number the manual prints; the
  // sizes are estimates from product photos and have not been measured.
  hutScrew: { id: 'hutScrew', code: '100211', name: 'Screw, about 7×50 mm', short: 'Screw', glyph: 'screw', lengthMm: 50, diameterMm: 7, estimated: true },
  hutDowel: { id: 'hutDowel', code: '101339', name: 'Wooden dowel, about 8×32 mm', short: 'Wooden dowel', glyph: 'dowel', lengthMm: 32, diameterMm: 8, estimated: true },
};

export const hw = (id: string, qty: number) => ({ id, qty });
