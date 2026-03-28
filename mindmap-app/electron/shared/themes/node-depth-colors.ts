import type { NodeStyle, Theme } from '../types';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export const NODE_DEPTH_COLOR_HUE_STEP = 30;
const FALLBACK_ROOT_BACKGROUND = '#4f46e5';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseHexColor(color: string): Rgb | null {
  const hex = color.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  const expanded = hex.length === 3
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: Rgb): string {
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function rgbToHsl(rgb: Rgb): Hsl {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
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

function hslToRgb(hsl: Hsl): Rgb {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = clamp(hsl.s, 0, 100) / 100;
  const l = clamp(hsl.l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h < 60) {
    rPrime = c;
    gPrime = x;
  } else if (h < 120) {
    rPrime = x;
    gPrime = c;
  } else if (h < 180) {
    gPrime = c;
    bPrime = x;
  } else if (h < 240) {
    gPrime = x;
    bPrime = c;
  } else if (h < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

function resolveRootBackgroundColor(rootBackgroundColor: string | undefined): string {
  if (!rootBackgroundColor) {
    return FALLBACK_ROOT_BACKGROUND;
  }
  return parseHexColor(rootBackgroundColor) ? rootBackgroundColor : FALLBACK_ROOT_BACKGROUND;
}

export function getNodeDepthBackgroundColor(
  rootBackgroundColor: string | undefined,
  depth: number,
  hueStep: number = NODE_DEPTH_COLOR_HUE_STEP
): string {
  const safeDepth = Math.max(0, Math.floor(depth));
  const safeHueStep = Number.isFinite(hueStep) ? hueStep : NODE_DEPTH_COLOR_HUE_STEP;
  const rootBackground = resolveRootBackgroundColor(rootBackgroundColor);
  const rootRgb = parseHexColor(rootBackground);
  if (!rootRgb) {
    return FALLBACK_ROOT_BACKGROUND;
  }

  if (safeDepth === 0) {
    return rgbToHex(rootRgb);
  }

  const rootHsl = rgbToHsl(rootRgb);
  return rgbToHex(hslToRgb({
    h: (rootHsl.h + safeDepth * safeHueStep) % 360,
    s: rootHsl.s,
    l: rootHsl.l,
  }));
}

export function getDepthAwareNodeThemeStyle(theme: Theme, depth: number, hasChildren: boolean): NodeStyle {
  const baseStyle = depth === 0
    ? theme.rootNode
    : (hasChildren ? theme.branchNode : theme.leafNode);
  const rootBackground = theme.rootNode.backgroundColor
    ?? baseStyle.backgroundColor
    ?? FALLBACK_ROOT_BACKGROUND;

  return {
    ...baseStyle,
    backgroundColor: getNodeDepthBackgroundColor(rootBackground, depth),
  };
}
