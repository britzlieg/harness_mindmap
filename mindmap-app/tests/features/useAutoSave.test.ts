import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAutoSave } from '../../src/hooks/useAutoSave';
import { useMindmapStore } from '../../src/stores/mindmap-store';
import type { FileMetadata, Node } from '../../src/types';

function createMetadata(): FileMetadata {
  return {
    title: 'AutoSave',
    rootTopicId: 'root',
    layoutType: 'mindmap',
    theme: 'default',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

function createNode(text: string): Node {
  return {
    id: 'root',
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

describe('useAutoSave', () => {
  const save = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    (window as any).electronAPI = {
      file: {
        save,
      },
    };
    useMindmapStore.setState({
      nodes: [createNode('Root')],
      metadata: createMetadata(),
      filePath: 'C:/tmp/auto-save.mindmap',
      undoStack: [],
      redoStack: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('saves with normalized node text on interval', async () => {
    save.mockResolvedValue(undefined);
    useMindmapStore.setState({ nodes: [createNode('   ')] });

    renderHook(() => useAutoSave());
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const [savedPath, payload] = save.mock.calls[0] as [string, { nodes: Node[]; metadata: FileMetadata }];
    expect(savedPath).toBe('C:/tmp/auto-save.mindmap');
    expect(payload.nodes[0].text.trim().length).toBeGreaterThan(0);
  });

  it('does nothing when file context is incomplete', async () => {
    save.mockResolvedValue(undefined);
    useMindmapStore.setState({ filePath: null, metadata: null });

    renderHook(() => useAutoSave());
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => expect(save).not.toHaveBeenCalled());
  });

  it('handles save failures without crashing', async () => {
    save.mockRejectedValue(new Error('disk full'));
    const errorSpy = vi.spyOn(console, 'error');

    renderHook(() => useAutoSave());
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Auto-save failed:', expect.any(Error)));
  });
});
