import { create } from 'zustand';

type SidebarTab = 'editor' | 'theme' | 'layout';

interface UiStore {
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  shortcutsHelpOpen: boolean;
  exportDialogOpen: boolean;
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleShortcutsHelp: () => void;
  toggleExportDialog: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  sidebarTab: 'editor',
  shortcutsHelpOpen: false,
  exportDialogOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  toggleShortcutsHelp: () => set((s) => ({ shortcutsHelpOpen: !s.shortcutsHelpOpen })),
  toggleExportDialog: () => set((s) => ({ exportDialogOpen: !s.exportDialogOpen })),
}));
