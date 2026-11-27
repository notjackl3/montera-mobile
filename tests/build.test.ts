import { describe, expect, it } from 'vitest';

import { GUIDES } from '@/data/guides';
import { BY_ID } from '@/data/products';
import type { Step } from '@/data/types';
import {
  advanceUndo,
  backOnTrack,
  checksAlert,
  isCritical,
  nextOutcome,
  planUndo,
  primaryLabel,
  startUndo,
  undoActionLabel,
  undoBanner,
  undoCaution,
  undoText,
} from '@/engine/build';

const ordinary: Step = { id: 'o', title: 'Easy', detail: 'Do the easy thing.', parts: [], hardware: [], seconds: 10, checks: ['Done'] };
const critical: Step = { ...ordinary, id: 'c', warning: 'Watch out.', checks: ['A', 'B'] };

describe('Next on ordinary and critical steps', () => {
  it('lets an ordinary step through in one tap, ticked or not', () => {
    expect(nextOutcome({ step: ordinary, nudged: false })).toBe('advance');
    expect(primaryLabel({ step: ordinary, nudged: false, last: false })).toBe('Next');
  });

  it('holds the first Next on a critical step with open checks', () => {
    expect(nextOutcome({ step: critical, ticked: [true, false], nudged: false })).toBe('hold');
  });

  it('turns the checks red and relabels the button after that hold', () => {
    const input = { step: critical, ticked: [true, false], nudged: true };
    expect(checksAlert(input)).toBe(true);
    expect(primaryLabel({ ...input, last: false })).toBe('Next anyway');
    expect(primaryLabel({ ...input, last: true })).toBe('Finish anyway');
  });

  it('goes on at the second press', () => {
    expect(nextOutcome({ step: critical, ticked: [], nudged: true })).toBe('advance');
  });

  it('goes straight on once every check is ticked', () => {
    expect(nextOutcome({ step: critical, ticked: [true, true], nudged: false })).toBe('advance');
    const input = { step: critical, ticked: [true, true], nudged: true };
    expect(checksAlert(input)).toBe(false);
    expect(primaryLabel({ ...input, last: false })).toBe('Next');
  });

  it('does not hold a critical step that has no checks', () => {
    expect(nextOutcome({ step: { ...critical, checks: [] }, nudged: false })).toBe('advance');
  });
});

describe('guide authoring rules', () => {
  it('gives every step one or two checks', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      for (const step of guide.steps) {
        // The optional stacking step is the one exception: it may be skipped.
        if (step.id === 'hutten-9') continue;
        expect(step.checks?.length ?? 0, `${id}/${step.id}`).toBeGreaterThanOrEqual(1);
        expect(step.checks!.length, `${id}/${step.id}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('keeps critical steps rare: under half of any guide', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      const n = guide.steps.filter(isCritical).length;
      expect(n, id).toBeLessThan(guide.steps.length / 2);
    }
  });

  it('gives every critical step checks to hold on', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      for (const step of guide.steps.filter(isCritical)) expect(step.checks?.length, `${id}/${step.id}`).toBeGreaterThan(0);
    }
  });

  it('marks the HUTTEN steps the team named as critical', () => {
    const critical = GUIDES['hutten-wine-rack'].steps.filter(isCritical).map((s) => s.id);
    expect(critical).toEqual(['hutten-1', 'hutten-3']);
  });
});

describe('undo planning', () => {
  it('walks back from the current step to the chosen one, inclusive', () => {
    // On step 4, step 2 went wrong: take apart 4, then 3, then 2.
    expect(planUndo(3, 1)).toEqual([3, 2, 1]);
  });

  it('undoes just the current step when that is the one', () => {
    expect(planUndo(2, 2)).toEqual([2]);
  });

  it('refuses a target ahead of the current step', () => {
    expect(planUndo(1, 3)).toEqual([]);
    expect(startUndo(1, 3)).toBeUndefined();
  });

  it('runs the queue one step at a time and lands on the step to redo', () => {
    let u = startUndo(3, 1)!;
    const seen: number[] = [];
    const labels: string[] = [];
    for (;;) {
      seen.push(u.queue[0]);
      labels.push(undoActionLabel(u.queue[0]));
      const r = advanceUndo(u);
      if ('done' in r) {
        expect(r.done).toBe(1);
        break;
      }
      u = r.next;
    }
    expect(seen).toEqual([3, 2, 1]);
    expect(labels).toEqual([
      'Step 4 undone, back to step 3',
      'Step 3 undone, back to step 2',
      'Step 2 undone, back to step 1',
    ]);
    expect(backOnTrack(1)).toBe('Back on track. Redo step 2.');
  });

  it('never labels the undo action Done or Next', () => {
    for (let i = 0; i < 10; i++) expect(undoActionLabel(i)).not.toMatch(/\b(done|next)\b/i);
  });

  it('says where it is in the walk back', () => {
    const u = startUndo(3, 1)!;
    expect(undoBanner(u)).toBe('Undoing step 4 · 1 of 3 to take apart');
    const r = advanceUndo(u);
    expect('next' in r && undoBanner(r.next)).toBe('Undoing step 3 · 2 of 3 to take apart');
  });
});

describe('undo text', () => {
  it('generates take-off text from parts and fittings, with letters', () => {
    const p = BY_ID['kallax-2x2'];
    const step = GUIDES[p.id].steps[1];
    expect(undoText(p, step)).toBe('Take off: left side panel. Remove: 4 wood dowels (A), 4 cam studs (C).');
  });

  it('groups repeated parts', () => {
    const p = BY_ID['billy-bookcase'];
    expect(undoText(p, GUIDES[p.id].steps[4])).toMatch(/^Take off: shelf ×4\./);
  });

  it('prefers the authored undo text, letters filled in', () => {
    const p = BY_ID['hutten-wine-rack'];
    expect(undoText(p, GUIDES[p.id].steps[3])).toBe('Back the four screws (D) out of this frame.');
  });

  it('has something to say for every step of every guide', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      for (const step of guide.steps) expect(undoText(BY_ID[id], step).length, `${id}/${step.id}`).toBeGreaterThan(10);
    }
  });

  it('warns before undoing threaded, nailed or cam-locked steps', () => {
    const lack = GUIDES['lack-side-table'].steps;
    expect(undoCaution(lack[1])).toBe('Back the screw out slowly; the thread strips easily.');
    expect(undoCaution(GUIDES['billy-bookcase'].steps[2])).toMatch(/cam lock/);
    expect(undoCaution(GUIDES['billy-bookcase'].steps[5])).toMatch(/nails/);
    expect(undoCaution(lack[0])).toBeUndefined();
    // Cam studs are threaded, not locked: the screw warning, not the cam lock one.
    expect(undoCaution(GUIDES['billy-bookcase'].steps[1])).toMatch(/thread strips/);
  });
});
