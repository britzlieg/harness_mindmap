import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MindMapCanvas } from '../../src/components/Canvas/MindMapCanvas';
import type { Node, FileMetadata } from '../../src/types';
import { themes } from '../../src/themes';
import { CANVAS_CONTROLS_TEXT } from '../../src/constants/ui-text';

const mockSelectNode = vi.fn();
const mockDeselectAll = vi.fn();
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockResetZoom = vi.fn();
const mockUpdateNodeText = vi.fn();
let mockCanvasContext: any;

let canvasState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  selectedNodeId: null as string | null,
  selectNode: mockSelectNode,
  deselectAll: mockDeselectAll,
  zoomIn: mockZoomIn,
  zoomOut: mockZoomOut,
  resetZoom: mockResetZoom,
};

let mindmapNodes: Node[] = [];
let mindmapMetadata: FileMetadata = {
  title: 'Test',
  rootTopicId: 'root',
  layoutType: 'mindmap',
  theme: 'default',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
};

vi.mock('../../src/stores/canvas-store', () => ({
  useCanvasStore: () => canvasState,
}));

vi.mock('../../src/stores/mindmap-store', () => ({
  useMindmapStore: () => ({
    nodes: mindmapNodes,
    metadata: mindmapMetadata,
    updateNodeText: mockUpdateNodeText,
  }),
}));

vi.mock('../../src/hooks/useCanvasInteraction', () => ({
  useCanvasInteraction: () => ({
    handleMouseDown: vi.fn(),
    handleMouseMove: vi.fn(),
    handleMouseUp: vi.fn(),
    handleWheel: vi.fn(),
  }),
}));

function createMockNode(overrides: Partial<Node> = {}): Node {
  return {
    id: 'node-1',
    parentId: null,
    text: 'Test Node',
    note: '',
    labels: [],
    tags: [],
    priority: 0,
    progress: 0,
    style: {},
    isFolded: false,
    positionX: 100,
    positionY: 200,
    orderIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children: [],
    ...overrides,
  };
}

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '');
  const fullHex = normalized.length === 3
    ? `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`
    : normalized;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

