import { describe, expect, it } from 'vitest';

import { GUIDES } from '@/data/guides';
import { HARDWARE } from '@/data/hardware';
import { BY_ID, PRODUCTS } from '@/data/products';
import { bagFor, fillLetters, letterAt, lettersFor, lookalikes, tokenIds } from '@/engine/letters';

describe('lettersFor', () => {
  it('letters fittings A, B, C in bag order', () => {
    const billy = BY_ID['billy-bookcase'];
    const letters = lettersFor(billy);
    expect(billy.hardware.map((l) => letters[l.id])).toEqual(
      billy.hardware.map((_, i) => String.fromCharCode(65 + i)),
    );
  });

  it('is stable: the same product always gets the same letters', () => {
    for (const p of PRODUCTS) expect(lettersFor(p)).toEqual(lettersFor(p));
  });

  it('gives every fitting in a product a unique letter', () => {
    for (const p of PRODUCTS) {
      const letters = Object.values(lettersFor(p));
      expect(new Set(letters).size, p.id).toBe(letters.length);
    }
  });

  it('covers every fitting a guide uses, in steps and in step text', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      const letters = lettersFor(BY_ID[id]);
      for (const step of guide.steps) {
        for (const line of step.hardware) expect(letters[line.id], `${id}/${step.id} ${line.id}`).toBeDefined();
        const text = [step.detail, step.warning, step.tip, step.undo, ...(step.checks ?? [])].join(' ');
        for (const t of tokenIds(text)) expect(letters[t], `${id}/${step.id} token ${t}`).toBeDefined();
      }
    }
  });

  it('uses HUTTEN’s fixed letters, which continue after the panels A to C', () => {
    const letters = lettersFor(BY_ID['hutten-wine-rack']);
    expect(letters).toEqual({ hutScrew: 'D', hutDowel: 'E' });
  });

  it('keeps fixed part letters clear of the fitting letters', () => {
    for (const p of PRODUCTS) {
      if (!p.partLetters) continue;
      const fit = new Set(Object.values(lettersFor(p)));
      for (const l of Object.values(p.partLetters)) expect(fit.has(l), `${p.id} ${l}`).toBe(false);
    }
  });

  it('counts past Z', () => {
    expect(letterAt(0)).toBe('A');
    expect(letterAt(25)).toBe('Z');
    expect(letterAt(26)).toBe('AA');
  });
});

describe('fillLetters', () => {
  it('replaces tokens with the letter in brackets', () => {
    expect(fillLetters('Drive a screw {hw:screw50} in.', { screw50: 'B' })).toBe('Drive a screw (B) in.');
  });

  it('drops unknown tokens rather than leaking them', () => {
    expect(fillLetters('Push dowels {hw:nope}.', {})).toBe('Push dowels.');
  });

  it('leaves no token or six-digit code in any rendered step text', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      const letters = lettersFor(BY_ID[id]);
      for (const step of guide.steps) {
        for (const t of [step.title, step.detail, step.warning, step.tip, step.undo, ...(step.checks ?? [])]) {
          if (!t) continue;
          const out = fillLetters(t, letters);
          expect(out, `${id}/${step.id}`).not.toMatch(/\{hw:/);
          expect(out, `${id}/${step.id}`).not.toMatch(/\b\d{6}\b/);
        }
      }
    }
  });
});

describe('step text length', () => {
  it('keeps every instruction to one or two short sentences', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      for (const step of guide.steps) {
        const sentences = step.detail.split(/(?<=[.!?])\s+/).filter(Boolean);
        expect(sentences.length, `${id}/${step.id}`).toBeLessThanOrEqual(2);
        expect(step.detail.length, `${id}/${step.id}`).toBeLessThanOrEqual(140);
      }
    }
  });
});

describe('bagFor', () => {
  it('lists every fitting once, current step first', () => {
    const p = BY_ID['billy-bookcase'];
    const step = GUIDES[p.id].steps[6];
    const bag = bagFor(p, step);
    expect(bag.map((b) => b.hardware.id).sort()).toEqual(p.hardware.map((l) => l.id).sort());
    const needed = bag.filter((b) => b.stepQty > 0).map((b) => b.hardware.id);
    expect(needed.sort()).toEqual(step.hardware.map((l) => l.id).sort());
    expect(bag.slice(0, needed.length).every((b) => b.stepQty > 0)).toBe(true);
  });

  it('keeps bag order without a step', () => {
    const p = BY_ID['kallax-2x2'];
    expect(bagFor(p).map((b) => b.hardware.id)).toEqual(p.hardware.map((l) => l.id));
  });
});

describe('look-alike fittings', () => {
  it('gives the study product a 20 mm and a 25 mm screw that compare to each other', () => {
    const p = BY_ID['billy-bookcase'];
    expect(HARDWARE.screw20.lengthMm).toBe(20);
    expect(HARDWARE.screw25.lengthMm).toBe(25);
    expect(lookalikes(p, 'screw20').map((h) => h.id)).toContain('screw25');
    expect(lookalikes(p, 'screw25').map((h) => h.id)).toContain('screw20');
  });

  it('only pairs fittings of the same kind', () => {
    for (const p of PRODUCTS) {
      for (const line of p.hardware) {
        for (const h of lookalikes(p, line.id)) expect(h.glyph).toBe(HARDWARE[line.id].glyph);
      }
    }
  });
});

import { panelGroups } from '@/engine/letters';

describe('panelGroups', () => {
  it('collapses numbered parts the way the manual does', () => {
    expect(panelGroups(BY_ID['lack-side-table'])).toEqual([
      { name: 'Table top', count: 1, letter: undefined },
      { name: 'Leg', count: 4, letter: undefined },
    ]);
  });

  it('lists HUTTEN as A post ×4, B loose rod ×4, C shelf ×3', () => {
    const g = panelGroups(BY_ID['hutten-wine-rack']);
    expect(g.map((x) => [x.letter, x.count])).toEqual([
      ['A', 4],
      ['B', 4],
      ['C', 3],
    ]);
  });
});
