import { useEffect, useCallback } from 'react';
import { useMindmapStore } from '../stores/mindmap-store';
import { useCanvasStore } from '../stores/canvas-store';
import { useUiStore } from '../stores/ui-store';

export function useKeyboardShortcuts() {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const tagName = target?.tagName?.toLowerCase();
    const isTypingTarget = !!target && (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.isContentEditable
    );
    if (isTypingTarget) return;

    const mindmap = useMindmapStore.getState();
    const canvas = useCanvasStore.getState();
    const ui = useUiStore.getState();
    const selectedId = canvas.selectedNodeId;
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); mindmap.undo(); return; }
    if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); mindmap.redo(); return; }
    if (isCtrl && e.key === 's') { e.preventDefault(); return; }
    if (isCtrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); canvas.zoomIn(); return; }
    if (isCtrl && e.key === '-') { e.preventDefault(); canvas.zoomOut(); return; }
    if (isCtrl && e.key === '0') { e.preventDefault(); canvas.resetZoom(); return; }
    if (e.key === '?' && !isCtrl) { e.preventDefault(); ui.toggleShortcutsHelp(); return; }

    if (!selectedId) return;

    if (e.key === 'Tab') { e.preventDefault(); mindmap.addNode(selectedId, ''); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId !== mindmap.nodes[0]?.id) {
        e.preventDefault(); mindmap.deleteNode(selectedId); canvas.deselectAll();
      }
      return;
    }
    if (e.key === ' ') { e.preventDefault(); mindmap.toggleFold(selectedId); return; }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
