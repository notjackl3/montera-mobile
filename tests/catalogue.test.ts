import { describe, expect, it } from 'vitest';

import { HARDWARE } from '@/data/hardware';
import { BY_ID, PRODUCTS, lookupCode } from '@/data/products';

describe('catalogue integrity', () => {
  it('has products', () => {
    expect(PRODUCTS.length).toBeGreaterThan(20);
  });

  it('gives every product a unique id', () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // A duplicate article number would make the article scanner ambiguous: two
  // products would answer to the same label.
  it('gives every product a unique article number', () => {
    const articles = PRODUCTS.map((p) => p.article);
    const dupes = articles.filter((a, i) => articles.indexOf(a) !== i);
    expect(dupes).toEqual([]);
  });

  it('gives every product a unique EAN', () => {
    const eans = PRODUCTS.map((p) => p.ean);
    const dupes = eans.filter((e, i) => eans.indexOf(e) !== i);
    expect(dupes).toEqual([]);
  });

  it('formats every article number as NNN.NNN.NN', () => {
    for (const p of PRODUCTS) {
      expect(p.article, `${p.id} article`).toMatch(/^\d{3}\.\d{3}\.\d{2}$/);
    }
  });

  it('uses 13-digit EANs', () => {
    for (const p of PRODUCTS) {
      expect(p.ean, `${p.id} ean`).toMatch(/^\d{13}$/);
    }
  });

  it('references only hardware that exists', () => {
    for (const p of PRODUCTS) {
      for (const line of p.hardware) {
        expect(HARDWARE[line.id], `${p.id} -> ${line.id}`).toBeDefined();
        expect(line.qty).toBeGreaterThan(0);
      }
    }
  });

  it('gives every product sane dimensions and metadata', () => {
    for (const p of PRODUCTS) {
      expect(p.dims.w, p.id).toBeGreaterThan(0);
      expect(p.dims.d, p.id).toBeGreaterThan(0);
      expect(p.dims.h, p.id).toBeGreaterThan(0);
      expect(p.baselineMin, p.id).toBeGreaterThan(0);
      expect(p.price, p.id).toBeGreaterThan(0);
      expect(p.difficulty, p.id).toBeGreaterThanOrEqual(1);
      expect(p.difficulty, p.id).toBeLessThanOrEqual(5);
      expect(p.rating, p.id).toBeLessThanOrEqual(5);
    }
  });

  it('marks exactly the guided products as the full tier', () => {
    const full = PRODUCTS.filter((p) => p.tier === 'full');
    expect(full.length).toBeGreaterThanOrEqual(3);
    for (const p of full) expect(p.hasGuide, p.id).toBe(true);
  });
});

describe('lookupCode', () => {
  it('resolves every product by its article number', () => {
    for (const p of PRODUCTS) {
      expect(lookupCode(p.article)?.id, p.id).toBe(p.id);
    }
  });

  it('resolves every product by its EAN', () => {
    for (const p of PRODUCTS) {
      expect(lookupCode(p.ean)?.id, p.id).toBe(p.id);
    }
  });

  it('ignores punctuation in a typed article number', () => {
    expect(lookupCode('404 312 09')?.id).toBe('lack-side-table');
    expect(lookupCode('40431209')?.id).toBe('lack-side-table');
  });

  it('returns undefined for junk', () => {
    expect(lookupCode('')).toBeUndefined();
    expect(lookupCode('abc')).toBeUndefined();
    expect(lookupCode('999.999.99')).toBeUndefined();
  });

  it('indexes BY_ID consistently with PRODUCTS', () => {
    expect(Object.keys(BY_ID).length).toBe(PRODUCTS.length);
  });
});
