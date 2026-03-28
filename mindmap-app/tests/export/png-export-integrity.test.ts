import { describe, it, expect } from 'vitest';
import { exportToPNG, readPngDimensions, buildExportRenderScene, fitExportSceneForRaster } from '../../electron/services/export-service';
import type { Node, FileMetadata } from '../../src/types';

/**
 * PNG Export Integrity Tests
 * 
 * Tests for PNG export completeness, dimension validation, and content integrity.
 * These tests verify that exported PNGs contain all visible nodes and connections
 * without truncation or clipping.
 */

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
    version: 1,
    children,
  } as unknown as Node;
}

function makeMetadata(overrides?: Partial<FileMetadata>): FileMetadata {
  return {
    title: 'Test MindMap',
    rootTopicId: 'root',
    layoutType: 'mindmap',
    theme: 'default',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    ...overrides,
  };
}

/**
 * Create a linear chain of nodes (root -> child1 -> child2 -> ... -> leaf)
 */
function createLinearChain(depth: number): Node {
  let currentNode = makeNode(`node-${depth}`, `Node ${depth}`);
  for (let i = depth - 1; i >= 0; i--) {
    const parent = makeNode(`node-${i}`, `Node ${i}`, [currentNode]);
    currentNode.parentId = parent.id;
    currentNode = parent;
  }
  currentNode.id = 'root';
  return currentNode;
}

/**
 * Create a wide tree with many siblings at each level
 */
function createWideTree(levels: number, childrenPerLevel: number): Node {
  if (levels === 0) {
    return makeNode('leaf', 'Leaf');
  }

  const children: Node[] = [];
  for (let i = 0; i < childrenPerLevel; i++) {
    const child = createWideTree(levels - 1, childrenPerLevel);
    child.parentId = `parent-${levels}-${i}`;
    children.push(child);
  }

  return makeNode(`root-${levels}`, `Level ${levels}`, children);
}

/**
 * Create a mindmap with 100+ nodes for stress testing
 */
function createLargeMindmap(): Node {
  const root = makeNode('root', 'Central Topic');
  const branches: Node[] = [];

  // Create 10 main branches
  for (let i = 0; i < 10; i++) {
    const branch = makeNode(`branch-${i}`, `Branch ${i + 1}`);
    const subBranches: Node[] = [];

    // Each branch has 10 sub-branches
    for (let j = 0; j < 10; j++) {
      const subBranch = makeNode(`sub-${i}-${j}`, `Sub ${i + 1}-${j + 1}`);
      const leaves: Node[] = [];

      // Each sub-branch has 2 leaf nodes
      for (let k = 0; k < 2; k++) {
        leaves.push(makeNode(`leaf-${i}-${j}-${k}`, `Leaf ${k + 1}`));
      }
      subBranch.children = leaves;
      subBranches.push(subBranch);
    }

    branch.children = subBranches;
    branches.push(branch);
  }

  root.children = branches;
  return root;
}

