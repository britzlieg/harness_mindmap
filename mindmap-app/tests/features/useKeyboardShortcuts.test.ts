import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts';
import { useMindmapStore } from '../../src/stores/mindmap-store';
import { useCanvasStore } from '../../src/stores/canvas-store';

function createKeyDownEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    useMindmapStore.setState({
      nodes: [
        {
          id: 'root',
          parentId: null,
          text: 'Root',
          note: '',
          labels: [],
          tags: [],
          priority: 0,
          progress: 0,
          style: {},
          isFolded: false,
          positionX: null,
          positionY: null,
          orderIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: [],
        },
      ],
      undoStack: [],
      redoStack: [],
      metadata: null,
      filePath: null,
    });
    useCanvasStore.setState({ selectedNodeId: null, scale: 1, offsetX: 0, offsetY: 0 });
  });

  it('binds keydown event listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('Ctrl+Z calls undo', () => {
    const undoSpy = vi.spyOn(useMindmapStore.getState(), 'undo');
    renderHook(() => useKeyboardShortcuts());
    window.dispatchEvent(createKeyDownEvent('z', { ctrlKey: true }));
    expect(undoSpy).toHaveBeenCalled();
    undoSpy.mockRestore();
  });

  it('Ctrl+Y calls redo', () => {
    const redoSpy = vi.spyOn(useMindmapStore.getState(), 'redo');
    renderHook(() => useKeyboardShortcuts());
    window.dispatchEvent(createKeyDownEvent('y', { ctrlKey: true }));
    expect(redoSpy).toHaveBeenCalled();
    redoSpy.mockRestore();
  });

  it('Tab calls addNode on selected node', () => {
    useCanvasStore.setState({ selectedNodeId: 'root' });
    const addSpy = vi.spyOn(useMindmapStore.getState(), 'addNode');
    renderHook(() => useKeyboardShortcuts());
    window.dispatchEvent(createKeyDownEvent('Tab'));
    expect(addSpy).toHaveBeenCalledWith('root', '');
    addSpy.mockRestore();
  });

  it('Delete calls deleteNode for non-root node', () => {
    useMindmapStore.getState().addNode('root', 'Child');
    const childId = useMindmapStore.getState().nodes[0].children![0].id;
    useCanvasStore.setState({ selectedNodeId: childId });
    const deleteSpy = vi.spyOn(useMindmapStore.getState(), 'deleteNode');
    const deselectSpy = vi.spyOn(useCanvasStore.getState(), 'deselectAll');
    renderHook(() => useKeyboardShortcuts());
    window.dispatchEvent(createKeyDownEvent('Delete'));
    expect(deleteSpy).toHaveBeenCalledWith(childId);
    expect(deselectSpy).toHaveBeenCalled();
    deleteSpy.mockRestore();
    deselectSpy.mockRestore();
  });

  it('does not delete root node', () => {
    useCanvasStore.setState({ selectedNodeId: 'root' });
    const deleteSpy = vi.spyOn(useMindmapStore.getState(), 'deleteNode');
    renderHook(() => useKeyboardShortcuts());
    window.dispatchEvent(createKeyDownEvent('Delete'));
    expect(deleteSpy).not.toHaveBeenCalled();
    deleteSpy.mockRestore();
  });

  it('Space toggles fold on selected node', () => {
    useCanvasStore.setState({ selectedNodeId: 'root' });
    const foldSpy = vi.spyOn(useMindmapStore.getState(), 'toggleFold');
    renderHook(() => useKeyboardShortcuts());
    window.dispatchEvent(createKeyDownEvent(' '));
    expect(foldSpy).toHaveBeenCalledWith('root');
    foldSpy.mockRestore();
  });

  it('does not trigger shortcuts when typing in an input', () => {
    useMindmapStore.getState().addNode('root', 'Child');
    const childId = useMindmapStore.getState().nodes[0].children![0].id;
    useCanvasStore.setState({ selectedNodeId: childId });
    const deleteSpy = vi.spyOn(useMindmapStore.getState(), 'deleteNode');
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(createKeyDownEvent('Delete'));

    expect(deleteSpy).not.toHaveBeenCalled();
    deleteSpy.mockRestore();
    input.remove();
  });
});