describe('MindMapCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvasContext = {
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
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any;

    canvasState = {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      selectedNodeId: null,
      selectNode: mockSelectNode,
      deselectAll: mockDeselectAll,
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      resetZoom: mockResetZoom,
    };
    mindmapNodes = [];
    mindmapMetadata = {
      title: 'Test',
      rootTopicId: 'root',
      layoutType: 'mindmap',
      theme: 'default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };
  });

  it('renders without crashing', () => {
    render(<MindMapCanvas />);
    expect(screen.getByTestId('mindmap-canvas')).toBeTruthy();
  });

  it('shows zoom controls', () => {
    render(<MindMapCanvas />);
    expect(screen.getByTitle(CANVAS_CONTROLS_TEXT.zoomIn)).toBeTruthy();
    expect(screen.getByTitle(CANVAS_CONTROLS_TEXT.zoomOut)).toBeTruthy();
    expect(screen.getByTitle(CANVAS_CONTROLS_TEXT.resetZoom)).toBeTruthy();
  });

  it('displays zoom percentage', () => {
    canvasState = { ...canvasState, scale: 1.5 };
    render(<MindMapCanvas />);
    expect(screen.getByText('150%')).toBeTruthy();
  });

  it('renders nodes when present', () => {
    const child = createMockNode({ id: 'n2', parentId: 'n1', text: 'Child' });
    mindmapNodes = [
      createMockNode({ id: 'n1', text: 'Root', children: [child] }),
    ];
    render(<MindMapCanvas />);
    expect(screen.getByText('Root')).toBeTruthy();
    expect(screen.getByText('Child')).toBeTruthy();
  });

  it('renders nested children from tree structure', () => {
    const child = createMockNode({ id: 'c1', parentId: 'r1', text: 'Child 1' });
    const grandChild = createMockNode({ id: 'g1', parentId: 'c1', text: 'Grandchild 1' });
    child.children = [grandChild];

    mindmapNodes = [
      createMockNode({ id: 'r1', text: 'Root', children: [child] }),
    ];

    render(<MindMapCanvas />);
    expect(screen.getByText('Root')).toBeTruthy();
    expect(screen.getByText('Child 1')).toBeTruthy();
    expect(screen.getByText('Grandchild 1')).toBeTruthy();
  });

  it('renders connection canvas layer', () => {
    mindmapNodes = [
      createMockNode({ id: 'r1', text: 'Root' }),
    ];

    render(<MindMapCanvas />);
    expect(screen.getByTestId('connection-canvas')).toBeTruthy();
  });

  it('calls deselectAll when clicking background', () => {
    render(<MindMapCanvas />);
    const canvas = screen.getByTestId('mindmap-canvas');
    fireEvent.click(canvas, { target: canvas, currentTarget: canvas });
    expect(mockDeselectAll).toHaveBeenCalled();
  });

  it('supports inline text editing on double click', () => {
    mindmapNodes = [
      createMockNode({ id: 'r1', text: 'Root' }),
    ];

    render(<MindMapCanvas />);
    fireEvent.doubleClick(screen.getByText('Root'));

    const input = screen.getByTestId('node-inline-input-r1');
    fireEvent.change(input, { target: { value: 'Renamed Root' } });
    fireEvent.blur(input);

    expect(mockUpdateNodeText).toHaveBeenCalledWith('r1', 'Renamed Root');
  });

  it('applies active theme to canvas and connection styles', () => {
    mindmapMetadata = { ...mindmapMetadata, theme: 'dark' };
    mindmapNodes = [createMockNode({ id: 'r1', text: 'Root' })];

    render(<MindMapCanvas />);

    const canvas = screen.getByTestId('mindmap-canvas') as HTMLElement;
    expect(canvas.style.backgroundColor).toBe(hexToRgb(themes.dark.canvas.background));
    expect(mockCanvasContext.strokeStyle).toBe(themes.dark.connection.color);
    expect(mockCanvasContext.lineWidth).toBe(themes.dark.connection.width);
    expect(mockCanvasContext.setLineDash).toHaveBeenCalledWith([]);
  });

  it('falls back to default theme when metadata theme is unknown', () => {
    mindmapMetadata = { ...mindmapMetadata, theme: 'unknown-theme' };
    mindmapNodes = [createMockNode({ id: 'r1', text: 'Root' })];

    render(<MindMapCanvas />);

    const canvas = screen.getByTestId('mindmap-canvas') as HTMLElement;
    expect(canvas.style.backgroundColor).toBe(hexToRgb(themes.default.canvas.background));
    expect(mockCanvasContext.strokeStyle).toBe(themes.default.connection.color);
  });

  it('applies root, branch and leaf theme styles by node role', () => {
    const leaf = createMockNode({ id: 'l1', parentId: 'b1', text: 'Leaf', children: [] });
    const branch = createMockNode({ id: 'b1', parentId: 'r1', text: 'Branch', children: [leaf], style: {} });
    const root = createMockNode({ id: 'r1', text: 'Root', children: [branch], style: {} });
    mindmapNodes = [root];

    render(<MindMapCanvas />);

    const rootNode = document.querySelector('[data-node-id="r1"]') as HTMLElement;
    const branchNode = document.querySelector('[data-node-id="b1"]') as HTMLElement;
    const leafNode = document.querySelector('[data-node-id="l1"]') as HTMLElement;

    expect(rootNode.style.backgroundColor).toBe(hexToRgb(themes.default.rootNode.backgroundColor!));
    expect(branchNode.style.backgroundColor).toBe(hexToRgb(themes.default.branchNode.backgroundColor!));
    expect(leafNode.style.backgroundColor).toBe(hexToRgb(themes.default.leafNode.backgroundColor!));
  });

  it('keeps node explicit style values while filling missing fields from theme', () => {
    mindmapMetadata = { ...mindmapMetadata, theme: 'dark' };
    mindmapNodes = [
      createMockNode({
        id: 'r1',
        text: 'Root',
        style: {
          backgroundColor: '#ff0000',
        },
      }),
    ];

    render(<MindMapCanvas />);

    const rootNode = document.querySelector('[data-node-id="r1"]') as HTMLElement;
    expect(rootNode.style.backgroundColor).toBe(hexToRgb('#ff0000'));
    expect(rootNode.style.color).toBe(hexToRgb(themes.dark.rootNode.textColor!));
    expect(rootNode.style.fontWeight).toBe(String(themes.dark.rootNode.fontWeight));
  });

  it('recomputes node positions when layout type changes', () => {
    const child = createMockNode({ id: 'c1', parentId: 'r1', text: 'Child 1' });
    mindmapNodes = [
      createMockNode({ id: 'r1', text: 'Root', children: [child] }),
    ];

    mindmapMetadata = { ...mindmapMetadata, layoutType: 'tree-right' };
    const { rerender, container } = render(<MindMapCanvas />);

    const rightRoot = container.querySelector('[data-node-id="r1"]') as HTMLElement;
    const rightChild = container.querySelector('[data-node-id="c1"]') as HTMLElement;
    const rightRootX = Number.parseFloat(rightRoot.style.left);
    const rightChildX = Number.parseFloat(rightChild.style.left);
    expect(rightChildX).toBeGreaterThan(rightRootX);

    mindmapMetadata = { ...mindmapMetadata, layoutType: 'tree-left' };
    rerender(<MindMapCanvas />);

    const leftRoot = container.querySelector('[data-node-id="r1"]') as HTMLElement;
    const leftChild = container.querySelector('[data-node-id="c1"]') as HTMLElement;
    const leftRootX = Number.parseFloat(leftRoot.style.left);
    const leftChildX = Number.parseFloat(leftChild.style.left);
    expect(leftChildX).toBeLessThan(leftRootX);
  });
});
