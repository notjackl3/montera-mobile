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

describe('rack generator (HUTTEN)', () => {
  const rack = PRODUCTS.find((p) => p.id === 'hutten-wine-rack')!;
  const parts = partsFor(rack);
  const ids = parts.map((p) => p.id);

  it('emits the deterministic ids the guide references', () => {
    for (const id of ['post-rf', 'post-rb', 'post-lf', 'post-lb', 'siderod-r1', 'siderod-l2', 'shelf2-front', 'shelf3-rod4']) {
      expect(ids, id).toContain(id);
    }
  });

  it('has 4 posts, 4 loose rods and 3 shelves of 2 rails and 4 rods', () => {
    expect(ids.filter((i) => i.startsWith('post-'))).toHaveLength(4);
    expect(ids.filter((i) => i.startsWith('siderod-'))).toHaveLength(4);
    for (const n of [1, 2, 3]) {
      expect(ids.filter((i) => i.startsWith(`shelf${n}-`) && !i.includes('rod'))).toHaveLength(2);
      expect(ids.filter((i) => i.startsWith(`shelf${n}-rod`))).toHaveLength(4);
    }
  });

  it('fits exactly inside IKEA’s outside size, 33 × 30 × 34 cm', () => {
    const { size } = boundsOf(parts);
    expect(size[0]).toBeCloseTo(33, 1);
    expect(size[1]).toBeCloseTo(34, 1);
    expect(size[2]).toBeCloseTo(30, 1);
  });

  it('puts the shelves at about 4.5, 16 and 27.5 cm', () => {
    const ys = [1, 2, 3].map((n) => parts.find((p) => p.id === `shelf${n}-front`)!.position[1]);
    expect(ys).toEqual([4.5, 16, 27.5]);
  });

  it('runs shelf and side rods front to back', () => {
    for (const p of parts.filter((p) => p.id.includes('rod'))) {
      const [x, , z] = extent(p);
      expect(z, p.id).toBeGreaterThan(x * 5);
    }
  });

  it('stops shelf rods at the rails and side rods at the posts', () => {
    const rail = parts.find((p) => p.id === 'shelf1-front')!;
    const rod = parts.find((p) => p.id === 'shelf1-rod1')!;
    const railInner = rail.position[2] - extent(rail)[2] / 2;
    expect(rod.position[2] + extent(rod)[2] / 2).toBeCloseTo(railInner, 5);
    const post = parts.find((p) => p.id === 'post-rf')!;
    const side = parts.find((p) => p.id === 'siderod-r1')!;
    expect(side.position[2] + extent(side)[2] / 2).toBeCloseTo(post.position[2] - extent(post)[2] / 2, 5);
  });
});

import { markPose } from '@/engine/marks';
import { BY_ID } from '@/data/products';

describe('orientation marks', () => {
  it('points every mark at a part the product has', () => {
    for (const p of PRODUCTS) {
      const ids = new Set(partsFor(p).map((x) => x.id));
      for (const m of p.marks ?? []) expect(ids.has(m.partId), `${p.id} ${m.partId}`).toBe(true);
    }
  });

  it('puts BILLY’s dots on the inward faces of the side panels', () => {
    const billy = BY_ID['billy-bookcase'];
    const parts = partsFor(billy);
    for (const m of billy.marks!) {
      const part = parts.find((x) => x.id === m.partId)!;
      const world = part.position[0] + markPose(part, m).offset[0];
      // Inward means toward the centre line.
      expect(Math.abs(world), m.partId).toBeLessThan(Math.abs(part.position[0]));
    }
  });

  it('puts HUTTEN’s dots on the outward faces of the posts, near the top', () => {
    const rack = BY_ID['hutten-wine-rack'];
    const parts = partsFor(rack);
    for (const m of rack.marks!) {
      const part = parts.find((x) => x.id === m.partId)!;
      const pose = markPose(part, m);
      expect(Math.abs(part.position[0] + pose.offset[0]), m.partId).toBeGreaterThan(Math.abs(part.position[0]));
      expect(pose.offset[1], m.partId).toBeGreaterThan(0);
      expect(pose.radius * 2, m.partId).toBeLessThan(2.8);
    }
  });
});
