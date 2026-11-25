import { describe, expect, it } from 'vitest';

import { PRODUCTS } from '@/data/products';
import type { Part } from '@/data/types';
import { boundsOf, halfExtent, partsFor } from '@/engine/pose';

const extent = (p: Part): [number, number, number] =>
  halfExtent(p).map((h) => h * 2) as [number, number, number];

const finite = (ns: number[]) => ns.every((n) => Number.isFinite(n));

describe('procedural generators', () => {
  it('produces parts for every product in the catalogue', () => {
    for (const product of PRODUCTS) {
      expect(partsFor(product).length, product.id).toBeGreaterThan(0);
    }
  });

  it('gives every part a unique id within its product', () => {
    for (const product of PRODUCTS) {
      const ids = partsFor(product).map((p) => p.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dupes, `${product.id} duplicate part ids`).toEqual([]);
    }
  });

  it('never emits NaN or infinite geometry', () => {
    for (const product of PRODUCTS) {
      for (const part of partsFor(product)) {
        expect(finite(part.position), `${product.id}/${part.id} position`).toBe(true);
        expect(finite(extent(part)), `${product.id}/${part.id} size`).toBe(true);
      }
    }
  });

  it('gives every part positive dimensions', () => {
    for (const product of PRODUCTS) {
      for (const part of partsFor(product)) {
        for (const d of extent(part)) {
          expect(d, `${product.id}/${part.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  // Parts sinking below y=0 would float the product above the grid floor or
  // bury it, which reads as a broken model in the viewport.
  it('keeps every part on or above the floor', () => {
    for (const product of PRODUCTS) {
      for (const part of partsFor(product)) {
        const bottom = part.position[1] - extent(part)[1] / 2;
        expect(bottom, `${product.id}/${part.id} bottom`).toBeGreaterThan(-1);
      }
    }
  });

  it('builds geometry that matches the product’s declared dimensions', () => {
    for (const product of PRODUCTS) {
      const { size } = boundsOf(partsFor(product));
      const { w, d, h } = product.dims;
      // Generous tolerance: handles, overhangs and plinths legitimately differ
      // from the catalogue figure, but a generator reading the wrong axis would
      // blow well past this.
      expect(size[0], `${product.id} width`).toBeGreaterThan(w * 0.6);
      expect(size[0], `${product.id} width`).toBeLessThan(w * 1.4);
      expect(size[1], `${product.id} height`).toBeGreaterThan(h * 0.6);
      expect(size[1], `${product.id} height`).toBeLessThan(h * 1.4);
      expect(size[2], `${product.id} depth`).toBeGreaterThan(d * 0.6);
      expect(size[2], `${product.id} depth`).toBeLessThan(d * 1.4);
    }
  });

  it('is deterministic across calls', () => {
    for (const product of PRODUCTS.slice(0, 6)) {
      expect(partsFor(product)).toEqual(partsFor(product));
    }
  });

  it('applies partNames overrides', () => {
    const lack = PRODUCTS.find((p) => p.id === 'lack-side-table')!;
    const legs = partsFor(lack).filter((p) => p.id.startsWith('leg-'));
    expect(legs).toHaveLength(4);
    for (const leg of legs) expect(leg.name).toBe('Leg');
  });
});

describe('boundsOf', () => {
  it('centres a symmetric product on the X/Z origin', () => {
    const lack = PRODUCTS.find((p) => p.id === 'lack-side-table')!;
    const { center } = boundsOf(partsFor(lack));
    expect(Math.abs(center[0])).toBeLessThan(0.01);
    expect(Math.abs(center[2])).toBeLessThan(0.01);
  });

  it('reports a radius that encloses the whole product', () => {
    for (const product of PRODUCTS) {
      const { size, radius } = boundsOf(partsFor(product));
      expect(radius, product.id).toBeGreaterThanOrEqual(Math.max(...size) / 2 - 0.01);
    }
  });
});
