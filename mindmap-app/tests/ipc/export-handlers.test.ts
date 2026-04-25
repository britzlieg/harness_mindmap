import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockIpcMain = { handle: vi.fn() };
const mockDialog = { showSaveDialog: vi.fn() };
const mockWriteFileSync = vi.fn();

const mockExportToMarkdown = vi.fn(() => '# test');
const mockExportToSVG = vi.fn(() => '<svg></svg>');
const mockExportToPNG = vi.fn(async () => Buffer.from([137, 80, 78, 71]));
const mockGenerateExportPreview = vi.fn(() => ({ svg: '<svg></svg>', width: 1200, height: 800, estimatedSizeKb: 12 }));

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
  generateExportPreview: mockGenerateExportPreview,
}));

describe('export-handlers', () => {
  const createTrustedEvent = () => ({
    sender: {
      getURL: () => 'file://index.html',
    },
  });
  const createUntrustedEvent = () => ({
    sender: {
      getURL: () => 'https://evil.example',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('rejects untrusted sender for privileged export channels', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    const toPngHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'export:toPNG')?.[1];
    await expect(toPngHandler(
      createUntrustedEvent(),
      { nodes: [], metadata: { layoutType: 'mindmap', theme: 'default' } },
      'C:/tmp/direct.png'
    )).rejects.toThrow('Unauthorized IPC sender.');
  });

  it('rejects invalid output path for SVG export', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    const toSvgHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'export:toSVG')?.[1];
    await expect(toSvgHandler(
      createTrustedEvent(),
      { nodes: [], metadata: { layoutType: 'mindmap', theme: 'default' } },
      'C:/tmp/out.txt'
    )).rejects.toThrow('Invalid export output path.');
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('rejects invalid payload for export:saveAs', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    const saveAsHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'export:saveAs')?.[1];
    await expect(saveAsHandler(createTrustedEvent(), { nodes: [] }, 'png')).rejects.toThrow(
      'Invalid mindmap payload.'
    );
  });

  it('rejects invalid payload for export:toMarkdown', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    const toMarkdownHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'export:toMarkdown')?.[1];
    await expect(toMarkdownHandler(createTrustedEvent(), {})).rejects.toThrow('Nodes must be an array.');
  });

  it('passes normalized scale to preview generation without diverging from PNG semantics', async () => {
    const { registerExportHandlers } = await import('../../electron/ipc/export-handlers');
    registerExportHandlers();

    const previewHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'export:generatePreview')?.[1];
    const preview = await previewHandler(createTrustedEvent(), {
      nodes: [],
      metadata: { layoutType: 'mindmap', theme: 'default' },
    }, 'png', { scalePercent: 200 });

    expect(preview).toEqual({ svg: '<svg></svg>', width: 1200, height: 800, estimatedSizeKb: 12 });
    expect(mockGenerateExportPreview).toHaveBeenCalledWith([], 'png', expect.objectContaining({
      metadata: expect.objectContaining({ layoutType: 'mindmap', theme: 'default' }),
      minWidth: 1200,
      minHeight: 800,
      padding: 56,
      scale: 2,
    }));
  });
});
