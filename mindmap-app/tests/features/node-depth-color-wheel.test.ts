import { describe, expect, it } from 'vitest';
import { getNodeDepthBackgroundColor, NODE_DEPTH_COLOR_HUE_STEP } from '../../src/themes';

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl {
  const normalized = hex.replace('#', '');
  const fullHex = normalized.length === 3
    ? `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`
    : normalized;
  const r = Number.parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(fullHex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  if (delta > 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

describe('node depth color wheel', () => {
  it('uses root color as depth-0 background', () => {
    const rootColor = '#4f46e5';
    expect(getNodeDepthBackgroundColor(rootColor, 0)).toBe(rootColor);
  });

  it('keeps same-depth color deterministic and rotates adjacent depth by hue step', () => {
    const rootColor = '#0284c7';
    const depthOneA = getNodeDepthBackgroundColor(rootColor, 1);
    const depthOneB = getNodeDepthBackgroundColor(rootColor, 1);
    const depthTwo = getNodeDepthBackgroundColor(rootColor, 2);

    expect(depthOneA).toBe(depthOneB);
    expect(depthTwo).not.toBe(depthOneA);

    const depthOneHue = hexToHsl(depthOneA).h;
    const depthTwoHue = hexToHsl(depthTwo).h;
    const deltaHue = (depthTwoHue - depthOneHue + 360) % 360;

    expect(Math.abs(deltaHue - NODE_DEPTH_COLOR_HUE_STEP)).toBeLessThanOrEqual(1);
  });

  it('falls back to default root color for invalid input and negative depth', () => {
    expect(getNodeDepthBackgroundColor('bad-color', -4)).toBe('#4f46e5');
  });
});
