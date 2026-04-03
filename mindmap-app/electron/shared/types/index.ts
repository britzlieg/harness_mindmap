export interface NodeStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: number;
  padding?: number;
}

export interface Node {
  id: string;
  parentId: string | null;
  text: string;
  note: string;
  labels: string[];
  tags: string[];
  priority: number;
  progress: number;
  style: NodeStyle;
  isFolded: boolean;
  positionX: number | null;
  positionY: number | null;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
  children?: Node[];
}

export const SUPPORTED_LAYOUT_TYPES = [
  'mindmap',
  'logic',
  'org',
  'tree-right',
  'tree-left',
] as const;

export type LayoutType = (typeof SUPPORTED_LAYOUT_TYPES)[number];

export function isLayoutType(value: unknown): value is LayoutType {
  return (
    typeof value === 'string'
    && (SUPPORTED_LAYOUT_TYPES as readonly string[]).includes(value)
  );
}

export function normalizeLayoutType(value: unknown): LayoutType {
  return isLayoutType(value) ? value : 'mindmap';
}

export interface Theme {
  name: string;
  canvas: {
    background: string;
    gridColor: string;
  };
  rootNode: NodeStyle;
  branchNode: NodeStyle;
  leafNode: NodeStyle;
  connection: {
    color: string;
    width: number;
    style: 'solid' | 'dashed';
  };
  ui?: {
    inputBackground?: string;
    inputBorder?: string;
    inputFocusRing?: string;
    windowControlBackground?: string;
    windowControlCloseBackground?: string;
  };
}

export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface FileMetadata {
  title: string;
  rootTopicId: string;
  layoutType: LayoutType;
  theme: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface MindmapPayload {
  nodes: Node[];
  metadata: FileMetadata;
}

export interface MindmapOpenResult extends MindmapPayload {
  filePath: string;
}

export interface LayoutPosition {
  x: number;
  y: number;
}

export type LayoutPositionMap = Record<string, LayoutPosition>;

export type ExportFormat = 'markdown' | 'svg' | 'png';

export interface ExportScaleOptions {
  scalePercent?: number;
}

export interface ExportPreviewResult {
  svg: string;
  width: number;
  height: number;
  estimatedSizeKb: number;
}
