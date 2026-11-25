import { describe, expect, it } from 'vitest';

import { getGuide } from '@/data/guides';
import { BY_ID } from '@/data/products';
import { summarise } from '@/engine/study';
import { useApp, type Session } from '@/store/useApp';

const session = (over: Partial<Session> & Pick<Session, 'productId' | 'mode' | 'elapsedSec'>): Session => ({
  id: Math.random().toString(36).slice(2),
  startedAt: Date.now(),
  finishedAt: Date.now(),
  stepTimes: [],
  completed: true,
  ...over,
});

describe('study comparison', () => {
  it('reports the 3D guide as faster when it is', () => {
    const s = summarise([
      session({ productId: 'lack-side-table', mode: 'paper', elapsedSec: 600 }),
      session({ productId: 'lack-side-table', mode: 'digital', elapsedSec: 300 }),
    ]);
    expect(s.paired).toHaveLength(1);
    expect(s.deltaPct).toBeCloseTo(50, 5);
    expect(s.paired[0].savedPct).toBeCloseTo(50, 5);
  });

  /**
   * Regression: the headline used to pool every session, so a product built
   * only in 3D dragged the digital mean up and inverted the result — it read
   * "slower in 3D" while every paired product was dramatically faster.
   */
  it('ignores products that were only built one way', () => {
    const s = summarise([
      session({ productId: 'lack-side-table', mode: 'paper', elapsedSec: 600 }),
      session({ productId: 'lack-side-table', mode: 'digital', elapsedSec: 300 }),
      // Long digital-only build with no paper control.
      session({ productId: 'billy-bookcase', mode: 'digital', elapsedSec: 5000 }),
    ]);

    expect(s.paired.map((p) => p.product.id)).toEqual(['lack-side-table']);
    expect(s.deltaPct).toBeCloseTo(50, 5);
    expect(s.meanDigitalSec).toBe(300);
    expect(s.digitalSessions).toHaveLength(1);
  });

  it('averages repeated runs of the same product', () => {
    const s = summarise([
      session({ productId: 'lack-side-table', mode: 'paper', elapsedSec: 600 }),
      session({ productId: 'lack-side-table', mode: 'paper', elapsedSec: 400 }),
      session({ productId: 'lack-side-table', mode: 'digital', elapsedSec: 300 }),
    ]);
    expect(s.meanPaperSec).toBe(500);
    expect(s.deltaPct).toBeCloseTo(40, 5);
  });

  it('excludes abandoned sessions', () => {
    const s = summarise([
      session({ productId: 'lack-side-table', mode: 'paper', elapsedSec: 600 }),
      session({ productId: 'lack-side-table', mode: 'digital', elapsedSec: 300 }),
      session({ productId: 'lack-side-table', mode: 'digital', elapsedSec: 9999, completed: false }),
    ]);
    expect(s.meanDigitalSec).toBe(300);
  });

  it('weights each product equally regardless of how many runs it has', () => {
    const s = summarise([
      session({ productId: 'lack-side-table', mode: 'paper', elapsedSec: 600 }),
      session({ productId: 'lack-side-table', mode: 'digital', elapsedSec: 300 }),
      session({ productId: 'kallax-2x2', mode: 'paper', elapsedSec: 2000 }),
      session({ productId: 'kallax-2x2', mode: 'digital', elapsedSec: 1000 }),
      session({ productId: 'kallax-2x2', mode: 'digital', elapsedSec: 1000 }),
    ]);
    expect(s.paired).toHaveLength(2);
    expect(s.meanPaperSec).toBe(1300);
    expect(s.meanDigitalSec).toBe(650);
  });

  it('reports a slower result honestly rather than clamping it', () => {
    const s = summarise([
      session({ productId: 'lack-side-table', mode: 'paper', elapsedSec: 300 }),
      session({ productId: 'lack-side-table', mode: 'digital', elapsedSec: 600 }),
    ]);
    expect(s.deltaPct).toBeCloseTo(-100, 5);
  });

  it('survives having no sessions at all', () => {
    const s = summarise([]);
    expect(s.paired).toEqual([]);
    expect(s.deltaPct).toBe(0);
    expect(s.meanPaperSec).toBe(0);
  });

  it('ignores sessions pointing at a product that is not in the catalogue', () => {
    const s = summarise([
      session({ productId: 'ghost-product', mode: 'paper', elapsedSec: 600 }),
      session({ productId: 'ghost-product', mode: 'digital', elapsedSec: 300 }),
    ]);
    expect(s.paired).toEqual([]);
  });
});

describe('seeded demo data', () => {
  it('presents the 3D guide as meaningfully faster out of the box', () => {
    const s = summarise(useApp.getState().sessions);
    expect(s.paired.length).toBeGreaterThanOrEqual(2);
    // The demo opens on this number; it must not read as a regression.
    expect(s.deltaPct).toBeGreaterThan(20);
    for (const p of s.paired) {
      expect(p.savedPct, p.product.id).toBeGreaterThan(0);
    }
  });

  // The home screen's "Continue building" card reads this straight into the
  // build player; an out-of-range step would open on an undefined step.
  it('seeds a resumable build that points at a real step of a real guide', () => {
    const { progress } = useApp.getState();
    const entries = Object.entries(progress);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, p] of entries) {
      const guide = getGuide(id);
      expect(guide, `${id} is resumable but has no guide`).toBeDefined();
      expect(p.step, id).toBeGreaterThanOrEqual(0);
      expect(p.step, id).toBeLessThan(guide!.steps.length);
      expect(guide!.steps[p.step], `${id} step ${p.step}`).toBeDefined();
    }
  });

  it('seeds recents that all resolve to catalogue products', () => {
    for (const id of useApp.getState().recents) {
      expect(BY_ID[id], id).toBeDefined();
    }
  });
});
