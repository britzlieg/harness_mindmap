import { describe, expect, it } from 'vitest';
import { themes } from '../../src/themes';
import type { Theme } from '../../src/types';
import { contrastRatio, resolveThemeTextPalette } from '../../src/utils/theme-text-colors';

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

describe('theme-text-colors', () => {
  it('resolves semantic text palette for built-in themes', () => {
    for (const theme of Object.values(themes)) {
      const palette = resolveThemeTextPalette(theme);
      expect(palette.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.secondary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.disabled).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('keeps readable contrast against resolved menu/sidebar surface', () => {
    for (const theme of Object.values(themes)) {
      const palette = resolveThemeTextPalette(theme);
      expect(contrastRatio(palette.primary, palette.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.secondary, palette.surface)).toBeGreaterThanOrEqual(3.3);
      expect(contrastRatio(palette.disabled, palette.surface)).toBeGreaterThanOrEqual(2.6);
      expect(contrastRatio(palette.accent, palette.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('applies high-saturation compensation for aggressive accent themes', () => {
    const aggressiveTheme: Theme = {
      name: 'Aggressive',
      canvas: { background: '#0f172a', gridColor: '#1e293b' },
      rootNode: { backgroundColor: '#ff0033', textColor: '#ffffff' },
      branchNode: { backgroundColor: '#ffd600', textColor: '#111111' },
      leafNode: { backgroundColor: '#111827', textColor: '#f8fafc' },
      connection: { color: '#ff007f', width: 2, style: 'solid' },
    };

    const palette = resolveThemeTextPalette(aggressiveTheme);
    const primaryHsl = hexToHsl(palette.primary);
    expect(primaryHsl.s).toBeLessThanOrEqual(62);
    expect(contrastRatio(palette.primary, palette.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
