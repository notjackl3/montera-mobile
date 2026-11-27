/**
 * MONTERA design tokens.
 *
 * Ported from the web app's DESIGN.md, which derives from IKEA.com tokens and
 * the IKEA paper manual. The system is deliberately flat: no shadows, no blur,
 * separation by hairlines and colour blocks only.
 *
 * Blue is the primary action. Yellow marks the current step and warnings — it
 * never carries body text, because text on yellow must be ink.
 */

const canvas = '#FFFEFB';
const ink = '#111111';
const inkSoft = '#484848';
const hairline = '#DADADA';
const blue = '#0058A3';
const yellow = '#FFDB00';

export const colors = {
  /** Page and 3D background. */
  canvas,
  ink,
  inkSoft,
  hairline,

  bg: canvas,
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F5',
  surfacePressed: '#EDEDED',
  border: hairline,
  borderBright: '#BFBFBF',

  text: ink,
  textDim: inkSoft,
  /** Lightest text that still clears AA on canvas. */
  textFaint: '#767676',
  onDark: canvas,

  /** Primary action. */
  blue,
  blueHover: '#004F93',
  blueDim: '#E7EFF7',

  /** Current step marker and warnings only. */
  accent: yellow,
  accentHover: '#FFF094',
  accentDim: '#FFF8CC',
  /** Text placed on yellow. */
  accentText: ink,

  success: '#1E7B34',
  successDim: '#E8F3EB',
  warn: '#8A6100',
  warnDim: '#FFF4CC',
  danger: '#BA2318',
  dangerDim: '#FBEAE8',

  /**
   * 3D and thumbnail finishes. The manual line-drawing look means parts are
   * canvas-white with ink edges regardless of the real product finish, so these
   * are near-white faces rather than wood tones.
   */
  mat: {
    panel: '#FFFFFF',
    panelWhite: '#FFFFFF',
    panelBlack: '#F2F1EE',
    panelOak: '#FFFFFF',
    panelWalnut: '#F2F1EE',
    panelGrey: '#F7F7F6',
    metal: '#F0F0F0',
    metalDark: '#E8E8E8',
    back: '#FAF9F6',
    glass: '#F4F8FA',
    fabric: '#F6F6F3',
  },

  /** Edge colours for the line-drawing 3D style. */
  edge: {
    normal: ink,
    active: blue,
    pending: '#C4C4C4',
  },

  /** Scrim over the camera feed, so overlay panels stay readable. */
  scrim: 'rgba(17,17,17,0.45)',
  panelOnCamera: 'rgba(255,254,251,0.97)',
} as const;

export type FinishKey = keyof typeof colors.mat;

export const space = (n: number) => n * 4;

/** Panels are 8 px; buttons and icon buttons are pills. */
export const radius = {
  sm: 4,
  md: 8,
  lg: 8,
  xl: 12,
  pill: 999,
} as const;

/** Noto Sans in two weights only, per DESIGN.md. */
export const font = {
  regular: 'NotoSans_400Regular',
  bold: 'NotoSans_700Bold',
} as const;

export const type = {
  display: { fontSize: 26, fontFamily: font.bold, letterSpacing: -1.1 },
  title: { fontSize: 19, fontFamily: font.bold, letterSpacing: -0.5 },
  heading: { fontSize: 15, fontFamily: font.bold, letterSpacing: -0.2 },
  body: { fontSize: 14, fontFamily: font.regular },
  small: { fontSize: 12, fontFamily: font.regular },
  micro: { fontSize: 11, fontFamily: font.bold, letterSpacing: 0.6 },
  mono: { fontSize: 13, fontFamily: 'Menlo', letterSpacing: 0.4 },
} as const;

/** Flat by design — kept so call sites read intentionally, not accidentally. */
export const FLAT = {} as const;
