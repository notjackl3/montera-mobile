import { describe, expect, it } from 'vitest';

import { HARDWARE } from '@/data/hardware';
import { CARD_SHORT_MM, ptPerMmFromCard, scaleLabel, silhouette } from '@/engine/truesize';
import { COMMANDS, COMMAND_SCRIPT, parseHeard, shouldFailWake, voiceCaption } from '@/engine/voice';

describe('simulated voice', () => {
  it('parses every scripted line back to its command', () => {
    for (const c of COMMANDS) expect(parseHeard(COMMAND_SCRIPT[c]), c).toBe(c);
  });

  it('parses loose phrasing a participant might use', () => {
    expect(parseHeard('okay done')).toBe('next');
    expect(parseHeard('wait go back')).toBe('back');
    expect(parseHeard('which screw is this')).toBe('parts');
    expect(parseHeard('I think I did it wrong')).toBe('undo');
    expect(parseHeard('mmm')).toBeUndefined();
  });

  it('fails the wake word once, at the planned step only', () => {
    expect(shouldFailWake({ failAtStep: 3, step: 2, failedAlready: false })).toBe(true);
    expect(shouldFailWake({ failAtStep: 3, step: 2, failedAlready: true })).toBe(false);
    expect(shouldFailWake({ failAtStep: 3, step: 1, failedAlready: false })).toBe(false);
    expect(shouldFailWake({ failAtStep: undefined, step: 2, failedAlready: false })).toBe(false);
  });

  it('always offers the on-screen fallback when not understood', () => {
    expect(voiceCaption('failed')).toMatch(/Tap Next/);
    expect(voiceCaption('acting', undefined, 'next')).toBe('Next step');
    expect(voiceCaption('heard', 'Hey IKEA, next')).toBe('“Hey IKEA, next”');
  });
});

describe('real-size drawing', () => {
  it('turns a card match into points per mm', () => {
    expect(ptPerMmFromCard(CARD_SHORT_MM * 5)).toBeCloseTo(5);
  });

  it('draws a 25 mm screw exactly 5 mm longer than a 20 mm one', () => {
    const k = 6;
    const a = silhouette(HARDWARE.screw20, k)!;
    const b = silhouette(HARDWARE.screw25, k)!;
    expect(b.lengthPt - a.lengthPt).toBeCloseTo(5 * k);
    expect(a.widthPt).toBeCloseTo(b.widthPt);
  });

  it('never calls an estimated size actual, even after calibrating', () => {
    expect(scaleLabel(HARDWARE.hutScrew, true)).toBe('estimate');
    expect(scaleLabel(HARDWARE.screw20, true)).toBe('actual');
    expect(scaleLabel(HARDWARE.screw20, false)).toBe('not-to-scale');
  });

  it('has no silhouette for fittings without a length', () => {
    expect(silhouette(HARDWARE.camlock, 5)).toBeUndefined();
  });
});
