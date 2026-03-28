import type { Theme } from '../types';
export {
  NODE_DEPTH_COLOR_HUE_STEP,
  getNodeDepthBackgroundColor,
  getDepthAwareNodeThemeStyle,
} from './node-depth-colors';

export const themes: Record<string, Theme> = {
  default: {
    name: 'Default',
    canvas: {
      background: '#ffffff',
      gridColor: '#f0f0f0',
    },
    rootNode: {
      backgroundColor: '#4f46e5',
      textColor: '#ffffff',
      borderColor: '#4338ca',
      borderRadius: 8,
      fontSize: 16,
      fontWeight: 700,
      padding: 12,
    },
    branchNode: {
      backgroundColor: '#818cf8',
      textColor: '#ffffff',
      borderColor: '#6366f1',
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      padding: 10,
    },
    leafNode: {
      backgroundColor: '#e0e7ff',
      textColor: '#3730a3',
      borderColor: '#c7d2fe',
      borderRadius: 4,
      fontSize: 13,
      fontWeight: 400,
      padding: 8,
    },
    connection: {
      color: '#a5b4fc',
      width: 2,
      style: 'solid',
    },
    ui: {
      inputBackground: '#dbeafe',
      inputBorder: '#93c5fd',
      inputFocusRing: '#2563eb',
      windowControlBackground: '#4f46e5',
      windowControlCloseBackground: '#dc2626',
    },
  },
  dark: {
    name: 'Dark',
    canvas: {
      background: '#1e1e2e',
      gridColor: '#313244',
    },
    rootNode: {
      backgroundColor: '#cba6f7',
      textColor: '#1e1e2e',
      borderColor: '#b4befe',
      borderRadius: 8,
      fontSize: 16,
      fontWeight: 700,
      padding: 12,
    },
    branchNode: {
      backgroundColor: '#89b4fa',
      textColor: '#1e1e2e',
      borderColor: '#74c7ec',
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      padding: 10,
    },
    leafNode: {
      backgroundColor: '#313244',
      textColor: '#cdd6f4',
      borderColor: '#45475a',
      borderRadius: 4,
      fontSize: 13,
      fontWeight: 400,
      padding: 8,
    },
    connection: {
      color: '#6c7086',
      width: 2,
      style: 'solid',
    },
    ui: {
      inputBackground: '#1f2937',
      inputBorder: '#4b5563',
      inputFocusRing: '#a78bfa',
      windowControlBackground: '#374151',
      windowControlCloseBackground: '#ef4444',
    },
  },
  ocean: {
    name: 'Ocean',
    canvas: {
      background: '#f0f9ff',
      gridColor: '#e0f2fe',
    },
    rootNode: {
      backgroundColor: '#0284c7',
      textColor: '#ffffff',
      borderColor: '#0369a1',
      borderRadius: 8,
      fontSize: 16,
      fontWeight: 700,
      padding: 12,
    },
    branchNode: {
      backgroundColor: '#38bdf8',
      textColor: '#0c4a6e',
      borderColor: '#0ea5e9',
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      padding: 10,
    },
    leafNode: {
      backgroundColor: '#e0f2fe',
      textColor: '#075985',
      borderColor: '#bae6fd',
      borderRadius: 4,
      fontSize: 13,
      fontWeight: 400,
      padding: 8,
    },
    connection: {
      color: '#7dd3fc',
      width: 2,
      style: 'solid',
    },
    ui: {
      inputBackground: '#dbeafe',
      inputBorder: '#7dd3fc',
      inputFocusRing: '#0284c7',
      windowControlBackground: '#0369a1',
      windowControlCloseBackground: '#e11d48',
    },
  },
  forest: {
    name: 'Forest',
    canvas: {
      background: '#f0fdf4',
      gridColor: '#dcfce7',
    },
    rootNode: {
      backgroundColor: '#16a34a',
      textColor: '#ffffff',
      borderColor: '#15803d',
      borderRadius: 8,
      fontSize: 16,
      fontWeight: 700,
      padding: 12,
    },
    branchNode: {
      backgroundColor: '#4ade80',
      textColor: '#14532d',
      borderColor: '#22c55e',
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      padding: 10,
    },
    leafNode: {
      backgroundColor: '#dcfce7',
      textColor: '#166534',
      borderColor: '#bbf7d0',
      borderRadius: 4,
      fontSize: 13,
      fontWeight: 400,
      padding: 8,
    },
    connection: {
      color: '#86efac',
      width: 2,
      style: 'solid',
    },
    ui: {
      inputBackground: '#dcfce7',
      inputBorder: '#86efac',
      inputFocusRing: '#15803d',
      windowControlBackground: '#166534',
      windowControlCloseBackground: '#dc2626',
    },
  },
  sunset: {
    name: 'Sunset',
    canvas: {
      background: '#fff7ed',
      gridColor: '#ffedd5',
    },
    rootNode: {
      backgroundColor: '#ea580c',
      textColor: '#ffffff',
      borderColor: '#c2410c',
      borderRadius: 8,
      fontSize: 16,
      fontWeight: 700,
      padding: 12,
    },
    branchNode: {
      backgroundColor: '#fb923c',
      textColor: '#7c2d12',
      borderColor: '#f97316',
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      padding: 10,
    },
    leafNode: {
      backgroundColor: '#ffedd5',
      textColor: '#9a3412',
      borderColor: '#fed7aa',
      borderRadius: 4,
      fontSize: 13,
      fontWeight: 400,
      padding: 8,
    },
    connection: {
      color: '#fdba74',
      width: 2,
      style: 'solid',
    },
    ui: {
      inputBackground: '#ffedd5',
      inputBorder: '#fdba74',
      inputFocusRing: '#ea580c',
      windowControlBackground: '#c2410c',
      windowControlCloseBackground: '#dc2626',
    },
  },
};

export function normalizeThemeName(name: unknown): string {
  if (typeof name !== 'string') {
    return 'default';
  }

  return Object.prototype.hasOwnProperty.call(themes, name) ? name : 'default';
}

export function getTheme(name: string): Theme {
  return themes[normalizeThemeName(name)];
}

export const themeNames = Object.keys(themes) as string[];
