import { describe, expect, it } from 'vitest';

import { getGuide } from '@/data/guides';
import { HARDWARE } from '@/data/hardware';
import { BY_ID, PRODUCTS } from '@/data/products';
import { DEMO_TARGETS, MODES, MODE_ORDER, fromBarcode, simulate } from '@/engine/scanners';
import { fmtDuration, fmtShort } from '@/store/useApp';

describe('scanner configuration', () => {
  it('configures every mode in the order the UI lists them', () => {
    expect(MODE_ORDER).toHaveLength(4);
    for (const m of MODE_ORDER) {
      const cfg = MODES[m];
      expect(cfg, m).toBeDefined();
      expect(cfg.mode).toBe(m);
      expect(cfg.title.length).toBeGreaterThan(0);
      expect(cfg.instruction.length).toBeGreaterThan(10);
      expect(cfg.dwellMs).toBeGreaterThan(500);
    }
  });

  // Claiming a simulated scanner is live would be dishonest on stage.
  it('marks only the barcode scanner as live', () => {
    expect(MODES.article.live).toBe(true);
    for (const m of ['box', 'manual', 'hardware'] as const) {
      expect(MODES[m].live, m).toBe(false);
    }
  });

  it('points every demo target at a real product', () => {
    for (const id of DEMO_TARGETS) {
      expect(BY_ID[id], id).toBeDefined();
    }
  });
});

describe('simulate', () => {
  it('resolves to the requested product for every mode and demo target', () => {
    for (const mode of MODE_ORDER) {
      for (const target of DEMO_TARGETS) {
        const r = simulate(mode, target);
        expect(r.productId, `${mode}/${target}`).toBe(target);
        expect(BY_ID[r.productId]).toBeDefined();
      }
    }
  });

  it('returns the real article number when scanning a label', () => {
    const r = simulate('article', 'lack-side-table');
    expect(r.kind).toBe('product');
    if (r.kind !== 'product') throw new Error('wrong kind');
    expect(r.code).toBe(BY_ID['lack-side-table'].article);
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it('ranks photo alternatives below the match and inside the same category', () => {
    for (const target of DEMO_TARGETS) {
      const r = simulate('box', target);
      if (r.kind !== 'product') throw new Error('wrong kind');
      for (const alt of r.alternatives) {
        expect(alt.productId).not.toBe(target);
        expect(alt.confidence).toBeLessThan(r.confidence);
        expect(BY_ID[alt.productId].category, alt.productId).toBe(BY_ID[target].category);
      }
    }
  });

  it('resolves a manual page to a step that exists in that product’s guide', () => {
    for (const target of DEMO_TARGETS) {
      const r = simulate('manual', target);
      if (r.kind !== 'step') throw new Error('wrong kind');
      const guide = getGuide(target);
      if (!guide) continue;
      expect(r.stepIndex, target).toBeGreaterThanOrEqual(0);
      expect(r.stepIndex, target).toBeLessThan(guide.steps.length);
      expect(guide.steps[r.stepIndex]).toBeDefined();
    }
  });

  it('names real hardware and a step that actually consumes it', () => {
    for (const target of DEMO_TARGETS) {
      const r = simulate('hardware', target);
      if (r.kind !== 'hardware') throw new Error('wrong kind');
      expect(r.items.length, target).toBeGreaterThan(0);
      for (const item of r.items) {
        expect(HARDWARE[item.hardwareId], item.hardwareId).toBeDefined();
        expect(item.qty).toBeGreaterThan(0);
        expect(item.confidence).toBeGreaterThan(0);
        expect(item.confidence).toBeLessThanOrEqual(1);
      }
      if (r.neededStep !== undefined) {
        const guide = getGuide(target);
        expect(guide?.steps[r.neededStep], `${target} step ${r.neededStep}`).toBeDefined();
      }
    }
  });

  it('keeps confidence a valid probability in every mode', () => {
    for (const mode of MODE_ORDER) {
      for (const target of DEMO_TARGETS) {
        const r = simulate(mode, target);
        if (r.kind === 'hardware') continue;
        expect(r.confidence).toBeGreaterThan(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it('falls back to a real product rather than crashing on an unknown target', () => {
    const r = simulate('article', 'does-not-exist');
    expect(BY_ID[r.productId]).toBeDefined();
  });
});

describe('fromBarcode', () => {
  it('decodes every product’s EAN to that product', () => {
    for (const p of PRODUCTS) {
      const r = fromBarcode(p.ean);
      expect(r, p.id).toBeDefined();
      expect(r!.productId).toBe(p.id);
    }
  });

  it('returns undefined for a barcode that is not in the catalogue', () => {
    expect(fromBarcode('0000000000000')).toBeUndefined();
    expect(fromBarcode('not-a-barcode')).toBeUndefined();
  });
});

describe('duration formatting', () => {
  it('formats minutes and seconds', () => {
    expect(fmtDuration(0)).toBe('0:00');
    expect(fmtDuration(9)).toBe('0:09');
    expect(fmtDuration(65)).toBe('1:05');
    expect(fmtDuration(600)).toBe('10:00');
  });

  it('rolls over to hours past sixty minutes', () => {
    expect(fmtDuration(3600)).toBe('1h 00m');
    expect(fmtDuration(5400)).toBe('1h 30m');
  });

  it('never renders a negative clock', () => {
    expect(fmtDuration(-30)).toBe('0:00');
  });

  it('shortens for summary tiles', () => {
    expect(fmtShort(600)).toBe('10m');
    expect(fmtShort(5400)).toBe('1.5h');
  });
});
