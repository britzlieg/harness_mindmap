import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadURL = vi.fn();
const mockLoadFile = vi.fn();
const mockShow = vi.fn();
const mockOnce = vi.fn();
const mockOn = vi.fn();
const mockSetApplicationMenu = vi.fn();
const mockIpcHandle = vi.fn();

const mockBrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: mockLoadURL,
  loadFile: mockLoadFile,
  show: mockShow,
  once: mockOnce,
  on: mockOn,
  minimize: vi.fn(),
  maximize: vi.fn(),
  unmaximize: vi.fn(),
  isMaximized: vi.fn(() => false),
  close: vi.fn(),
}));
(mockBrowserWindow as unknown as { getAllWindows: () => unknown[] }).getAllWindows = vi.fn(() => []);
(mockBrowserWindow as unknown as { fromWebContents: () => unknown }).fromWebContents = vi.fn(() => null);

const mockApp = {
  whenReady: vi.fn(() => Promise.resolve()),
  on: vi.fn(),
  quit: vi.fn(),
};

vi.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: { handle: mockIpcHandle },
  Menu: { setApplicationMenu: mockSetApplicationMenu },
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workAreaSize: { width: 1600, height: 1000 },
    })),
  },
}));

const mockRegisterFileHandlers = vi.fn();
const mockRegisterLayoutHandlers = vi.fn();
const mockRegisterExportHandlers = vi.fn();

vi.mock('../../electron/ipc/file-handlers', () => ({
  registerFileHandlers: mockRegisterFileHandlers,
}));

vi.mock('../../electron/ipc/layout-handlers', () => ({
  registerLayoutHandlers: mockRegisterLayoutHandlers,
}));

vi.mock('../../electron/ipc/export-handlers', () => ({
  registerExportHandlers: mockRegisterExportHandlers,
}));

describe('electron main window initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.VITE_DEV_SERVER_URL;
  });

  it('hides native application menu and initializes handlers on ready', async () => {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';

    await import('../../electron/main');
    await Promise.resolve();

    expect(mockSetApplicationMenu).toHaveBeenCalledWith(null);
    expect(mockRegisterFileHandlers).toHaveBeenCalledTimes(1);
    expect(mockRegisterLayoutHandlers).toHaveBeenCalledTimes(1);
    expect(mockRegisterExportHandlers).toHaveBeenCalledTimes(1);
    expect(mockBrowserWindow).toHaveBeenCalledTimes(1);
    expect(mockBrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
      frame: false,
      titleBarStyle: expect.any(String),
    }));
    expect(mockLoadURL).toHaveBeenCalledWith('http://localhost:5173');
    expect(mockIpcHandle).toHaveBeenCalledWith('window:minimize', expect.any(Function));
    expect(mockIpcHandle).toHaveBeenCalledWith('window:toggleMaximize', expect.any(Function));
    expect(mockIpcHandle).toHaveBeenCalledWith('window:close', expect.any(Function));
    expect(mockIpcHandle).toHaveBeenCalledWith('window:isMaximized', expect.any(Function));
  });
});