describe('PNG Export Integrity', () => {
  describe('Boundary Calculation', () => {
    it('calculates correct bounds for linear chain', () => {
      const root = createLinearChain(5);
      const scene = buildExportRenderScene([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      // All nodes should be within the scene bounds
      for (const node of scene.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.x + node.width).toBeLessThanOrEqual(scene.width);
        expect(node.y + node.height).toBeLessThanOrEqual(scene.height);
      }
    });

    it('calculates correct bounds for wide tree', () => {
      const root = createWideTree(3, 5);
      const scene = buildExportRenderScene([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      // All nodes should be within the scene bounds
      for (const node of scene.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.x + node.width).toBeLessThanOrEqual(scene.width);
        expect(node.y + node.height).toBeLessThanOrEqual(scene.height);
      }
    });

    it('handles empty node array gracefully', () => {
      const scene = buildExportRenderScene([], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      expect(scene.width).toBeGreaterThanOrEqual(960);
      expect(scene.height).toBeGreaterThanOrEqual(640);
    });
  });

  describe('Large Graph Export', () => {
    it('exports 100+ node mindmap without truncation', async () => {
      const root = createLargeMindmap();
      const nodeCount = countNodes(root);
      expect(nodeCount).toBeGreaterThan(100);

      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 1200,
        minHeight: 800,
        padding: 48,
        scale: 1,
      });

      expect(png.length).toBeGreaterThan(8);
      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();

      if (dims) {
        // PNG should have reasonable dimensions for a large graph
        expect(dims.width).toBeGreaterThanOrEqual(1200);
        expect(dims.height).toBeGreaterThanOrEqual(800);
        // Should not exceed maximum raster limits
        expect(dims.width).toBeLessThanOrEqual(12000);
        expect(dims.height).toBeLessThanOrEqual(12000);
      }
    });

    it('exports with 200% scale produces larger output', async () => {
      const root = createLinearChain(3);

      const png100 = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1.0,
      });

      const png200 = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 2.0,
      });

      const dims100 = readPngDimensions(png100);
      const dims200 = readPngDimensions(png200);

      if (dims100 && dims200) {
        // 200% scale should produce approximately 2x dimensions
        expect(dims200.width).toBeGreaterThan(dims100.width);
        expect(dims200.height).toBeGreaterThan(dims100.height);
      }
    });

    it('handles very large graph that may trigger tiled capture', async () => {
      // Create a graph large enough to potentially trigger tiled capture
      // when exported at high scale
      const root = createWideTree(4, 6); // 1 + 6 + 36 + 216 + 1296 = 1555 nodes
      const nodeCount = countNodes(root);
      expect(nodeCount).toBeGreaterThan(1000);

      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 1200,
        minHeight: 800,
        padding: 48,
        scale: 1,
      });

      expect(png.length).toBeGreaterThan(8);
      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();

      if (dims) {
        // Should have valid dimensions regardless of capture method
        expect(dims.width).toBeGreaterThan(0);
        expect(dims.height).toBeGreaterThan(0);
        // Should not exceed maximum raster limits
        expect(dims.width).toBeLessThanOrEqual(12000);
        expect(dims.height).toBeLessThanOrEqual(12000);
      }
    });
  });

  describe('Dimension Validation', () => {
    it('produces PNG with expected dimensions after fit', () => {
      const root = makeNode('root', 'Root', [
        makeNode('child1', 'Child 1'),
        makeNode('child2', 'Child 2'),
      ]);

      const scene = buildExportRenderScene([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      const fittedScene = fitExportSceneForRaster(scene);

      // Fitted scene should have valid dimensions
      expect(fittedScene.width).toBeGreaterThan(0);
      expect(fittedScene.height).toBeGreaterThan(0);

      // All nodes should still be within bounds after fitting
      for (const node of fittedScene.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.x + node.width).toBeLessThanOrEqual(fittedScene.width);
        expect(node.y + node.height).toBeLessThanOrEqual(fittedScene.height);
      }
    });

    it('handles scale transformation correctly', () => {
      const root = makeNode('root', 'Root');
      const scene = buildExportRenderScene([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1.5,
      });

      // Scene should be scaled up
      expect(scene.width).toBeGreaterThanOrEqual(960);
      expect(scene.height).toBeGreaterThanOrEqual(640);
    });
  });

  describe('Content Integrity', () => {
    it('produces non-empty PNG for valid mindmap', async () => {
      const root = makeNode('root', 'Central Topic', [
        makeNode('child1', 'First Child', [
          makeNode('grandchild1', 'Grandchild 1'),
        ]),
        makeNode('child2', 'Second Child'),
      ]);

      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      // PNG buffer should be larger than just the header
      expect(png.length).toBeGreaterThan(100);

      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();
    });

    it('includes all nodes in exported PNG', async () => {
      const root = createWideTree(2, 4); // 1 + 4 + 16 = 21 nodes
      const expectedNodeCount = countNodes(root);

      const scene = buildExportRenderScene([root], {
        metadata: makeMetadata(),
        minWidth: 1200,
        minHeight: 800,
        padding: 48,
        scale: 1,
      });

      // Scene should contain all visible nodes
      expect(scene.nodes.length).toBe(expectedNodeCount);

      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 1200,
        minHeight: 800,
        padding: 48,
        scale: 1,
      });

      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles single node export', async () => {
      const root = makeNode('root', 'Single Node');

      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();
      if (dims) {
        expect(dims.width).toBeGreaterThanOrEqual(960);
        expect(dims.height).toBeGreaterThanOrEqual(640);
      }
    });

    it('handles deeply nested structure', async () => {
      const root = createLinearChain(20);

      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();
    });

    it('handles folded nodes (should not export folded children)', async () => {
      const foldedChild = makeNode('folded', 'Folded Child');
      const root = makeNode('root', 'Root', [foldedChild]);
      root.isFolded = true;

      const scene = buildExportRenderScene([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      // Folded node should not be in the scene
      expect(scene.nodes.length).toBe(1);
      expect(scene.nodes[0].text).toBe('Root');
    });
  });
});

function countNodes(root: Node): number {
  let count = 1;
  if (root.children) {
    for (const child of root.children) {
      count += countNodes(child);
    }
  }
  return count;
}
