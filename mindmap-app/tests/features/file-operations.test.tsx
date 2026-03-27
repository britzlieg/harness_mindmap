import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MainToolbar } from '../../src/components/Toolbar/MainToolbar';
import { useFileOperations } from '../../src/hooks/useFileOperations';
import { useMindmapStore } from '../../src/stores/mindmap-store';
import { useCanvasStore } from '../../src/stores/canvas-store';
import { useUiStore } from '../../src/stores/ui-store';
import type { FileMetadata, Node } from '../../src/types';
import { TOOLBAR_TEXT } from '../../src/constants/ui-text';

function createMetadata(): FileMetadata {
  return {
    title: 'Test',
    rootTopicId: 'root-1',
    layoutType: 'mindmap',
    theme: 'default',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

function createNode(text: string = 'Root'): Node {
  return {
    id: 'root-1',
    parentId: null,
    text,
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
  };
}

describe('file operations', () => {
  const fileCreate = vi.fn();
  const fileOpen = vi.fn();
  const fileSave = vi.fn();
  const fileSaveAs = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (window as any).electronAPI = {
      file: {
        create: fileCreate,
        open: fileOpen,
        save: fileSave,
        saveAs: fileSaveAs,
      },
    };

    useMindmapStore.setState({
      nodes: [createNode()],
      metadata: createMetadata(),
      filePath: 'C:/tmp/current.mindmap',
      undoStack: [],
      redoStack: [],
    });
    useCanvasStore.setState({
      selectedNodeId: null,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
    useUiStore.setState({
      sidebarOpen: true,
      sidebarTab: 'editor',
      shortcutsHelpOpen: false,
      exportDialogOpen: false,
    });
  });

  it('triggers new and save from toolbar actions', async () => {
    const metadata = createMetadata();
    const openedMetadata = { ...metadata, title: 'Opened' };
    const openedNodes = [createNode('Opened Root')];
    fileCreate.mockResolvedValue({ filePath: 'C:/tmp/new.mindmap', metadata, nodes: [] });
    fileOpen.mockResolvedValue({
      filePath: 'C:/tmp/opened.mindmap',
      metadata: openedMetadata,
      nodes: openedNodes,
    });
    fileSave.mockResolvedValue(undefined);

    render(<MainToolbar />);

    fireEvent.click(screen.getByRole('button', { name: TOOLBAR_TEXT.new }));
    await waitFor(() => expect(fileCreate).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: TOOLBAR_TEXT.open }));
    await waitFor(() => expect(fileOpen).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useMindmapStore.getState().filePath).toBe('C:/tmp/opened.mindmap'));
    expect(useMindmapStore.getState().metadata?.title).toBe('Opened');
    expect(useMindmapStore.getState().nodes[0].text).toBe('Opened Root');

    fireEvent.click(screen.getByRole('button', { name: TOOLBAR_TEXT.save }));
    await waitFor(() => expect(fileSave).toHaveBeenCalledTimes(1));
  });

  it('triggers new/open/save from keyboard shortcuts', async () => {
    const metadata = createMetadata();
    const openedMetadata = { ...metadata, title: 'Shortcut Opened' };
    fileCreate.mockResolvedValue({
      filePath: 'C:/tmp/new-from-shortcut.mindmap',
      metadata,
      nodes: [createNode('Loaded')],
    });
    fileOpen.mockResolvedValue({
      filePath: 'C:/tmp/opened-from-shortcut.mindmap',
      metadata: openedMetadata,
      nodes: [createNode('Opened By Shortcut')],
    });
    fileSave.mockResolvedValue(undefined);

    renderHook(() => useFileOperations());

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    await waitFor(() => expect(fileCreate).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'o',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    await waitFor(() => expect(fileOpen).toHaveBeenCalledTimes(1));

    useMindmapStore.setState({
      filePath: 'C:/tmp/new-from-shortcut.mindmap',
      metadata,
      nodes: [createNode('Loaded')],
    });

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    await waitFor(() => expect(fileSave).toHaveBeenCalledTimes(1));
  });

  it('skips save safely when active file context is missing', async () => {
    fileSave.mockResolvedValue(undefined);
    fileSaveAs.mockResolvedValue('C:/tmp/from-save-as.mindmap');
    useMindmapStore.setState({ filePath: null, metadata: null });
    renderHook(() => useFileOperations());

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));

    await waitFor(() => expect(fileSaveAs).not.toHaveBeenCalled());
    await waitFor(() => expect(fileSave).not.toHaveBeenCalled());
  });

  it('falls back to Save As when file path is missing', async () => {
    const metadata = createMetadata();
    const nodes = [createNode('To Save')];
    useMindmapStore.setState({ filePath: null, metadata, nodes });
    fileSaveAs.mockResolvedValue('C:/tmp/from-save-as.mindmap');
    fileSave.mockResolvedValue(undefined);
    renderHook(() => useFileOperations());

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));

    await waitFor(() => expect(fileSaveAs).toHaveBeenCalledWith({ nodes, metadata }));
    await waitFor(() => expect(fileSave).toHaveBeenCalledWith(
      'C:/tmp/from-save-as.mindmap',
      { nodes, metadata }
    ));
    expect(useMindmapStore.getState().filePath).toBe('C:/tmp/from-save-as.mindmap');
  });

  it('sanitizes empty node text before save', async () => {
    const metadata = createMetadata();
    const nodes = [createNode('   ')];
    useMindmapStore.setState({ filePath: 'C:/tmp/sanitize.mindmap', metadata, nodes });
    fileSave.mockResolvedValue(undefined);
    renderHook(() => useFileOperations());

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));

    await waitFor(() => expect(fileSave).toHaveBeenCalledTimes(1));
    const savedPayload = fileSave.mock.calls[0][1] as { nodes: Node[]; metadata: FileMetadata };
    expect(savedPayload.nodes[0].text.trim().length).toBeGreaterThan(0);
  });

  it('keeps current document unchanged when open fails', async () => {
    const initialState = useMindmapStore.getState();
    fileOpen.mockRejectedValue(new Error('broken file'));
    renderHook(() => useFileOperations());

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'o',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));

    await waitFor(() => expect(fileOpen).toHaveBeenCalledTimes(1));
    expect(useMindmapStore.getState().filePath).toBe(initialState.filePath);
    expect(useMindmapStore.getState().metadata).toEqual(initialState.metadata);
    expect(useMindmapStore.getState().nodes).toEqual(initialState.nodes);
  });
});
