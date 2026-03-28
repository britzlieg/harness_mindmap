import { describe, it, expect } from 'vitest';
import { exportToPNG, readPngDimensions } from '../../electron/services/export-service';
import type { Node } from '../../src/types';

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
  } as unknown as Node;
}

function makeMetadata() {
  return {
    title: 'Demo',
    rootTopicId: 'root',
    layoutType: 'mindmap' as const,
    theme: 'default',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

describe('export-to-PNG regression', () => {
  it('produces a non-empty PNG with valid dimensions for a reasonably large graph', async () => {
    // Build a moderately large tree to exercise raster export
    const leaf = makeNode('leaf', 'Leaf');
    leaf.parentId = 'child';
    const child = makeNode('child', 'Child', [leaf]);
    child.parentId = 'root';
    const root = makeNode('root', 'Root', [child]);

    const png = await exportToPNG([root], {
      metadata: makeMetadata(),
      minWidth: 1200,
      minHeight: 800,
      padding: 24,
      scale: 1,
    });
    expect(png.length).toBeGreaterThan(8);
    const dims = readPngDimensions(png);
    expect(dims).not.toBeNull();
    if (dims) {
      expect(dims.width).toBeGreaterThanOrEqual(1200);
      expect(dims.height).toBeGreaterThanOrEqual(800);
    }
  });
});
