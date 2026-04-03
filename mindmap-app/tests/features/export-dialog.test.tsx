import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExportDialog } from '../../src/components/Dialogs/ExportDialog';
import { EXPORT_TEXT } from '../../src/constants/ui-text';
import type { FileMetadata, Node } from '../../src/types';

const toggleExportDialog = vi.fn();
const saveAs = vi.fn();
const setNodes = vi.fn();
const generatePreview = vi.fn();

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

let storeState: { nodes: Node[]; metadata: FileMetadata; lastExportFormat: 'png'; lastPngScalePercent: number } = {
  nodes: [createNode()],
  metadata: createMetadata(),
  lastExportFormat: 'png',
  lastPngScalePercent: 100,
};

vi.mock('../../src/stores/ui-store', () => ({
  useUiStore: (
    selector?: (state: { 
      exportDialogOpen: boolean; 
      toggleExportDialog: typeof toggleExportDialog;
      lastExportFormat: 'markdown' | 'svg' | 'png';
      lastPngScalePercent: number;
      setLastExportFormat: (format: 'markdown' | 'svg' | 'png') => void;
      setLastPngScalePercent: (percent: number) => void;
    }) => unknown
  ) => {
    const state = {
      exportDialogOpen: true,
      toggleExportDialog,
      lastExportFormat: storeState.lastExportFormat,
      lastPngScalePercent: storeState.lastPngScalePercent,
      setLastExportFormat: vi.fn(),
      setLastPngScalePercent: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../src/stores/mindmap-store', () => {
  const useMindmapStore = (selector: (state: typeof storeState & { setNodes: typeof setNodes }) => unknown) =>
    selector({ ...storeState, setNodes });
  (useMindmapStore as any).getState = () => storeState;
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
      lastExportFormat: 'png',
      lastPngScalePercent: 100,
    };

    (window as any).electronAPI = {
      export: {
        saveAs,
        generatePreview: generatePreview.mockResolvedValue({
          svg: '<svg>preview</svg>',
          width: 1200,
          height: 800,
          estimatedSizeKb: 50,
        }),
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
    expect(screen.getByText('步骤 1: 选择格式')).toBeTruthy();
    expect(screen.getByText(EXPORT_TEXT.formats.markdown)).toBeTruthy();
    expect(screen.getByText(EXPORT_TEXT.formats.svg)).toBeTruthy();
    const pngOption = screen.getByText(EXPORT_TEXT.formats.png);
    expect(pngOption).toBeTruthy();
    expect(screen.getByText(EXPORT_TEXT.cancel)).toBeTruthy();
    expect(screen.getByText('下一步')).toBeTruthy();
  });

  it('navigates to preview step when clicking next', async () => {
    render(<ExportDialog />);

    fireEvent.click(screen.getByText('下一步'));

    await waitFor(() => {
      expect(screen.getByText('步骤 2: 预览调整')).toBeTruthy();
    });
    expect(screen.getByText('上一步')).toBeTruthy();
    expect(screen.getByText('确认导出')).toBeTruthy();
  });

  it('exports PNG with scale option when confirming export', async () => {
    saveAs.mockResolvedValue('C:/tmp/out.png');
    render(<ExportDialog />);

    // Step 1: Select PNG format
    fireEvent.click(screen.getByText(EXPORT_TEXT.formats.png));
    
    // Navigate to step 2
    fireEvent.click(screen.getByText('下一步'));
    
    // Wait for preview to load and scale input to appear
    await waitFor(() => {
      expect(screen.getByTestId('png-scale-input')).toBeTruthy();
    });
    
    fireEvent.change(screen.getByTestId('png-scale-input'), { target: { value: '200' } });

    // Wait for preview generation debounce
    await new Promise(resolve => setTimeout(resolve, 250));

    // Click confirm export
    fireEvent.click(screen.getByText('确认导出'));

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

    // Step 1: Select PNG format
    fireEvent.click(screen.getByText(EXPORT_TEXT.formats.png));
    
    // Navigate to step 2
    fireEvent.click(screen.getByText('下一步'));
    
    // Wait for scale input to appear
    await waitFor(() => {
      expect(screen.getByTestId('png-scale-input')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('png-scale-input'), { target: { value: '999' } });
    
    // Click confirm export (should validate and show error)
    fireEvent.click(screen.getByText('确认导出'));

    await waitFor(() => {
      expect(screen.getByText(EXPORT_TEXT.pngScaleInvalid)).toBeTruthy();
    });
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('uses latest store snapshot after render-ready wait for SVG export', async () => {
    saveAs.mockResolvedValue('C:/tmp/out.svg');
    render(<ExportDialog />);
    storeState = {
      ...storeState,
      nodes: [createNode('Updated Before Export')],
    };

    // Select SVG and go to step 2
    fireEvent.click(screen.getByText(EXPORT_TEXT.formats.svg));
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => {
      expect(generatePreview).toHaveBeenCalled();
    });

    // Confirm export
    fireEvent.click(screen.getByText('确认导出'));

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
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => {
      expect(generatePreview).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('确认导出'));

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
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => {
      expect(generatePreview).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('确认导出'));

    await waitFor(() => expect(saveAs).toHaveBeenCalledTimes(1));
    expect(errorSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    expect(toggleExportDialog).not.toHaveBeenCalled();
  });
});
