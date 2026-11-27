import { HARDWARE } from '@/data/hardware';
import type { Product, Step } from '@/data/types';
import { fillLetters, lettersFor } from './letters';
import { partsFor } from './pose';

/**
 * Build-screen rules, kept free of React so they run under vitest.
 *
 * Mentor feedback drove most of this: friction belongs on the few steps that
 * cause errors (80/20), and undo is a state-mapping problem, so the app has to
 * say which way it is going at every moment.
 */

/** A step with a warning is a critical step. Everything else flows. */
export const isCritical = (step: Step) => !!step.warning;

export const allTicked = (step: Step, ticked: boolean[] | undefined) =>
  (step.checks ?? []).every((_, i) => !!ticked?.[i]);

export type NextInput = {
  step: Step;
  /** Ticks for this step's checks, index-aligned. */
  ticked?: boolean[];
  /** Next was already pressed once on this step with checks open. */
  nudged: boolean;
};

/**
 * What pressing Next does. Ordinary steps always advance. A critical step with
 * open checks holds the first press (the checks turn red where they are); the
 * second press goes on anyway. There is no hidden hold-to-skip gesture.
 */
export function nextOutcome({ step, ticked, nudged }: NextInput): 'advance' | 'hold' {
  if (!isCritical(step) || (step.checks ?? []).length === 0) return 'advance';
  if (allTicked(step, ticked) || nudged) return 'advance';
  return 'hold';
}

/** Whether the checks should be drawn red right now. */
export const checksAlert = (input: NextInput) =>
  input.nudged && isCritical(input.step) && !allTicked(input.step, input.ticked);

export function primaryLabel(input: NextInput & { last: boolean }): string {
  const alert = checksAlert(input);
  if (input.last) return alert ? 'Finish anyway' : 'Finish';
  return alert ? 'Next anyway' : 'Next';
}

// ---------------------------------------------------------------------- undo

/**
 * Which steps to take apart, in order, to get back to `target`, starting from
 * `current` (both 0-based, `current` included: the user has started it).
 *
 * For this prototype that is every step from the current one back to the
 * chosen one. A real build has a dependency graph (removing a shelf does not
 * need the back panel off); replace this with a walk of that graph once steps
 * declare what they depend on.
 */
export function planUndo(current: number, target: number): number[] {
  if (target < 0 || target > current) return [];
  const out: number[] = [];
  for (let i = current; i >= target; i--) out.push(i);
  return out;
}

const plural = (n: number, word: string) => (n === 1 ? word : /s$/.test(word) ? word : `${word}s`);

/** "Take off: leg ×2. Remove: 2 long screws (A)." unless the step says better. */
export function undoText(product: Product, step: Step): string {
  const letters = lettersFor(product);
  if (step.undo) return fillLetters(step.undo, letters);

  const names = new Map<string, number>();
  const byId = new Map(partsFor(product).map((p) => [p.id, p.name]));
  for (const id of step.parts) {
    const name = (byId.get(id) ?? id).replace(/\s+\d+(-\d+)?$/, '').trim();
    names.set(name, (names.get(name) ?? 0) + 1);
  }
  const partBits = [...names].map(([n, c]) => (c > 1 ? `${n.toLowerCase()} ×${c}` : n.toLowerCase()));
  const fitBits = step.hardware
    .map((l) => {
      const h = HARDWARE[l.id];
      if (!h) return undefined;
      const name = (h.short ?? h.name).toLowerCase();
      return `${l.qty} ${plural(l.qty, name)}${letters[l.id] ? ` (${letters[l.id]})` : ''}`;
    })
    .filter(Boolean);

  const out: string[] = [];
  if (partBits.length) out.push(`Take off: ${partBits.join(', ')}.`);
  if (fitBits.length) out.push(`Remove: ${fitBits.join(', ')}.`);
  if (!out.length) out.push(`Reverse this step: ${step.title.charAt(0).toLowerCase()}${step.title.slice(1)}.`);
  return out.join(' ');
}

/**
 * A warning for steps that can damage the furniture when taken apart:
 * anything threaded, nailed or cam-locked into the board.
 */
export function undoCaution(step: Step): string | undefined {
  const glyphs = new Set(step.hardware.map((l) => HARDWARE[l.id]?.glyph));
  if (glyphs.has('camlock'))
    return 'Turn each cam lock back a half turn before you pull. Forcing it tears the panel.';
  if (glyphs.has('screw') || glyphs.has('camstud')) return 'Back the screw out slowly; the thread strips easily.';
  if (glyphs.has('nail')) return 'Lever the nails out slowly and straight. The board tears if you twist.';
  return undefined;
}

/** The undo action bar names the transition, never "Done" or "Next". */
export function undoActionLabel(stepIndex: number): string {
  return stepIndex === 0 ? 'Step 1 undone, back to the start' : `Step ${stepIndex + 1} undone, back to step ${stepIndex}`;
}

export type UndoState = {
  /** Steps still to take apart, in order. The head is on screen. */
  queue: number[];
  /** The step the user said went wrong. */
  target: number;
  /** How many there were in total, for "2 of 3". */
  total: number;
};

export function startUndo(current: number, target: number): UndoState | undefined {
  const queue = planUndo(current, target);
  return queue.length ? { queue, target, total: queue.length } : undefined;
}

/**
 * Mark the head of the queue undone. Returns the next undo state, or `done`
 * with the step to rebuild from (the one that went wrong).
 */
export function advanceUndo(u: UndoState): { next: UndoState } | { done: number } {
  const queue = u.queue.slice(1);
  return queue.length ? { next: { ...u, queue } } : { done: u.target };
}

/** "Undoing: step 3 · 2 of 3 to take apart". */
export function undoBanner(u: UndoState): string {
  const at = u.total - u.queue.length + 1;
  return `Undoing step ${u.queue[0] + 1} · ${at} of ${u.total} to take apart`;
}

export const backOnTrack = (target: number) => `Back on track. Redo step ${target + 1}.`;
