import { describe, expect, it } from 'vitest';

import { GUIDES, getGuide, guideSeconds } from '@/data/guides';
import { HARDWARE } from '@/data/hardware';
import { BY_ID, PRODUCTS } from '@/data/products';
import { partsFor } from '@/engine/pose';

const guided = PRODUCTS.filter((p) => p.tier === 'full');

describe('guide coverage', () => {
  it('gives every full-tier product a guide', () => {
    for (const p of guided) {
      expect(getGuide(p.id), `${p.id} has no guide`).toBeDefined();
    }
  });

  it('points every guide at a product that exists and is full tier', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      expect(BY_ID[id], `guide ${id} has no product`).toBeDefined();
      expect(BY_ID[id].tier, id).toBe('full');
      expect(guide.productId).toBe(id);
    }
  });

  it('leaves no non-guided product claiming hasGuide', () => {
    for (const p of PRODUCTS) {
      if (p.tier !== 'full') expect(p.hasGuide, p.id).toBeUndefined();
    }
  });
});

describe('guide step integrity', () => {
  /**
   * The load-bearing invariant. Steps address parts by the id the generator
   * emits; a typo or a generator rename makes that part silently never appear
   * in the build screen, with no error anywhere.
   */
  it('references only part ids the generator actually emits', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      const known = new Set(partsFor(BY_ID[id]).map((p) => p.id));
      for (const step of guide.steps) {
        for (const partId of step.parts) {
          expect(known.has(partId), `${id}/${step.id} -> unknown part "${partId}"`).toBe(true);
        }
      }
    }
  });

  it('installs each part at most once', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      const all = guide.steps.flatMap((s) => s.parts);
      const dupes = all.filter((p, i) => all.indexOf(p) !== i);
      expect(dupes, `${id} installs a part twice`).toEqual([]);
    }
  });

  // Anything the steps never place stays hidden for the whole build, so the
  // model is still incomplete when the guide says you are finished.
  it('installs every part of the product by the final step', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      const placed = new Set(guide.steps.flatMap((s) => s.parts));
      const missing = partsFor(BY_ID[id])
        .map((p) => p.id)
        .filter((p) => !placed.has(p));
      expect(missing, `${id} never places`).toEqual([]);
    }
  });

  it('references only hardware that exists, in positive quantities', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      for (const step of guide.steps) {
        for (const line of step.hardware) {
          expect(HARDWARE[line.id], `${id}/${step.id} -> ${line.id}`).toBeDefined();
          expect(line.qty, `${id}/${step.id} ${line.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives every step a unique id, a title, detail and a positive duration', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      const ids = guide.steps.map((s) => s.id);
      expect(new Set(ids).size, `${id} duplicate step ids`).toBe(ids.length);
      for (const step of guide.steps) {
        expect(step.title.length, `${id}/${step.id}`).toBeGreaterThan(0);
        expect(step.detail.length, `${id}/${step.id}`).toBeGreaterThan(10);
        expect(step.seconds, `${id}/${step.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps step camera framing inside the orbit clamp', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      for (const step of guide.steps) {
        if (!step.view) continue;
        const [, pol] = step.view;
        // useOrbit clamps polar to [0.18, 1.52]; a step outside that range
        // would snap the camera the moment the user touches the model.
        expect(pol, `${id}/${step.id} polar`).toBeGreaterThanOrEqual(0.18);
        expect(pol, `${id}/${step.id} polar`).toBeLessThanOrEqual(1.52);
      }
    }
  });

  it('totals step times roughly in line with the advertised baseline', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      const guideMin = guideSeconds(guide) / 60;
      const baseline = BY_ID[id].baselineMin;
      // The guided build should be in the same ballpark as, and no slower than,
      // the real-world baseline it is meant to improve on.
      expect(guideMin, `${id} guide longer than baseline`).toBeLessThanOrEqual(baseline);
      expect(guideMin, `${id} guide implausibly short`).toBeGreaterThan(baseline * 0.25);
    }
  });
});
