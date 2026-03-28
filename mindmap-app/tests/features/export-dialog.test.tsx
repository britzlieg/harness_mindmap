import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExportDialog } from '../../src/components/Dialogs/ExportDialog';
import { EXPORT_TEXT } from '../../src/constants/ui-text';
import type { FileMetadata, Node } from '../../src/types';

const toggleExportDialog = vi.fn();
const saveAs = vi.fn();
const setNodes = vi.fn();

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

let storeState: { nodes: Node[]; metadata: FileMetadata } = {
  nodes: [createNode()],
  metadata: createMetadata(),
};

vi.mock('../../src/stores/ui-store', () => ({
  useUiStore: (
    selector?: (state: { exportDialogOpen: boolean; toggleExportDialog: typeof toggleExportDialog }) => unknown
  ) => {
    const state = {
      exportDialogOpen: true,
      toggleExportDialog,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../src/stores/mindmap-store', () => {
  const useMindmapStore = ((selector: (state: typeof storeState & { setNodes: typeof setNodes }) => unknown) =>
    selector({ ...storeState, setNodes })) as unknown as {
    (selector: (state: typeof storeState & { setNodes: typeof setNodes }) => unknown): unknown;
    getState: () => typeof storeState;
  };
  useMindmapStore.getState = () => storeState;
  return { useMindmapStore };
});

describe('ExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    storeState = {
      nodes: [createNode()],
      metadata: createMetadata(),
    };

    (window as any).electronAPI = {
      export: {
        saveAs,
      },
    };
    (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows localized labels and includes PNG option', () => {
    render(<ExportDialog />);

    expect(screen.getByText(EXPORT_TEXT.title)).toBeTruthy();
    expect(screen.getByText(EXPORT_TEXT.formats.markdown)).toBeTruthy();
    expect(screen.getByText(EXPORT_TEXT.formats.svg)).toBeTruthy();
    const pngOption = screen.getByText(EXPORT_TEXT.formats.png);
    expect(pngOption).toBeTruthy();
    expect(screen.getByText(EXPORT_TEXT.cancel)).toBeTruthy();
    expect(screen.getByLabelText(EXPORT_TEXT.pngScaleLabel)).toBeTruthy();
    expect((pngOption.closest('button') as HTMLButtonElement).className).toContain('ui-format-option');
  });

  it('exports PNG with scale option when PNG is selected', async () => {
    saveAs.mockResolvedValue('C:/tmp/out.png');
    render(<ExportDialog />);

    fireEvent.change(screen.getByTestId('png-scale-input'), { target: { value: '200' } });
    fireEvent.click(screen.getByText(EXPORT_TEXT.formats.png));

    await waitFor(() => {
      expect(saveAs).toHaveBeenCalledWith({
        nodes: storeState.nodes,
        metadata: storeState.metadata,
      }, 'png', { scalePercent: 200 });
    });
    expect(toggleExportDialog).toHaveBeenCalled();
  });

  it('blocks PNG export when scale value is invalid', async () => {
    render(<ExportDialog />);

    fireEvent.change(screen.getByTestId('png-scale-input'), { target: { value: '999' } });
    fireEvent.click(screen.getByText(EXPORT_TEXT.formats.png));

    await waitFor(() => expect(screen.getByText(EXPORT_TEXT.pngScaleInvalid)).toBeTruthy());
    expect(saveAs).not.toHaveBeenCalled();
    expect(toggleExportDialog).not.toHaveBeenCalled();
  });

  it('uses latest store snapshot after render-ready wait for SVG export', async () => {
    saveAs.mockResolvedValue('C:/tmp/out.svg');
    render(<ExportDialog />);
    storeState = {
      ...storeState,
      nodes: [createNode('Updated Before Export')],
    };

    fireEvent.click(screen.getByText(EXPORT_TEXT.formats.svg));

    await waitFor(() => {
      expect(saveAs).toHaveBeenCalledWith(expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ text: 'Updated Before Export' }),
        ]),
      }), 'svg', undefined);
    });
  });

  it('sanitizes empty node text before export', async () => {
    saveAs.mockResolvedValue('C:/tmp/out.png');
    storeState = {
      ...storeState,
      nodes: [createNode('   ')],
    };
    render(<ExportDialog />);

    fireEvent.click(screen.getByText(EXPORT_TEXT.formats.png));

    await waitFor(() => expect(saveAs).toHaveBeenCalledTimes(1));
    const payload = saveAs.mock.calls[0][0] as { nodes: Node[]; metadata: FileMetadata };
    expect(payload.nodes[0].text.trim().length).toBeGreaterThan(0);
    expect(setNodes).toHaveBeenCalled();
  });

  it('keeps dialog open when export fails', async () => {
    const errorSpy = vi.spyOn(console, 'error');
    saveAs.mockRejectedValue(new Error('write failed'));
    render(<ExportDialog />);

    fireEvent.click(screen.getByText(EXPORT_TEXT.formats.png));

    await waitFor(() => expect(saveAs).toHaveBeenCalledTimes(1));
    expect(errorSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    expect(toggleExportDialog).not.toHaveBeenCalled();
  });
});
