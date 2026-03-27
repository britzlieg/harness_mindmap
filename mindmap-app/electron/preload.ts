import { contextBridge, ipcRenderer } from 'electron';
import type {
  ExportFormat,
  ExportScaleOptions,
  LayoutPositionMap,
  LayoutType,
  MindmapOpenResult,
  MindmapPayload,
  Node,
} from './shared/types';

const electronAPI = {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    save: (filePath: string, data: MindmapPayload) =>
      ipcRenderer.invoke('file:save', filePath, data),
    saveAs: (data: MindmapPayload) =>
      ipcRenderer.invoke('file:saveAs', data),
    create: () => ipcRenderer.invoke('file:create'),
  },
  layout: {
    compute: (nodes: Node[], type: LayoutType) =>
      ipcRenderer.invoke('layout:compute', nodes, type),
  },
  export: {
    toPNG: (
      data: MindmapPayload,
      outputPath: string,
      options?: ExportScaleOptions
    ) => ipcRenderer.invoke('export:toPNG', data, outputPath, options),
    toSVG: (data: MindmapPayload, outputPath: string) =>
      ipcRenderer.invoke('export:toSVG', data, outputPath),
    toMarkdown: (nodes: Node[]) =>
      ipcRenderer.invoke('export:toMarkdown', nodes),
    saveAs: (data: MindmapPayload, format: ExportFormat, options?: ExportScaleOptions) =>
      ipcRenderer.invoke('export:saveAs', data, format, options),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

type PreloadElectronAPI = {
  file: {
    open: () => Promise<MindmapOpenResult | null>;
    save: (filePath: string, data: MindmapPayload) => Promise<void>;
    saveAs: (data: MindmapPayload) => Promise<string | null>;
    create: () => Promise<MindmapOpenResult>;
  };
  layout: {
    compute: (nodes: Node[], type: LayoutType) => Promise<LayoutPositionMap>;
  };
  export: {
    toPNG: (
      data: MindmapPayload,
      outputPath: string,
      options?: ExportScaleOptions
    ) => Promise<void>;
    toSVG: (data: MindmapPayload, outputPath: string) => Promise<void>;
    toMarkdown: (nodes: Node[]) => Promise<string>;
    saveAs: (
      data: MindmapPayload,
      format: ExportFormat,
      options?: ExportScaleOptions
    ) => Promise<string | null>;
  };
  window: typeof electronAPI.window;
};

const _typedApi: PreloadElectronAPI = electronAPI;
void _typedApi;
