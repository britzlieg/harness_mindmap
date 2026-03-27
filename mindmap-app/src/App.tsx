import { Component, CSSProperties, ReactNode, useEffect, useMemo } from 'react';
import { MindMapCanvas } from './components/Canvas/MindMapCanvas';
import { MainToolbar } from './components/Toolbar/MainToolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ShortcutsHelp } from './components/Dialogs/ShortcutsHelp';
import { ExportDialog } from './components/Dialogs/ExportDialog';
import { WindowChrome } from './components/Window/WindowChrome';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileOperations } from './hooks/useFileOperations';
import { useAutoSave } from './hooks/useAutoSave';
import { useMindmapStore } from './stores/mindmap-store';
import { getTheme, normalizeThemeName } from './themes';
import { resolveThemeTextPalette } from './utils/theme-text-colors';

type AppThemeStyle = CSSProperties & Record<`--${string}`, string>;

function hexToRgba(color: string, alpha: number): string {
  const normalized = color.trim();
  if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(normalized)) {
    const hex = normalized.slice(1);
    const expanded = hex.length === 3
      ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
      : hex;
    const r = Number.parseInt(expanded.slice(0, 2), 16);
    const g = Number.parseInt(expanded.slice(2, 4), 16);
    const b = Number.parseInt(expanded.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-boundary">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="ui-button ui-button--primary"
          >Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  useKeyboardShortcuts();
  useFileOperations();
  useAutoSave();
  const metadata = useMindmapStore((s) => s.metadata);

  useEffect(() => {
    const store = useMindmapStore.getState();
    if (store.nodes.length === 0 && !store.metadata && !store.filePath) {
      store.initializeDocument();
    }
  }, []);

  const activeTheme = getTheme(normalizeThemeName(metadata?.theme));
  const appThemeStyle = useMemo<AppThemeStyle>(() => {
    const accent = activeTheme.rootNode.backgroundColor ?? '#22d3ee';
    const accentStrong = activeTheme.branchNode.backgroundColor ?? accent;
    const textPalette = resolveThemeTextPalette(activeTheme);
    const baseSurface = activeTheme.leafNode.backgroundColor ?? activeTheme.canvas.background ?? '#0f172a';
    const inputBase = activeTheme.ui?.inputBackground ?? activeTheme.leafNode.backgroundColor ?? baseSurface;
    const inputBorder = activeTheme.ui?.inputBorder ?? activeTheme.connection.color ?? '#94a3b8';
    const inputFocus = activeTheme.ui?.inputFocusRing ?? accent;
    const windowControlBase = activeTheme.ui?.windowControlBackground ?? activeTheme.branchNode.backgroundColor ?? baseSurface;
    const windowControlClose = activeTheme.ui?.windowControlCloseBackground ?? '#ef4444';

    return {
      '--ui-color-bg-0': activeTheme.canvas.background,
      '--ui-color-bg-1': hexToRgba(activeTheme.canvas.background, 0.92),
      '--ui-color-bg-2': hexToRgba(activeTheme.canvas.background, 0.84),
      '--ui-color-surface': hexToRgba(activeTheme.leafNode.backgroundColor ?? '#ffffff', 0.78),
      '--ui-color-surface-strong': hexToRgba(activeTheme.branchNode.backgroundColor ?? '#ffffff', 0.9),
      '--ui-color-surface-soft': hexToRgba(activeTheme.leafNode.backgroundColor ?? '#ffffff', 0.62),
      '--ui-color-overlay': hexToRgba(activeTheme.canvas.background, 0.58),
      '--ui-color-border': hexToRgba(activeTheme.connection.color ?? '#94a3b8', 0.35),
      '--ui-color-border-strong': hexToRgba(activeTheme.connection.color ?? '#94a3b8', 0.52),
      '--ui-color-text': textPalette.primary,
      '--ui-color-text-muted': textPalette.secondary,
      '--ui-color-text-primary': textPalette.primary,
      '--ui-color-text-secondary': textPalette.secondary,
      '--ui-color-text-disabled': textPalette.disabled,
      '--ui-color-text-accent': textPalette.accent,
      '--ui-color-text-accent-border': hexToRgba(textPalette.accent, 0.6),
      '--ui-color-text-accent-soft': hexToRgba(textPalette.accent, 0.18),
      '--ui-button-glass-bg': hexToRgba(baseSurface, 0.46),
      '--ui-button-glass-bg-hover': hexToRgba(baseSurface, 0.58),
      '--ui-button-glass-bg-active': hexToRgba(baseSurface, 0.4),
      '--ui-button-glass-bg-disabled': hexToRgba(baseSurface, 0.28),
      '--ui-button-glass-border': hexToRgba(activeTheme.connection.color ?? '#94a3b8', 0.55),
      '--ui-button-glass-border-hover': hexToRgba(activeTheme.connection.color ?? '#94a3b8', 0.72),
      '--ui-button-glass-shadow': `0 8px 20px ${hexToRgba(baseSurface, 0.28)}`,
      '--ui-button-glass-shadow-hover': `0 12px 26px ${hexToRgba(baseSurface, 0.34)}`,
      '--ui-input-bg': hexToRgba(inputBase, 0.56),
      '--ui-input-bg-focus': hexToRgba(inputBase, 0.72),
      '--ui-input-border': hexToRgba(inputBorder, 0.58),
      '--ui-input-border-focus': hexToRgba(inputFocus, 0.74),
      '--ui-input-text': textPalette.primary,
      '--ui-input-placeholder': hexToRgba(textPalette.secondary, 0.88),
      '--ui-window-control-bg': hexToRgba(windowControlBase, 0.5),
      '--ui-window-control-bg-hover': hexToRgba(windowControlBase, 0.66),
      '--ui-window-control-border': hexToRgba(activeTheme.connection.color ?? '#94a3b8', 0.58),
      '--ui-window-control-symbol': textPalette.primary,
      '--ui-window-control-close-bg': hexToRgba(windowControlClose, 0.56),
      '--ui-window-control-close-bg-hover': hexToRgba(windowControlClose, 0.74),
      '--ui-color-accent': accent,
      '--ui-color-accent-strong': accentStrong,
      '--ui-shadow-focus': `0 0 0 2px ${hexToRgba(accent, 0.46)}`,
    };
  }, [activeTheme]);

  return (
    <div
      className="app-root"
      data-theme={normalizeThemeName(metadata?.theme)}
      style={appThemeStyle}
    >
      <WindowChrome />
      <MainToolbar />
      <div className="app-main">
        <div className="app-canvas-region"><MindMapCanvas /></div>
        <Sidebar />
      </div>
      <ShortcutsHelp />
      <ExportDialog />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
