import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIpcMain = { handle: vi.fn() };
const mockDialog = { showSaveDialog: vi.fn() };
const mockWriteFileSync = vi.fn();

const mockExportToMarkdown = vi.fn(() => '# test');
const mockExportToSVG = vi.fn(() => '<svg></svg>');
const mockExportToPNG = vi.fn(async () => Buffer.from([137, 80, 78, 71]));

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  dialog: mockDialog,
}));

vi.mock('fs', () => ({
  default: { writeFileSync: mockWriteFileSync },
  writeFileSync: mockWriteFileSync,
}));

vi.mock('../../electron/services/export-orchestrator', () => ({
  exportToMarkdown: mockExportToMarkdown,
  exportToSVG: mockExportToSVG,
  exportToPNG: mockExportToPNG,
}));

describe('export-handlers', () => {
  const createTrustedEvent = () => ({
    sender: {
      getURL: () => 'file://index.html',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers export handlers', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    expect(mockIpcMain.handle).toHaveBeenCalledWith('export:toPNG', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('export:toSVG', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('export:toMarkdown', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('export:saveAs', expect.any(Function));
  });

  it('writes png file when export:saveAs format is png', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    mockDialog.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: 'C:/tmp/out.png',
    });

    const saveAsHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'export:saveAs')?.[1];
    const result = await saveAsHandler(createTrustedEvent(), {
      nodes: [],
      metadata: { layoutType: 'mindmap', theme: 'default' },
    }, 'png', { scalePercent: 300 });

    expect(result).toBe('C:/tmp/out.png');
    expect(mockExportToPNG).toHaveBeenCalledWith([], expect.objectContaining({
      metadata: expect.objectContaining({ layoutType: 'mindmap', theme: 'default' }),
      minWidth: 1200,
      minHeight: 800,
      padding: 56,
      scale: 3,
    }));
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const [outputPath, pngPayload] = mockWriteFileSync.mock.calls[0];
    expect(outputPath).toMatch(/[\\/]out\.png$/);
    expect(Buffer.isBuffer(pngPayload)).toBe(true);
  });

  it('writes png file when export:toPNG is called directly', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    const toPngHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'export:toPNG')?.[1];
    await toPngHandler(createTrustedEvent(), {
      nodes: [],
      metadata: { layoutType: 'tree-right', theme: 'dark' },
    }, 'C:/tmp/direct.png', { scalePercent: 200 });

    expect(mockExportToPNG).toHaveBeenCalledWith([], expect.objectContaining({
      metadata: expect.objectContaining({ layoutType: 'tree-right', theme: 'dark' }),
      minWidth: 1200,
      minHeight: 800,
      padding: 56,
      scale: 2,
    }));
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const [outputPath, pngPayload] = mockWriteFileSync.mock.calls[0];
    expect(outputPath).toMatch(/[\\/]direct\.png$/);
    expect(Buffer.isBuffer(pngPayload)).toBe(true);
  });

  it('rejects invalid png scale values instead of silently clamping', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    const toPngHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'export:toPNG')?.[1];
    await expect(toPngHandler(createTrustedEvent(), {
      nodes: [],
      metadata: { layoutType: 'mindmap', theme: 'default' },
    }, 'C:/tmp/direct.png', { scalePercent: 999 })).rejects.toThrow(
      'PNG scale percent must be an integer between 50 and 400.'
    );
  });
});
