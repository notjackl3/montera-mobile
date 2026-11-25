import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { colors, radius, type } from '@/ui/theme';

/** WCAG relative luminance. */
function luminance(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

describe('light theme contrast', () => {
  it('is a light theme: the canvas is near white', () => {
    expect(luminance(colors.canvas)).toBeGreaterThan(0.9);
    expect(colors.bg).toBe(colors.canvas);
  });

  it('clears AA for every text colour on canvas', () => {
    for (const key of ['text', 'textDim', 'textFaint', 'ink', 'inkSoft'] as const) {
      expect(contrast(colors[key], colors.canvas), key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('clears AA for link and status colours on canvas', () => {
    for (const key of ['blue', 'success', 'warn', 'danger'] as const) {
      expect(contrast(colors[key], colors.canvas), key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('clears AA for button labels on their fills', () => {
    expect(contrast(colors.onDark, colors.blue)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.ink, colors.canvas)).toBeGreaterThanOrEqual(4.5);
    // DESIGN.md: text on yellow is ink.
    expect(contrast(colors.accentText, colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(colors.accentText).toBe(colors.ink);
  });

  /**
   * This is the reason for the source check below: yellow on white is about
   * 1.5:1, nowhere near legible, which is why DESIGN.md reserves it for fills
   * and markers.
   */
  it('confirms yellow cannot carry text on canvas', () => {
    expect(contrast(colors.accent, colors.canvas)).toBeLessThan(3);
  });
});

describe('design system rules', () => {
  it('never uses yellow as a text or icon colour', () => {
    const offenders: string[] = [];
    for (const dir of ['src', 'app']) {
      for (const file of sourceFiles(path.resolve(dir))) {
        const body = readFileSync(file, 'utf8');
        for (const [i, line] of body.split('\n').entries()) {
          if (/color:\s*colors\.accent\b|color=\{colors\.accent\}/.test(line)) {
            offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}`);
          }
        }
      }
    }
    expect(offenders, 'yellow must not carry text or icons on white').toEqual([]);
  });

  it('keeps 3D and thumbnail faces near white for the line-drawing look', () => {
    for (const [name, hex] of Object.entries(colors.mat)) {
      expect(luminance(hex), `mat.${name}`).toBeGreaterThan(0.8);
    }
  });

  it('draws part edges in ink, blue when active and grey when pending', () => {
    expect(colors.edge.normal).toBe(colors.ink);
    expect(colors.edge.active).toBe(colors.blue);
    expect(contrast(colors.edge.pending, colors.canvas)).toBeLessThan(
      contrast(colors.edge.normal, colors.canvas),
    );
  });

  it('is flat: the theme exports no shadow tokens', async () => {
    const theme = await import('@/ui/theme');
    expect('shadow' in theme).toBe(false);
  });

  it('uses 8 px panels and pill buttons', () => {
    expect(radius.lg).toBe(8);
    expect(radius.pill).toBeGreaterThan(100);
  });

  it('uses Noto Sans in two weights only', () => {
    const families = Object.values(type)
      .map((t): string | undefined => ('fontFamily' in t ? t.fontFamily : undefined))
      .filter((f) => f !== undefined && f !== 'Menlo');
    expect(new Set(families)).toEqual(new Set(['NotoSans_400Regular', 'NotoSans_700Bold']));
  });

  it('declares no fontWeight, since weight comes from the loaded family', () => {
    for (const [name, t] of Object.entries(type)) {
      expect('fontWeight' in t, `type.${name}`).toBe(false);
    }
  });
});
