import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/App';
import { TOOLBAR_TEXT, SIDEBAR_TEXT, CANVAS_CONTROLS_TEXT, WINDOW_TEXT } from '../../src/constants/ui-text';
import { useUiStore } from '../../src/stores/ui-store';
import { useCanvasStore } from '../../src/stores/canvas-store';
import { useMindmapStore } from '../../src/stores/mindmap-store';

beforeEach(() => {
  vi.useFakeTimers();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
  })) as any;

  (window as any).electronAPI = {
    file: {
      open: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      saveAs: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        filePath: '/tmp/test.mindmap',
        metadata: {
          title: 'Test',
          rootTopicId: 'root',
          layoutType: 'mindmap',
          theme: 'default',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
        nodes: [],
      }),
    },
    layout: {
      compute: vi.fn().mockResolvedValue(new Map()),
    },
    export: {
      toPNG: vi.fn().mockResolvedValue(undefined),
      toSVG: vi.fn().mockResolvedValue(undefined),
      toMarkdown: vi.fn().mockResolvedValue(''),
      saveAs: vi.fn().mockResolvedValue(null),
    },
    window: {
      minimize: vi.fn().mockResolvedValue(undefined),
      toggleMaximize: vi.fn().mockResolvedValue(false),
      close: vi.fn().mockResolvedValue(undefined),
      isMaximized: vi.fn().mockResolvedValue(false),
    },
  };

  useUiStore.setState({ sidebarOpen: true, sidebarTab: 'editor', shortcutsHelpOpen: false, exportDialogOpen: false });
  useCanvasStore.setState({ scale: 1, offsetX: 0, offsetY: 0, selectedNodeId: null });
  useMindmapStore.setState({ nodes: [], metadata: null, filePath: null, undoStack: [], redoStack: [] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('App integration', () => {
  it('renders toolbar, canvas, and zoom controls', () => {
    render(<App />);

    expect(screen.getByTitle(TOOLBAR_TEXT.title.undo)).toBeTruthy();
    expect(screen.getByTitle(TOOLBAR_TEXT.title.redo)).toBeTruthy();
    expect(screen.getByTitle(CANVAS_CONTROLS_TEXT.zoomIn)).toBeTruthy();
    expect(screen.getByTitle(CANVAS_CONTROLS_TEXT.zoomOut)).toBeTruthy();
    expect(screen.getByTitle(CANVAS_CONTROLS_TEXT.resetZoom)).toBeTruthy();
    expect(screen.getByTestId('mindmap-canvas')).toBeTruthy();
  });

  it('uses tokenized glass styles on toolbar and actions', () => {
    render(<App />);
    const toolbar = screen.getByTestId('main-toolbar');
    const exportButton = screen.getByTitle(TOOLBAR_TEXT.title.export);
    const undoButton = screen.getByTitle(TOOLBAR_TEXT.title.undo);
    const sidebarTab = screen.getByText(SIDEBAR_TEXT.tabs.editor);

    expect(toolbar.className).toContain('glass-surface');
    expect(exportButton.className).toContain('ui-button--primary');
    expect(undoButton.className).toContain('ui-button--secondary');
    expect(sidebarTab.className).toContain('app-sidebar-tab');
  });

  it('renders sidebar when open', () => {
    render(<App />);

    expect(screen.getByText(SIDEBAR_TEXT.tabs.editor)).toBeTruthy();
    expect(screen.getByText(SIDEBAR_TEXT.tabs.theme)).toBeTruthy();
    expect(screen.getByText(SIDEBAR_TEXT.tabs.layout)).toBeTruthy();
  });

  it('does not render sidebar when closed', () => {
    useUiStore.setState({ sidebarOpen: false });
    render(<App />);

    expect(screen.queryByText(SIDEBAR_TEXT.tabs.editor)).toBeNull();
  });

  it('shows zoom percentage', () => {
    useCanvasStore.setState({ scale: 0.75 });
    render(<App />);

    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('does not show static 1:1 zoom text', () => {
    render(<App />);
    expect(screen.queryByText('1:1')).toBeNull();
  });

  it('renders export button', () => {
    render(<App />);
    expect(screen.getByText(TOOLBAR_TEXT.export)).toBeTruthy();
  });

  it('creates a root node on startup when the document is empty', () => {
    render(<App />);

    expect(screen.getByText('Central Topic')).toBeTruthy();
    expect(useMindmapStore.getState().nodes).toHaveLength(1);
    expect(useMindmapStore.getState().metadata?.rootTopicId).toBe(useMindmapStore.getState().nodes[0].id);
  });

  it('applies window theme variables from active metadata theme', () => {
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
      metadata: {
        title: 'Themed',
        rootTopicId: 'root',
        layoutType: 'mindmap',
        theme: 'forest',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      },
      filePath: 'C:/tmp/themed.mindmap',
      undoStack: [],
      redoStack: [],
    });

    render(<App />);
    const appRoot = document.querySelector('.app-root') as HTMLElement;
    expect(appRoot.dataset.theme).toBe('forest');
    expect(appRoot.style.getPropertyValue('--ui-color-accent')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-color-border')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-color-text-primary')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-color-text-secondary')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-color-text-disabled')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-color-text-accent')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-button-glass-bg')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-button-glass-border')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-input-bg')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-input-border-focus')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-window-control-bg')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-window-control-close-bg')).toBeTruthy();
    expect(appRoot.style.getPropertyValue('--ui-color-text-primary'))
      .not.toBe(appRoot.style.getPropertyValue('--ui-color-text-secondary'));
  });

  it('renders themed window controls and wires actions to electron API', async () => {
    render(<App />);

    const minimize = screen.getByTitle(WINDOW_TEXT.minimize);
    const maximize = screen.getByTitle(WINDOW_TEXT.maximize);
    const close = screen.getByTitle(WINDOW_TEXT.close);

    minimize.click();
    maximize.click();
    close.click();

    expect(window.electronAPI.window.minimize as any).toHaveBeenCalledTimes(1);
    expect(window.electronAPI.window.toggleMaximize as any).toHaveBeenCalledTimes(1);
    expect(window.electronAPI.window.close as any).toHaveBeenCalledTimes(1);
  });
});
