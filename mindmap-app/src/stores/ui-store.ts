import { create } from 'zustand';

type SidebarTab = 'editor' | 'theme' | 'layout';

interface UiStore {
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  shortcutsHelpOpen: boolean;
  exportDialogOpen: boolean;
  lastExportFormat: 'markdown' | 'svg' | 'png';
  lastPngScalePercent: number;
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleShortcutsHelp: () => void;
  toggleExportDialog: () => void;
  setLastExportFormat: (format: 'markdown' | 'svg' | 'png') => void;
  setLastPngScalePercent: (percent: number) => void;
}

const STORAGE_KEY_LAST_EXPORT_FORMAT = 'mindmap:lastExportFormat';
const STORAGE_KEY_LAST_PNG_SCALE = 'mindmap:lastPngScalePercent';

function getStoredLastExportFormat(): 'markdown' | 'svg' | 'png' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LAST_EXPORT_FORMAT);
    if (stored === 'markdown' || stored === 'svg' || stored === 'png') {
      return stored;
    }
  } catch {
    // Ignore errors
  }
  return 'png'; // Default
}

function getStoredLastPngScalePercent(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LAST_PNG_SCALE);
    const parsed = parseInt(stored ?? '', 10);
    if (Number.isFinite(parsed) && parsed >= 50 && parsed <= 400) {
      return parsed;
    }
  } catch {
    // Ignore errors
  }
  return 100; // Default
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  sidebarTab: 'editor',
  shortcutsHelpOpen: false,
  exportDialogOpen: false,
  lastExportFormat: getStoredLastExportFormat(),
  lastPngScalePercent: getStoredLastPngScalePercent(),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  toggleShortcutsHelp: () => set((s) => ({ shortcutsHelpOpen: !s.shortcutsHelpOpen })),
  toggleExportDialog: () => set((s) => ({ exportDialogOpen: !s.exportDialogOpen })),
  setLastExportFormat: (format) => {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_EXPORT_FORMAT, format);
    } catch {
      // Ignore errors
    }
    set({ lastExportFormat: format });
  },
  setLastPngScalePercent: (percent) => {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_PNG_SCALE, String(percent));
    } catch {
      // Ignore errors
    }
    set({ lastPngScalePercent: percent });
  },
}));
