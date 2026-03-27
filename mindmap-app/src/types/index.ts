export {
  SUPPORTED_LAYOUT_TYPES,
  isLayoutType,
  normalizeLayoutType,
} from '../../electron/shared/types';
export type {
  NodeStyle,
  Node,
  LayoutType,
  Theme,
  CanvasState,
  FileMetadata,
  MindmapPayload,
  MindmapOpenResult,
  LayoutPosition,
  LayoutPositionMap,
  ExportFormat,
  ExportScaleOptions,
} from '../../electron/shared/types';

import type {
  Node,
  MindmapPayload,
  MindmapOpenResult,
  LayoutType,
  LayoutPositionMap,
  ExportFormat,
  ExportScaleOptions,
} from '../../electron/shared/types';

export interface ElectronAPI {
  file: {
    open(): Promise<MindmapOpenResult | null>;
    save(filePath: string, data: MindmapPayload): Promise<void>;
    saveAs(data: MindmapPayload): Promise<string | null>;
    create(): Promise<MindmapOpenResult>;
  };
  layout: {
    compute(nodes: Node[], type: LayoutType): Promise<LayoutPositionMap>;
  };
  export: {
    toPNG(
      data: MindmapPayload,
      outputPath: string,
      options?: ExportScaleOptions
    ): Promise<void>;
    toSVG(data: MindmapPayload, outputPath: string): Promise<void>;
    toMarkdown(nodes: Node[]): Promise<string>;
    saveAs(
      data: MindmapPayload,
      format: ExportFormat,
      options?: ExportScaleOptions
    ): Promise<string | null>;
  };
  window: {
    minimize(): Promise<void>;
    toggleMaximize(): Promise<boolean>;
    close(): Promise<void>;
    isMaximized(): Promise<boolean>;
  };
}
