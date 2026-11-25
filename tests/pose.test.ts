import { describe, expect, it } from 'vitest';

import { getGuide } from '@/data/guides';
import { BY_ID, PRODUCTS } from '@/data/products';
import { boundsOf, fitDistance, partsFor, resolvePoses, stepIndexByPart } from '@/engine/pose';

const kallax = BY_ID['kallax-2x2'];
const kallaxGuide = getGuide('kallax-2x2')!;
const lack = BY_ID['lack-side-table'];

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('assembled mode', () => {
  it('puts every part at its final pose, fully opaque', () => {
    for (const product of PRODUCTS) {
      for (const pose of resolvePoses(product, undefined, { mode: 'assembled' })) {
        expect(pose.target).toEqual(pose.part.position);
        expect(pose.opacity).toBe(1);
        expect(pose.state).toBe('placed');
      }
    }
  });
});

describe('exploded mode', () => {
  it('moves parts away from their assembled pose as spread increases', () => {
    const at = (spread: number) =>
      resolvePoses(kallax, undefined, { mode: 'exploded', spread });

    const none = at(0);
    const half = at(0.5);
    const full = at(1);

    for (let i = 0; i < none.length; i++) {
      const base = none[i].part.position;
      expect(dist(none[i].target, base)).toBeCloseTo(0, 5);
      expect(dist(full[i].target, base)).toBeGreaterThan(dist(half[i].target, base));
    }
  });

  it('keeps every part visible while exploded', () => {
    for (const pose of resolvePoses(kallax, undefined, { mode: 'exploded', spread: 1 })) {
      expect(pose.opacity).toBe(1);
    }
  });
});

describe('step mode', () => {
  const stepMap = stepIndexByPart(kallaxGuide);

  it('maps every guide-installed part to its step', () => {
    expect(stepMap['side-l']).toBe(1);
    expect(stepMap['div-v-1']).toBe(3);
    expect(stepMap['side-r']).toBe(5);
  });

  it('classifies parts as placed, active or pending around the current step', () => {
    const step = 3;
    const poses = resolvePoses(kallax, kallaxGuide, { mode: 'step', step });

    for (const pose of poses) {
      const owner = stepMap[pose.part.id];
      if (owner === undefined) continue;
      if (owner < step) expect(pose.state, pose.part.id).toBe('placed');
      else if (owner === step) expect(pose.state, pose.part.id).toBe('active');
      else expect(pose.state, pose.part.id).toBe('pending');
    }
  });

  it('seats placed parts exactly, and floats the active part off its destination', () => {
    const poses = resolvePoses(kallax, kallaxGuide, { mode: 'step', step: 3 });

    const placed = poses.filter((p) => p.state === 'placed');
    expect(placed.length).toBeGreaterThan(0);
    for (const p of placed) expect(p.target).toEqual(p.part.position);

    const active = poses.filter((p) => p.state === 'active');
    expect(active.length).toBeGreaterThan(0);
    for (const p of active) {
      expect(dist(p.target, p.part.position), p.part.id).toBeGreaterThan(1);
    }
  });

  it('hides pending parts by default and ghosts them when asked', () => {
    const opts = { mode: 'step' as const, step: 2 };
    const hidden = resolvePoses(kallax, kallaxGuide, opts).filter((p) => p.state === 'pending');
    expect(hidden.length).toBeGreaterThan(0);
    for (const p of hidden) expect(p.opacity).toBe(0);

    const ghosted = resolvePoses(kallax, kallaxGuide, { ...opts, ghostPending: true })
      .filter((p) => p.state === 'pending');
    for (const p of ghosted) {
      expect(p.opacity).toBeGreaterThan(0);
      expect(p.opacity).toBeLessThan(0.5);
    }
  });

  it('places strictly more parts as the build progresses, and all of them at the end', () => {
    const placedAt = (step: number) =>
      resolvePoses(kallax, kallaxGuide, { mode: 'step', step }).filter((p) => p.state === 'placed').length;

    const counts = kallaxGuide.steps.map((_, i) => placedAt(i));
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i], `step ${i}`).toBeGreaterThanOrEqual(counts[i - 1]);
    }

    // One past the final step is the completed state: nothing left floating.
    const final = resolvePoses(kallax, kallaxGuide, { mode: 'step', step: kallaxGuide.steps.length });
    expect(final.every((p) => p.state === 'placed')).toBe(true);
    expect(final.length).toBe(partsFor(kallax).length);
  });

  it('treats a product with no guide as fully assembled', () => {
    const poses = resolvePoses(BY_ID['malm-dresser'], undefined, { mode: 'step', step: 0 });
    expect(poses.every((p) => p.state === 'placed' && p.opacity === 1)).toBe(true);
  });
});

describe('fitDistance', () => {
  it('frames the product from outside its bounding sphere', () => {
    for (const product of PRODUCTS) {
      const { radius } = boundsOf(partsFor(product));
      expect(fitDistance(radius), product.id).toBeGreaterThan(radius);
    }
  });

  it('scales linearly with product size', () => {
    expect(fitDistance(100)).toBeCloseTo(fitDistance(50) * 2, 6);
  });

  it('puts a taller product further away than a small one', () => {
    const small = fitDistance(boundsOf(partsFor(lack)).radius);
    const big = fitDistance(boundsOf(partsFor(BY_ID['billy-bookcase'])).radius);
    expect(big).toBeGreaterThan(small);
  });
});
