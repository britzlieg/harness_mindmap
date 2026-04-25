import { describe, expect, it } from 'vitest';
import { exportToPNG as exportToPngCompat, readPngDimensions } from '../../electron/services/export-service';
import { exportToPNGWithDiagnostics } from '../../electron/services/export-orchestrator';
import type { FileMetadata, LayoutType, Node } from '../../src/types';

function makeNode(id: string, text: string, children: Node[] = []): Node {
  return {
    id,
    parentId: null,
    text,
    note: '',
    labels: [],
    tags: [],
    priority: 0,
    progress: 0,
    style: {},
    isFolded: false,
    positionX: null,
    positionY: null,
    orderIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children,
  };
}

function makeMetadata(layoutType: LayoutType = 'mindmap', theme: string = 'default'): FileMetadata {
  return {
    title: 'Demo',
    rootTopicId: 'root',
    layoutType,
    theme,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

describe('export-orchestrator PNG diagnostics', () => {
  it('records fallback reason on the real production chain when Electron runtime is unavailable', async () => {
    const result = await exportToPNGWithDiagnostics([makeNode('root', 'Root')], {
      metadata: makeMetadata(),
      minWidth: 320,
      minHeight: 240,
      padding: 24,
      scale: 1,
    });

    expect(result.buffer.length).toBeGreaterThan(8);
    expect(result.diagnostics.renderPath).toBe('software-fallback');
    expect(result.diagnostics.fallbackReason).toBe('electron_runtime_unavailable');
    expect(result.diagnostics.usedTiledCapture).toBe(false);
    expect(result.diagnostics.tileValidation.attempted).toBe(false);
  });

  it('keeps normalized scale semantics aligned with the compatibility export entry', async () => {
    const child = makeNode('child', 'Child');
    child.parentId = 'root';
    const root = makeNode('root', 'Root', [child]);
    const options = {
      metadata: makeMetadata('mindmap', 'default'),
      minWidth: 420,
      minHeight: 260,
      padding: 24,
      scale: 2,
    };

    const orchestrated = await exportToPNGWithDiagnostics([root], options);
    const compat = await exportToPngCompat([root], options);
    const orchestratedDims = readPngDimensions(orchestrated.buffer);
    const compatDims = readPngDimensions(compat);

    expect(orchestrated.diagnostics.scale).toBe(2);
    expect(orchestratedDims).toEqual(compatDims);
  });
});
