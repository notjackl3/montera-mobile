import { BY_ID } from '@/data/products';
import type { Product } from '@/data/types';
import type { Session } from '@/store/useApp';

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type PairedProduct = {
  product: Product;
  paperSec: number;
  digitalSec: number;
  /** Percent faster the 3D guide was; negative means slower. */
  savedPct: number;
};

export type StudySummary = {
  paired: PairedProduct[];
  /** Sessions backing each condition, restricted to paired products. */
  paperSessions: Session[];
  digitalSessions: Session[];
  meanPaperSec: number;
  meanDigitalSec: number;
  /** Percent faster the 3D guide was overall; negative means slower. */
  deltaPct: number;
};

/**
 * Compare the paper manual against the 3D guide.
 *
 * Only products built under *both* conditions count. Pooling every session
 * instead lets a product that was only ever built one way drag its condition's
 * mean around — with the seeded data that inverted the headline, reporting the
 * 3D guide as marginally slower while every individual product was 30-40%
 * faster.
 */
export function summarise(sessions: Session[]): StudySummary {
  const completed = sessions.filter((s) => s.completed);

  const paired: PairedProduct[] = [...new Set(completed.map((s) => s.productId))]
    .map((id) => {
      const product = BY_ID[id];
      const paperSec = mean(
        completed.filter((s) => s.productId === id && s.mode === 'paper').map((s) => s.elapsedSec),
      );
      const digitalSec = mean(
        completed.filter((s) => s.productId === id && s.mode === 'digital').map((s) => s.elapsedSec),
      );
      return {
        product,
        paperSec,
        digitalSec,
        savedPct: paperSec > 0 ? ((paperSec - digitalSec) / paperSec) * 100 : 0,
      };
    })
    .filter((x) => x.product && x.paperSec > 0 && x.digitalSec > 0);

  const pairedIds = new Set(paired.map((x) => x.product.id));
  const meanPaperSec = mean(paired.map((x) => x.paperSec));
  const meanDigitalSec = mean(paired.map((x) => x.digitalSec));

  return {
    paired,
    paperSessions: completed.filter((s) => s.mode === 'paper' && pairedIds.has(s.productId)),
    digitalSessions: completed.filter((s) => s.mode === 'digital' && pairedIds.has(s.productId)),
    meanPaperSec,
    meanDigitalSec,
    deltaPct: meanPaperSec > 0 ? ((meanPaperSec - meanDigitalSec) / meanPaperSec) * 100 : 0,
  };
}
