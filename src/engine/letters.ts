import { HARDWARE } from '@/data/hardware';
import type { Hardware, Product, Step } from '@/data/types';
import { partsFor } from './pose';

/**
 * Part letters.
 *
 * Six-digit fitting codes meant nothing to study participants, so every
 * fitting gets a letter instead, the way the paper manual's parts page does.
 * Letters follow the order of `product.hardware` (the order of the bag), unless
 * the product fixes them itself (HUTTEN letters its panels A to C, so its
 * fittings start at D).
 */
export function lettersFor(product: Product): Record<string, string> {
  if (product.hardwareLetters) return { ...product.hardwareLetters };
  const out: Record<string, string> = {};
  product.hardware.forEach((line, i) => {
    out[line.id] = letterAt(i);
  });
  return out;
}

/** 0 -> A, 25 -> Z, 26 -> AA. More than 26 fittings is not expected. */
export function letterAt(i: number): string {
  const A = 'A'.charCodeAt(0);
  return i < 26 ? String.fromCharCode(A + i) : letterAt(Math.floor(i / 26) - 1) + letterAt(i % 26);
}

/**
 * Replace `{hw:<id>}` tokens in step text with the fitting's letter in
 * brackets: "Drive a screw {hw:screw50} in" -> "Drive a screw (A) in".
 * An unknown id renders as nothing rather than leaking the token.
 */
export function fillLetters(text: string, letters: Record<string, string>): string {
  return text
    .replace(/\s*\{hw:([A-Za-z0-9_-]+)\}/g, (_, id: string) => (letters[id] ? ` (${letters[id]})` : ''))
    .replace(/\s+([.,;:])/g, '$1');
}

/** Hardware ids referenced by `{hw:...}` tokens. */
export function tokenIds(text: string): string[] {
  return [...text.matchAll(/\{hw:([A-Za-z0-9_-]+)\}/g)].map((m) => m[1]);
}

export type BagLine = {
  hardware: Hardware;
  letter: string;
  /** How many the whole build uses. */
  qty: number;
  /** How many this step uses, or 0. */
  stepQty: number;
};

/**
 * The parts bag for a product: every fitting with its letter, the ones the
 * current step needs listed first, otherwise in bag order.
 */
export function bagFor(product: Product, step?: Step): BagLine[] {
  const letters = lettersFor(product);
  const lines = product.hardware
    .map((line, order) => {
      const h = HARDWARE[line.id];
      if (!h) return undefined;
      const stepQty = step?.hardware.find((l) => l.id === line.id)?.qty ?? 0;
      return { hardware: h, letter: letters[line.id] ?? '?', qty: line.qty, stepQty, order };
    })
    .filter((x): x is BagLine & { order: number } => x !== undefined);
  lines.sort((a, b) => Number(b.stepQty > 0) - Number(a.stepQty > 0) || a.order - b.order);
  return lines.map(({ order: _order, ...rest }) => rest);
}

/**
 * Fittings in the same bag that are easy to confuse with `id`: same glyph,
 * both with a known length, lengths within 15 mm. Closest first.
 */
export function lookalikes(product: Product, id: string): Hardware[] {
  const me = HARDWARE[id];
  if (!me?.lengthMm) return [];
  return product.hardware
    .map((l) => HARDWARE[l.id])
    .filter(
      (h): h is Hardware =>
        !!h && h.id !== id && h.glyph === me.glyph && !!h.lengthMm && Math.abs(h.lengthMm - me.lengthMm!) <= 15,
    )
    .sort((a, b) => Math.abs(a.lengthMm! - me.lengthMm!) - Math.abs(b.lengthMm! - me.lengthMm!));
}

export type PanelGroup = { name: string; count: number; letter?: string };

/**
 * Panels and pieces for the parts list, the way the manual's first page shows
 * them: "Leg ×4" rather than Leg 1..4. A product with part letters (HUTTEN)
 * lists only its lettered parts; unlettered pieces are sub-parts of one of
 * them (a ready-made shelf's rails and rods are one part C).
 */
export function panelGroups(product: Product): PanelGroup[] {
  const groups = new Map<string, PanelGroup>();
  const lettered = product.partLetters;
  for (const part of partsFor(product)) {
    const letter = lettered?.[part.id];
    if (lettered && !letter) continue;
    const name = part.name.replace(/\s+\d+(-\d+)?$/, '').trim();
    const key = letter ?? name;
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { name, count: 1, letter });
  }
  return [...groups.values()].sort((a, b) => (a.letter ?? '~').localeCompare(b.letter ?? '~'));
}
