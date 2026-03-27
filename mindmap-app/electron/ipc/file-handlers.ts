import { ipcMain, dialog } from 'electron';
import type { FileMetadata, MindmapPayload, Node } from '../shared/types';
import { normalizeWritePath, PathPolicyError } from './path-policy';
import { assertTrustedIpcSender } from './security';
import { assertMindmapPayload } from './validators';

interface OpenFilePayload {
  nodes: Node[];
  metadata: FileMetadata;
}

const OPEN_FAILED_MESSAGE = 'Failed to open mindmap';
const SAVE_FAILED_MESSAGE = 'Save mindmap failed';
const CREATE_FAILED_MESSAGE = 'Create mindmap failed';
const INVALID_FORMAT_ERROR_MESSAGE = 'Invalid mindmap file format.';
const UNSUPPORTED_LEGACY_FORMAT_ERROR_MESSAGE =
  'Unsupported legacy SQLite .mindmap file. Please migrate it with a compatible older build first.';
const INVALID_SAVE_PATH_ERROR_MESSAGE = 'Invalid save path for mindmap file.';

function isValidOpenFilePayload(payload: unknown): payload is OpenFilePayload {
  if (!payload || typeof payload !== 'object') return false;
  const maybePayload = payload as { nodes?: unknown; metadata?: unknown };
  return Array.isArray(maybePayload.nodes) && !!maybePayload.metadata;
}

function toFileOperationError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof PathPolicyError) {
    return new Error(INVALID_SAVE_PATH_ERROR_MESSAGE);
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'INVALID_FORMAT') {
      return new Error(INVALID_FORMAT_ERROR_MESSAGE);
    }
    if (code === 'UNSUPPORTED_LEGACY_FORMAT') {
      return new Error(UNSUPPORTED_LEGACY_FORMAT_ERROR_MESSAGE);
    }
  }
  return new Error(fallbackMessage);
}

export function registerFileHandlers(): void {
  ipcMain.handle('file:open', async (event) => {
    assertTrustedIpcSender(event);

    const result = await dialog.showOpenDialog({
      filters: [{ name: 'MindMap Files', extensions: ['mindmap'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    try {
      const { openMindmapFile } = await import('../services/file-service');
      const payload = openMindmapFile(filePath);

      if (!isValidOpenFilePayload(payload)) {
        throw new Error('Invalid mindmap payload');
      }

      return { filePath, metadata: payload.metadata, nodes: payload.nodes };
    } catch (error) {
      console.error(`${OPEN_FAILED_MESSAGE}:`, error);
      throw toFileOperationError(error, OPEN_FAILED_MESSAGE);
    }
  });

  ipcMain.handle('file:save', async (event, filePath: string, data: unknown) => {
    assertTrustedIpcSender(event);

    try {
      assertMindmapPayload(data, INVALID_FORMAT_ERROR_MESSAGE);
      const normalizedPath = normalizeWritePath(filePath, ['.mindmap']);
      const { saveMindmapFile } = await import('../services/file-service');
      saveMindmapFile(normalizedPath, data as MindmapPayload);
    } catch (error) {
      console.error(`${SAVE_FAILED_MESSAGE}:`, error);
      throw toFileOperationError(error, SAVE_FAILED_MESSAGE);
    }
  });

  ipcMain.handle('file:saveAs', async (event, data: unknown) => {
    assertTrustedIpcSender(event);
    assertMindmapPayload(data, INVALID_FORMAT_ERROR_MESSAGE);

    const result = await dialog.showSaveDialog({
      filters: [{ name: 'MindMap Files', extensions: ['mindmap'] }],
      defaultPath: 'Untitled.mindmap',
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return result.filePath;
  });

  ipcMain.handle('file:create', async (event) => {
    assertTrustedIpcSender(event);

    const result = await dialog.showSaveDialog({
      filters: [{ name: 'MindMap Files', extensions: ['mindmap'] }],
      defaultPath: 'Untitled.mindmap',
    });

    if (result.canceled || !result.filePath) {
      throw new Error('File creation cancelled');
    }

    try {
      const { createMindmapFile } = await import('../services/file-service');
      const { nodes, metadata } = createMindmapFile(result.filePath);
      return { filePath: result.filePath, metadata, nodes };
    } catch (error) {
      console.error(`${CREATE_FAILED_MESSAGE}:`, error);
      throw toFileOperationError(error, CREATE_FAILED_MESSAGE);
    }
  });
}
