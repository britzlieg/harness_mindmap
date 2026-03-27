import { describe, it, expect } from 'vitest';
import { themes, getTheme, normalizeThemeName, themeNames } from '../../src/themes';
import type { Theme } from '../../src/types';

describe('themes', () => {
  const requiredThemeNames = ['default', 'dark', 'ocean', 'forest', 'sunset'];

  it('should export 5 themes', () => {
    expect(themeNames).toHaveLength(5);
    for (const name of requiredThemeNames) {
      expect(themes[name]).toBeDefined();
    }
  });

  it('each theme should have required properties', () => {
    for (const [key, theme] of Object.entries(themes)) {
      expect(theme.name, `${key} missing name`).toBeDefined();
      expect(theme.canvas, `${key} missing canvas`).toBeDefined();
      expect(theme.canvas.background, `${key} missing canvas.background`).toBeDefined();
      expect(theme.canvas.gridColor, `${key} missing canvas.gridColor`).toBeDefined();
      expect(theme.rootNode, `${key} missing rootNode`).toBeDefined();
      expect(theme.rootNode.backgroundColor, `${key} missing rootNode.backgroundColor`).toBeDefined();
      expect(theme.rootNode.textColor, `${key} missing rootNode.textColor`).toBeDefined();
      expect(theme.rootNode.borderRadius, `${key} missing rootNode.borderRadius`).toBeDefined();
      expect(theme.rootNode.fontSize, `${key} missing rootNode.fontSize`).toBeDefined();
      expect(theme.rootNode.fontWeight, `${key} missing rootNode.fontWeight`).toBeDefined();
      expect(theme.rootNode.padding, `${key} missing rootNode.padding`).toBeDefined();
      expect(theme.branchNode, `${key} missing branchNode`).toBeDefined();
      expect(theme.branchNode.backgroundColor, `${key} missing branchNode.backgroundColor`).toBeDefined();
      expect(theme.branchNode.textColor, `${key} missing branchNode.textColor`).toBeDefined();
      expect(theme.leafNode, `${key} missing leafNode`).toBeDefined();
      expect(theme.leafNode.backgroundColor, `${key} missing leafNode.backgroundColor`).toBeDefined();
      expect(theme.leafNode.textColor, `${key} missing leafNode.textColor`).toBeDefined();
      expect(theme.connection, `${key} missing connection`).toBeDefined();
      expect(theme.connection.color, `${key} missing connection.color`).toBeDefined();
      expect(theme.connection.width, `${key} missing connection.width`).toBeDefined();
      expect(theme.connection.style, `${key} missing connection.style`).toMatch(/solid|dashed/);
      expect(theme.ui, `${key} missing ui`).toBeDefined();
      expect(theme.ui?.inputBackground, `${key} missing ui.inputBackground`).toBeDefined();
      expect(theme.ui?.inputBorder, `${key} missing ui.inputBorder`).toBeDefined();
      expect(theme.ui?.inputFocusRing, `${key} missing ui.inputFocusRing`).toBeDefined();
      expect(theme.ui?.windowControlBackground, `${key} missing ui.windowControlBackground`).toBeDefined();
      expect(theme.ui?.windowControlCloseBackground, `${key} missing ui.windowControlCloseBackground`).toBeDefined();
    }
  });

  describe('getTheme', () => {
    it('should return the requested theme', () => {
      const theme = getTheme('dark');
      expect(theme.name).toBe('Dark');
    });

    it('should fall back to default for unknown names', () => {
      const theme = getTheme('nonexistent');
      expect(theme).toBe(themes.default);
    });

    it('should fall back to default for empty string', () => {
      const theme = getTheme('');
      expect(theme).toBe(themes.default);
    });
  });

  describe('normalizeThemeName', () => {
    it('should keep supported theme names', () => {
      expect(normalizeThemeName('dark')).toBe('dark');
    });

    it('should fall back to default for unsupported names', () => {
      expect(normalizeThemeName('unknown-theme')).toBe('default');
    });

    it('should fall back to default for non-string values', () => {
      expect(normalizeThemeName(undefined)).toBe('default');
    });
  });

  it('themeNames should list all available themes', () => {
    expect(themeNames).toEqual(expect.arrayContaining(requiredThemeNames));
    expect(themeNames).toHaveLength(requiredThemeNames.length);
  });
});
