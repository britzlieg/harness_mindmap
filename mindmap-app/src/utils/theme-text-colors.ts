import type { Theme } from '../types';

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

export interface ThemeTextPalette {
  primary: string;
  secondary: string;
  disabled: string;
  accent: string;
  surface: string;
}

const SAFE_LIGHT = '#f8fafc';
const SAFE_DARK = '#0f172a';

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

function parseRgbColor(color: string): Rgb | null {
  const match = color.trim().match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    return null;
  }

  return {
    r: clamp(Number.parseInt(match[1], 10), 0, 255),
    g: clamp(Number.parseInt(match[2], 10), 0, 255),
    b: clamp(Number.parseInt(match[3], 10), 0, 255),
  };
}

function parseColor(color: string): Rgb | null {
  return parseHexColor(color) ?? parseRgbColor(color);
}

function rgbToHex(rgb: Rgb): string {
  const asHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${asHex(rgb.r)}${asHex(rgb.g)}${asHex(rgb.b)}`;
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

function blendColors(first: Rgb, second: Rgb, firstWeight: number): Rgb {
  const w = clamp(firstWeight, 0, 1);
  return {
    r: Math.round(first.r * w + second.r * (1 - w)),
    g: Math.round(first.g * w + second.g * (1 - w)),
    b: Math.round(first.b * w + second.b * (1 - w)),
  };
}

function channelToLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: Rgb): number {
  const r = channelToLinear(color.r);
  const g = channelToLinear(color.g);
  const b = channelToLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(firstHex: string, secondHex: string): number {
  const first = parseColor(firstHex) ?? parseColor(SAFE_LIGHT)!;
  const second = parseColor(secondHex) ?? parseColor(SAFE_DARK)!;
  const l1 = relativeLuminance(first);
  const l2 = relativeLuminance(second);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureContrast(candidateHex: string, backgroundHex: string, minRatio: number): string {
  const candidate = parseColor(candidateHex);
  const background = parseColor(backgroundHex);

  if (!candidate || !background) {
    return minRatio >= 4 ? SAFE_LIGHT : SAFE_DARK;
  }

  if (contrastRatio(candidateHex, backgroundHex) >= minRatio) {
    return candidateHex;
  }

  const bgLuminance = relativeLuminance(background);
  const candidateHsl = rgbToHsl(candidate);
  const targetLight = bgLuminance < 0.45 ? SAFE_LIGHT : SAFE_DARK;
  const target = parseColor(targetLight)!;
  const targetHsl = rgbToHsl(target);

  for (let i = 0; i <= 12; i++) {
    const factor = i / 12;
    const mixed = hslToRgb({
      h: candidateHsl.h,
      s: candidateHsl.s * (1 - factor) + targetHsl.s * factor,
      l: candidateHsl.l * (1 - factor) + targetHsl.l * factor,
    });
    const mixedHex = rgbToHex(mixed);
    if (contrastRatio(mixedHex, backgroundHex) >= minRatio) {
      return mixedHex;
    }
  }

  return targetLight;
}

export function resolveThemeTextPalette(theme: Theme): ThemeTextPalette {
  const backgroundHex = theme.leafNode.backgroundColor
    ?? theme.canvas.background
    ?? '#f8fafc';
  const accentHex = theme.rootNode.backgroundColor
    ?? theme.connection.color
    ?? '#2563eb';
  const background = parseColor(backgroundHex) ?? parseColor('#f8fafc')!;
  const accent = parseColor(accentHex) ?? parseColor('#2563eb')!;
  const bgLuminance = relativeLuminance(background);
  const isDarkSurface = bgLuminance < 0.45;
  const accentHsl = rgbToHsl(accent);

  // Reduce text saturation under high-saturation themes to avoid glare.
  const compensatedSaturation = accentHsl.s > 72
    ? clamp(accentHsl.s * 0.42, 18, 58)
    : clamp(accentHsl.s * 0.58, 14, 62);

  const primaryCandidate = rgbToHex(hslToRgb({
    h: (accentHsl.h + 180) % 360,
    s: compensatedSaturation,
    l: isDarkSurface ? 90 : 18,
  }));

  const accentCandidate = rgbToHex(hslToRgb({
    h: (accentHsl.h + (isDarkSurface ? 28 : -24) + 360) % 360,
    s: clamp(compensatedSaturation + 10, 18, 68),
    l: isDarkSurface ? 82 : 26,
  }));

  const primary = ensureContrast(primaryCandidate, backgroundHex, 4.5);
  const secondary = ensureContrast(
    rgbToHex(blendColors(parseColor(primary)!, background, 0.78)),
    backgroundHex,
    3.3
  );
  const disabled = ensureContrast(
    rgbToHex(blendColors(parseColor(secondary)!, background, 0.62)),
    backgroundHex,
    2.6
  );
  const accentText = ensureContrast(accentCandidate, backgroundHex, 4.5);

  return {
    primary,
    secondary,
    disabled,
    accent: accentText,
    surface: backgroundHex,
  };
}
