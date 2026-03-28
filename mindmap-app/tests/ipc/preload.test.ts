import { beforeEach, describe, expect, it, vi } from 'vitest';

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld,
  },
  ipcRenderer: {
    invoke,
  },
}));

describe('preload contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exposes electronAPI and maps bridge methods to expected IPC channels', async () => {
    await import('../../electron/preload');

    expect(exposeInMainWorld).toHaveBeenCalledWith('electronAPI', expect.any(Object));
    const electronAPI = exposeInMainWorld.mock.calls[0][1] as any;

    await electronAPI.file.open();
    await electronAPI.file.save('C:/tmp/test.mindmap', { nodes: [], metadata: {} });
    await electronAPI.file.saveAs({ nodes: [], metadata: {} });
    await electronAPI.file.create();
    await electronAPI.layout.compute([], 'mindmap');
    await electronAPI.export.toPNG({ nodes: [], metadata: {} }, 'C:/tmp/out.png', { scalePercent: 200 });
    await electronAPI.export.toSVG({ nodes: [], metadata: {} }, 'C:/tmp/out.svg');
    await electronAPI.export.toMarkdown([]);
    await electronAPI.export.saveAs({ nodes: [], metadata: {} }, 'png', { scalePercent: 150 });
    await electronAPI.window.minimize();
    await electronAPI.window.toggleMaximize();
    await electronAPI.window.close();
    await electronAPI.window.isMaximized();

    expect(invoke.mock.calls).toEqual([
      ['file:open'],
      ['file:save', 'C:/tmp/test.mindmap', { nodes: [], metadata: {} }],
      ['file:saveAs', { nodes: [], metadata: {} }],
      ['file:create'],
      ['layout:compute', [], 'mindmap'],
      ['export:toPNG', { nodes: [], metadata: {} }, 'C:/tmp/out.png', { scalePercent: 200 }],
      ['export:toSVG', { nodes: [], metadata: {} }, 'C:/tmp/out.svg'],
      ['export:toMarkdown', []],
      ['export:saveAs', { nodes: [], metadata: {} }, 'png', { scalePercent: 150 }],
      ['window:minimize'],
      ['window:toggleMaximize'],
      ['window:close'],
      ['window:isMaximized'],
    ]);
  });
});
