import { create } from 'zustand';

export type SessionMode = 'digital' | 'paper';

export type Session = {
  id: string;
  productId: string;
  mode: SessionMode;
  startedAt: number;
  finishedAt?: number;
  /** Wall-clock seconds spent in the build screen. */
  elapsedSec: number;
  /** Seconds spent on each step, index-aligned with the guide. */
  stepTimes: number[];
  completed: boolean;
};

export type Progress = { step: number; updatedAt: number };

/** A build in the web app's guide (see src/data/webGuides.ts), as reported by the page. */
export type WebProgress = { step: number; total: number; name: string; updatedAt: number };

type State = {
  /** In-progress builds, keyed by product id. */
  progress: Record<string, Progress>;
  /** In-progress web-guide builds, keyed by the web app's product id. */
  webProgress: Record<string, WebProgress>;
  setWebProgress: (webId: string, p: Omit<WebProgress, 'updatedAt'>) => void;
  clearWebProgress: (webId: string) => void;
  /** Most recently opened product ids, newest first. */
  recents: string[];
  sessions: Session[];
  /** The session currently being recorded, if any. */
  active?: { id: string; productId: string; mode: SessionMode; startedAt: number; stepTimes: number[] };

  touchProduct: (productId: string) => void;
  setProgress: (productId: string, step: number) => void;
  clearProgress: (productId: string) => void;

  startSession: (productId: string, mode: SessionMode) => void;
  recordStep: (index: number, seconds: number) => void;
  finishSession: (completed: boolean, elapsedSec: number) => void;
  discardSession: () => void;

  /**
   * Points per millimetre, from the bank-card calibration. Undefined until the
   * user calibrates; real-size drawings are labelled "not to scale" until then.
   */
  ptPerMm?: number;
  calibrate: (ptPerMm: number) => void;

  /** Wizard-of-Oz voice settings, set by the facilitator. */
  voice: { banner: boolean; failAtStep?: number };
  setVoice: (v: Partial<State['voice']>) => void;

  resetDemo: () => void;
};

const now = () => Date.now();
const id = () => `s_${Math.random().toString(36).slice(2, 9)}`;

const DAY = 86_400_000;

/**
 * Pre-recorded sessions so Study mode has something to compare on first launch.
 * Paper-manual runs are the control condition in MONTERA's user study; digital
 * runs are the same products built with the 3D guide.
 */
const seedSessions = (): Session[] => [
  {
    id: 'seed_1',
    productId: 'lack-side-table',
    mode: 'paper',
    startedAt: now() - DAY * 6,
    finishedAt: now() - DAY * 6 + 494_000,
    elapsedSec: 494,
    stepTimes: [62, 171, 155, 106],
    completed: true,
  },
  {
    id: 'seed_2',
    productId: 'lack-side-table',
    mode: 'digital',
    startedAt: now() - DAY * 6 + 3_600_000,
    finishedAt: now() - DAY * 6 + 3_600_000 + 288_000,
    elapsedSec: 288,
    stepTimes: [34, 101, 88, 65],
    completed: true,
  },
  {
    id: 'seed_3',
    productId: 'kallax-2x2',
    mode: 'paper',
    startedAt: now() - DAY * 4,
    finishedAt: now() - DAY * 4 + 1_908_000,
    elapsedSec: 1908,
    stepTimes: [210, 318, 402, 266, 288, 284, 140],
    completed: true,
  },
  {
    id: 'seed_4',
    productId: 'kallax-2x2',
    mode: 'digital',
    startedAt: now() - DAY * 3,
    finishedAt: now() - DAY * 3 + 1_301_000,
    elapsedSec: 1301,
    stepTimes: [118, 192, 241, 174, 203, 236, 137],
    completed: true,
  },
  {
    id: 'seed_5',
    productId: 'billy-bookcase',
    mode: 'digital',
    startedAt: now() - DAY * 1,
    finishedAt: now() - DAY * 1 + 2_044_000,
    elapsedSec: 2044,
    stepTimes: [166, 238, 171, 162, 287, 408, 612],
    completed: true,
  },
];

export const useApp = create<State>((set, get) => ({
  // No seeded build in progress: Continue only ever shows a build someone really started (the study build is HUTTEN).
  progress: {},
  recents: ['billy-bookcase', 'lack-side-table', 'kallax-2x2'],
  sessions: seedSessions(),
  active: undefined,
  ptPerMm: undefined,
  voice: { banner: true, failAtStep: undefined },

  webProgress: {},
  setWebProgress: (webId, p) => set((st) => ({ webProgress: { ...st.webProgress, [webId]: { ...p, updatedAt: now() } } })),
  clearWebProgress: (webId) =>
    set((st) => {
      const next = { ...st.webProgress };
      delete next[webId];
      return { webProgress: next };
    }),

  calibrate: (ptPerMm) => set({ ptPerMm }),
  setVoice: (v) => set((st) => ({ voice: { ...st.voice, ...v } })),

  touchProduct: (productId) =>
    set((st) => ({ recents: [productId, ...st.recents.filter((r) => r !== productId)].slice(0, 8) })),

  setProgress: (productId, step) =>
    set((st) => ({ progress: { ...st.progress, [productId]: { step, updatedAt: now() } } })),

  clearProgress: (productId) =>
    set((st) => {
      const next = { ...st.progress };
      delete next[productId];
      return { progress: next };
    }),

  startSession: (productId, mode) =>
    set({ active: { id: id(), productId, mode, startedAt: now(), stepTimes: [] } }),

  recordStep: (index, seconds) =>
    set((st) => {
      if (!st.active) return st;
      const stepTimes = st.active.stepTimes.slice();
      // Re-visiting a step accumulates rather than overwrites.
      stepTimes[index] = (stepTimes[index] ?? 0) + Math.round(seconds);
      return { active: { ...st.active, stepTimes } };
    }),

  finishSession: (completed, elapsedSec) => {
    const a = get().active;
    if (!a) return;
    const session: Session = {
      id: a.id,
      productId: a.productId,
      mode: a.mode,
      startedAt: a.startedAt,
      finishedAt: now(),
      elapsedSec: Math.round(elapsedSec),
      stepTimes: a.stepTimes.map((n) => n ?? 0),
      completed,
    };
    set((st) => ({ sessions: [session, ...st.sessions], active: undefined }));
  },

  discardSession: () => set({ active: undefined }),

  resetDemo: () =>
    set({
      progress: {},
      webProgress: {},
      recents: ['billy-bookcase', 'lack-side-table', 'kallax-2x2'],
      sessions: seedSessions(),
      active: undefined,
    }),
}));

/** `754` -> `12:34`. */
export const fmtDuration = (totalSec: number) => {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

export const fmtShort = (totalSec: number) => {
  const m = Math.round(totalSec / 60);
  return m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`;
};
