import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import { exportToMarkdown, exportToPNG, exportToSVG, generateExportPreview } from '../services/export-orchestrator';
import type { ExportPreviewResult, ExportScaleOptions, MindmapPayload } from '../shared/types';
import { normalizeWritePath, PathPolicyError } from './path-policy';
import { assertTrustedIpcSender } from './security';
import { assertMindmapPayload, assertNodeArray, parseExportFormat } from './validators';

const EXPORT_RENDER_MIN_SIZE = { width: 1200, height: 800 };
const EXPORT_PADDING = 56;
const PNG_SCALE_PERCENT_MIN = 50;
const PNG_SCALE_PERCENT_MAX = 400;
const PNG_SCALE_PERCENT_DEFAULT = 100;
const PNG_SCALE_ERROR = `PNG scale percent must be an integer between ${PNG_SCALE_PERCENT_MIN} and ${PNG_SCALE_PERCENT_MAX}.`;
const EXPORT_PATH_ERROR = 'Invalid export output path.';

function normalizeScalePercent(value: unknown): number {
  if (value === undefined || value === null) {
    return PNG_SCALE_PERCENT_DEFAULT;
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(PNG_SCALE_ERROR);
  }

  if (value < PNG_SCALE_PERCENT_MIN || value > PNG_SCALE_PERCENT_MAX) {
    throw new Error(PNG_SCALE_ERROR);
  }

  return value;
}

export function registerExportHandlers(): void {
  ipcMain.handle('export:toPNG', async (event, data: unknown, outputPath: unknown, options?: ExportScaleOptions) => {
    assertTrustedIpcSender(event);
    assertMindmapPayload(data);

    try {
      const scalePercent = normalizeScalePercent(options?.scalePercent);
      const normalizedPath = normalizeWritePath(outputPath, ['.png']);
      fs.writeFileSync(normalizedPath, await exportToPNG(data.nodes, {
        metadata: data.metadata ?? null,
        minWidth: EXPORT_RENDER_MIN_SIZE.width,
        minHeight: EXPORT_RENDER_MIN_SIZE.height,
        padding: EXPORT_PADDING,
        scale: scalePercent / 100,
      }));
    } catch (error) {
      if (error instanceof PathPolicyError) {
        throw new Error(EXPORT_PATH_ERROR);
      }
      throw error;
    }
  });

  ipcMain.handle('export:toSVG', async (event, data: unknown, outputPath: unknown) => {
    assertTrustedIpcSender(event);
    assertMindmapPayload(data);

    try {
      const normalizedPath = normalizeWritePath(outputPath, ['.svg']);
      const svg = exportToSVG(data.nodes, {
        metadata: data.metadata ?? null,
        minWidth: EXPORT_RENDER_MIN_SIZE.width,
        minHeight: EXPORT_RENDER_MIN_SIZE.height,
        padding: EXPORT_PADDING,
      });
      fs.writeFileSync(normalizedPath, svg, 'utf-8');
    } catch (error) {
      if (error instanceof PathPolicyError) {
        throw new Error(EXPORT_PATH_ERROR);
      }
      throw error;
    }
  });

  ipcMain.handle('export:toMarkdown', async (event, nodes: unknown) => {
    assertTrustedIpcSender(event);
    assertNodeArray(nodes);

    return exportToMarkdown(nodes);
  });

  ipcMain.handle('export:generatePreview', async (event, data: unknown, format: unknown, options?: ExportScaleOptions): Promise<ExportPreviewResult> => {
    assertTrustedIpcSender(event);
    assertMindmapPayload(data);

    const parsedFormat = parseExportFormat(format);
    if (parsedFormat === 'markdown') {
      // Markdown doesn't need preview
      return { svg: '', width: 0, height: 0, estimatedSizeKb: 0 };
    }

    const scalePercent = options?.scalePercent !== undefined ? options.scalePercent / 100 : 1;
    return generateExportPreview(data.nodes, parsedFormat, {
      metadata: data.metadata ?? null,
      minWidth: 1200,
      minHeight: 800,
      padding: 56,
      scale: scalePercent,
    });
  });

  ipcMain.handle('export:saveAs', async (event, data: unknown, format: unknown, options?: ExportScaleOptions) => {
    assertTrustedIpcSender(event);
    assertMindmapPayload(data);

    const scalePercent = normalizeScalePercent(options?.scalePercent);
    const parsedFormat = parseExportFormat(format);
    const filters: Record<string, Electron.FileFilter[]> = {
      markdown: [{ name: 'Markdown', extensions: ['md'] }],
      svg: [{ name: 'SVG', extensions: ['svg'] }],
      png: [{ name: 'PNG', extensions: ['png'] }],
    };
    const result = await dialog.showSaveDialog({
      filters: filters[parsedFormat] || filters.markdown,
      defaultPath: `mindmap.${parsedFormat === 'markdown' ? 'md' : parsedFormat}`,
    });
    if (result.canceled || !result.filePath) return null;

    try {
      if (parsedFormat === 'markdown') {
        const normalizedPath = normalizeWritePath(result.filePath, ['.md', '.markdown']);
        fs.writeFileSync(normalizedPath, exportToMarkdown(data.nodes), 'utf-8');
      } else if (parsedFormat === 'svg') {
        const normalizedPath = normalizeWritePath(result.filePath, ['.svg']);
        fs.writeFileSync(normalizedPath, exportToSVG(data.nodes, {
          metadata: data.metadata ?? null,
          minWidth: EXPORT_RENDER_MIN_SIZE.width,
          minHeight: EXPORT_RENDER_MIN_SIZE.height,
          padding: EXPORT_PADDING,
        }), 'utf-8');
      } else if (parsedFormat === 'png') {
        const normalizedPath = normalizeWritePath(result.filePath, ['.png']);
        fs.writeFileSync(normalizedPath, await exportToPNG(data.nodes, {
          metadata: data.metadata ?? null,
          minWidth: EXPORT_RENDER_MIN_SIZE.width,
          minHeight: EXPORT_RENDER_MIN_SIZE.height,
          padding: EXPORT_PADDING,
          scale: scalePercent / 100,
        }));
      }
    } catch (error) {
      if (error instanceof PathPolicyError) {
        throw new Error(EXPORT_PATH_ERROR);
      }
      throw error;
    }

    return result.filePath;
  });
}
