import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '../../src/stores/ui-store';

describe('ui-store', () => {
  beforeEach(() => {
    useUiStore.setState({
      sidebarOpen: true,
      sidebarTab: 'editor',
      shortcutsHelpOpen: false,
      exportDialogOpen: false,
    });
  });

  it('should have correct default state', () => {
    const state = useUiStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.sidebarTab).toBe('editor');
    expect(state.shortcutsHelpOpen).toBe(false);
    expect(state.exportDialogOpen).toBe(false);
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebarOpen', () => {
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(false);
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('setSidebarTab', () => {
    it('should set sidebarTab to theme', () => {
      useUiStore.getState().setSidebarTab('theme');
      expect(useUiStore.getState().sidebarTab).toBe('theme');
    });

    it('should set sidebarTab to layout', () => {
      useUiStore.getState().setSidebarTab('layout');
      expect(useUiStore.getState().sidebarTab).toBe('layout');
    });

    it('should set sidebarTab to editor', () => {
      useUiStore.setState({ sidebarTab: 'theme' });
      useUiStore.getState().setSidebarTab('editor');
      expect(useUiStore.getState().sidebarTab).toBe('editor');
    });
  });

  describe('toggleShortcutsHelp', () => {
    it('should toggle shortcutsHelpOpen', () => {
      useUiStore.getState().toggleShortcutsHelp();
      expect(useUiStore.getState().shortcutsHelpOpen).toBe(true);
      useUiStore.getState().toggleShortcutsHelp();
      expect(useUiStore.getState().shortcutsHelpOpen).toBe(false);
    });
  });

  describe('toggleExportDialog', () => {
    it('should toggle exportDialogOpen', () => {
      useUiStore.getState().toggleExportDialog();
      expect(useUiStore.getState().exportDialogOpen).toBe(true);
      useUiStore.getState().toggleExportDialog();
      expect(useUiStore.getState().exportDialogOpen).toBe(false);
    });
  });
});
