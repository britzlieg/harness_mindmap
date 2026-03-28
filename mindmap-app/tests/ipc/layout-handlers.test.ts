import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIpcMain = { handle: vi.fn() };
const mockComputeLayout = vi.fn();

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
}));

vi.mock('../../electron/shared/utils/layout-algorithms', () => ({
  computeLayout: mockComputeLayout,
}));

function createTrustedEvent() {
  return {
    sender: {
      getURL: () => 'file://index.html',
    },
  };
}

function createUntrustedEvent() {
  return {
    sender: {
      getURL: () => 'https://evil.example',
    },
  };
}

describe('layout-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers layout:compute handler', async () => {
    const { registerLayoutHandlers } = await import('../../electron/ipc/layout-handlers');
    registerLayoutHandlers();

    expect(mockIpcMain.handle).toHaveBeenCalledWith('layout:compute', expect.any(Function));
  });

  it('returns computed layout positions for valid payload', async () => {
    const { registerLayoutHandlers } = await import('../../electron/ipc/layout-handlers');
    registerLayoutHandlers();
    mockComputeLayout.mockReturnValue(new Map([['root', { x: 10, y: 20 }]]));

    const handler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'layout:compute')?.[1];
    await expect(handler(createTrustedEvent(), [], 'mindmap')).resolves.toEqual({
      root: { x: 10, y: 20 },
    });
    expect(mockComputeLayout).toHaveBeenCalledWith([], 'mindmap');
  });

  it('rejects invalid nodes payload', async () => {
    const { registerLayoutHandlers } = await import('../../electron/ipc/layout-handlers');
    registerLayoutHandlers();

    const handler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'layout:compute')?.[1];
    await expect(handler(createTrustedEvent(), {}, 'mindmap')).rejects.toThrow(
      'Layout nodes payload must be an array.'
    );
  });

  it('rejects invalid layout type payload', async () => {
    const { registerLayoutHandlers } = await import('../../electron/ipc/layout-handlers');
    registerLayoutHandlers();

    const handler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'layout:compute')?.[1];
    await expect(handler(createTrustedEvent(), [], 'invalid-layout')).rejects.toThrow('Invalid layout type.');
  });

  it('rejects untrusted sender', async () => {
    const { registerLayoutHandlers } = await import('../../electron/ipc/layout-handlers');
    registerLayoutHandlers();

    const handler = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'layout:compute')?.[1];
    await expect(handler(createUntrustedEvent(), [], 'mindmap')).rejects.toThrow(
      'Unauthorized IPC sender.'
    );
  });
});
