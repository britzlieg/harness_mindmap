import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockIpcMain = { handle: vi.fn() };
const mockShowOpenDialog = vi.fn();
const mockShowSaveDialog = vi.fn();
const mockOpenMindmapFile = vi.fn();
const mockSaveMindmapFile = vi.fn();
const mockCreateMindmapFile = vi.fn();

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  dialog: { showOpenDialog: mockShowOpenDialog, showSaveDialog: mockShowSaveDialog },
  app: { getPath: vi.fn(() => '/tmp') },
}));

vi.mock('../../electron/services/file-service', () => ({
  openMindmapFile: mockOpenMindmapFile,
  saveMindmapFile: mockSaveMindmapFile,
  createMindmapFile: mockCreateMindmapFile,
}));

describe('file-handlers', () => {
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

  it('should register file:open handler', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();
    expect(mockIpcMain.handle).toHaveBeenCalledWith('file:open', expect.any(Function));
  });

  it('should register file:save handler', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();
    expect(mockIpcMain.handle).toHaveBeenCalledWith('file:save', expect.any(Function));
  });

  it('should register file:create handler', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();
    expect(mockIpcMain.handle).toHaveBeenCalledWith('file:create', expect.any(Function));
  });

  it('should register file:saveAs handler', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();
    expect(mockIpcMain.handle).toHaveBeenCalledWith('file:saveAs', expect.any(Function));
  });

  it('returns null when open dialog is canceled', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();

    mockShowOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const openHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'file:open')?.[1];
    await expect(openHandler(createTrustedEvent())).resolves.toBeNull();
  });

  it('returns parsed nodes and metadata when opening a file', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();

    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['C:/tmp/sample.mindmap'],
    });
    mockOpenMindmapFile.mockReturnValue({
      nodes: [{ id: 'root', children: [] }],
      metadata: { title: 'Loaded' },
    });

    const openHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'file:open')?.[1];
    await expect(openHandler(createTrustedEvent())).resolves.toEqual({
      filePath: 'C:/tmp/sample.mindmap',
      nodes: [{ id: 'root', children: [] }],
      metadata: { title: 'Loaded' },
    });
  });

  it('throws when file payload is invalid', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();

    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['C:/tmp/broken.mindmap'],
    });
    mockOpenMindmapFile.mockReturnValue({
      metadata: { title: 'Broken' },
    });

    const openHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'file:open')?.[1];
    await expect(openHandler(createTrustedEvent())).rejects.toThrow('Failed to open mindmap');
  });

  it('maps unsupported legacy format to actionable error message', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();

    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['C:/tmp/legacy.mindmap'],
    });
    mockOpenMindmapFile.mockImplementation(() => {
      throw {
        code: 'UNSUPPORTED_LEGACY_FORMAT',
        message: 'Legacy SQLite-based .mindmap files are not supported.',
      };
    });

    const openHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'file:open')?.[1];
    await expect(openHandler(createTrustedEvent())).rejects.toThrow(
      'Unsupported legacy SQLite .mindmap file. Please migrate it with a compatible older build first.'
    );
  });

  it('rejects untrusted sender for file:open', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();

    const openHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'file:open')?.[1];
    await expect(openHandler(createUntrustedEvent())).rejects.toThrow('Unauthorized IPC sender.');
  });

  it('rejects invalid payload for file:save', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();

    const saveHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'file:save')?.[1];
    await expect(saveHandler(createTrustedEvent(), 'C:/tmp/test.mindmap', { metadata: {} })).rejects.toThrow(
      'Save mindmap failed'
    );
    expect(mockSaveMindmapFile).not.toHaveBeenCalled();
  });

  it('rejects invalid path for file:save', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();

    const saveHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'file:save')?.[1];
    await expect(saveHandler(
      createTrustedEvent(),
      'C:/tmp/test.txt',
      { nodes: [], metadata: { title: 'valid' } }
    )).rejects.toThrow('Invalid save path for mindmap file.');
    expect(mockSaveMindmapFile).not.toHaveBeenCalled();
  });

  it('rejects invalid payload for file:saveAs', async () => {
    const { registerFileHandlers } = await import('../../electron/ipc/file-handlers');
    registerFileHandlers();

    const saveAsHandler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'file:saveAs')?.[1];
    await expect(saveAsHandler(createTrustedEvent(), { nodes: [] })).rejects.toThrow(
      'Invalid mindmap file format.'
    );
  });
});
