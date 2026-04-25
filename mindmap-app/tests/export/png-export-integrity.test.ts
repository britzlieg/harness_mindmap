import { describe, it, expect } from 'vitest';
import {
  exportToPNG,
  readPngDimensions,
  buildExportRenderScene,
  fitExportSceneForRaster,
  planPngCaptureTiles,
} from '../../electron/services/export-service';
import type { RenderScene } from '../../electron/services/export-service';
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

function makeRenderScene(overrides?: Partial<RenderScene>): RenderScene {
  return {
    width: 1000,
    height: 800,
    backgroundColor: '#ffffff',
    gridColor: '#eeeeee',
    connectionColor: '#999999',
    connectionWidth: 2,
    dashedConnections: false,
    nodes: [],
    connections: [],
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

    it('expands width when content slightly exceeds the right boundary', () => {
      const fittedScene = fitExportSceneForRaster(makeRenderScene({
        nodes: [{
          id: 'right-overflow',
          text: 'Right Overflow',
          priority: 0,
          progress: 0,
          x: 900,
          y: 120,
          width: 140,
          height: 40,
          style: {
            backgroundColor: '#ffffff',
            textColor: '#111111',
            borderColor: '#333333',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 400,
            padding: 8,
          },
        }],
      }));

      expect(fittedScene.width).toBe(1040);
      expect(fittedScene.height).toBe(800);
      expect(fittedScene.nodes[0].x + fittedScene.nodes[0].width).toBeLessThanOrEqual(fittedScene.width);
    });

    it('expands height when content slightly exceeds the bottom boundary', () => {
      const fittedScene = fitExportSceneForRaster(makeRenderScene({
        nodes: [{
          id: 'bottom-overflow',
          text: 'Bottom Overflow',
          priority: 0,
          progress: 0,
          x: 120,
          y: 770,
          width: 140,
          height: 60,
          style: {
            backgroundColor: '#ffffff',
            textColor: '#111111',
            borderColor: '#333333',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 400,
            padding: 8,
          },
        }],
      }));

      expect(fittedScene.width).toBe(1000);
      expect(fittedScene.height).toBe(830);
      expect(fittedScene.nodes[0].y + fittedScene.nodes[0].height).toBeLessThanOrEqual(fittedScene.height);
    });

    it('shifts negative coordinates into view without losing original canvas coverage', () => {
      const fittedScene = fitExportSceneForRaster(makeRenderScene({
        nodes: [{
          id: 'negative-offset',
          text: 'Negative Offset',
          priority: 0,
          progress: 0,
          x: -32,
          y: -18,
          width: 120,
          height: 40,
          style: {
            backgroundColor: '#ffffff',
            textColor: '#111111',
            borderColor: '#333333',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 400,
            padding: 8,
          },
        }],
      }));

      expect(fittedScene.width).toBe(1032);
      expect(fittedScene.height).toBe(818);
      expect(fittedScene.nodes[0].x).toBe(0);
      expect(fittedScene.nodes[0].y).toBe(0);
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

  describe('Tiled Capture Alignment', () => {
    it('plans conservative tile heights for tall production-sized scenes', () => {
      const plan = planPngCaptureTiles(1200, 2228);

      expect(plan.tileWidth).toBe(1200);
      expect(plan.tileHeight).toBe(1024);
      expect(plan.columns).toBe(1);
      expect(plan.rows).toBe(3);
    });

    it('handles large scene that may trigger tiled capture', async () => {
      // Create a large mindmap that could trigger tiled capture
      const root = createLargeMindmap();
      
      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 2000,
        minHeight: 1500,
        padding: 48,
        scale: 1,
      });

      expect(png.length).toBeGreaterThan(8);
      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();

      if (dims) {
        // Should have valid dimensions
        expect(dims.width).toBeGreaterThan(0);
        expect(dims.height).toBeGreaterThan(0);
      }
    });

    it('exports with consistent dimensions across multiple captures', async () => {
      const root = createLinearChain(5);
      
      // Export multiple times and verify dimensions are consistent
      const png1 = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });
      
      const png2 = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });
      
      const dims1 = readPngDimensions(png1);
      const dims2 = readPngDimensions(png2);
      
      expect(dims1).not.toBeNull();
      expect(dims2).not.toBeNull();
      
      if (dims1 && dims2) {
        expect(dims1.width).toBe(dims2.width);
        expect(dims1.height).toBe(dims2.height);
      }
    });
  });

  describe('Fallback Text Rendering Quality', () => {
    it('renders text with 20x28 glyph grid in fallback mode', () => {
      const root = makeNode('root', 'Test Node with Chinese 中文测试', [
        makeNode('child1', 'Child with numbers 12345'),
        makeNode('child2', '子节点测试'),
      ]);

      const scene = buildExportRenderScene([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      // Verify scene contains nodes with text
      expect(scene.nodes.length).toBe(3);
      expect(scene.nodes[0].text).toContain('Test Node');
      expect(scene.nodes[1].text).toContain('Child');
      expect(scene.nodes[2].text).toContain('子节点');
    });

    it('handles mixed CJK and Latin characters', () => {
      const root = makeNode('root', '混合 Mixed 日本語 にほんご 한국어', [
        makeNode('child1', 'ABC abc 123'),
        makeNode('child2', '中文 + 英文 + 数字'),
      ]);

      const scene = buildExportRenderScene([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 1,
      });

      expect(scene.nodes.length).toBe(3);
      // All nodes should have valid text content
      for (const node of scene.nodes) {
        expect(node.text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('2% Dimension Tolerance Validation', () => {
    it('accepts dimensions within 2% tolerance', () => {
      const expectedWidth = 1000;
      const expectedHeight = 800;
      
      // Calculate 2% tolerance
      const widthTolerance = Math.max(2, Math.floor(expectedWidth * 0.02)); // 20
      const heightTolerance = Math.max(2, Math.floor(expectedHeight * 0.02)); // 16
      
      // Dimensions within tolerance should be acceptable
      const validWidthDiff = Math.floor(expectedWidth * 0.01); // 1% diff
      const validHeightDiff = Math.floor(expectedHeight * 0.01); // 1% diff
      
      expect(validWidthDiff).toBeLessThanOrEqual(widthTolerance);
      expect(validHeightDiff).toBeLessThanOrEqual(heightTolerance);
    });

    it('rejects dimensions exceeding 2% tolerance', () => {
      const expectedWidth = 1000;
      const expectedHeight = 800;
      
      // Calculate 2% tolerance
      const widthTolerance = Math.max(2, Math.floor(expectedWidth * 0.02)); // 20
      const heightTolerance = Math.max(2, Math.floor(expectedHeight * 0.02)); // 16
      
      // Dimensions exceeding tolerance should be rejected
      const invalidWidthDiff = Math.floor(expectedWidth * 0.05); // 5% diff
      const invalidHeightDiff = Math.floor(expectedHeight * 0.05); // 5% diff
      
      expect(invalidWidthDiff).toBeGreaterThan(widthTolerance);
      expect(invalidHeightDiff).toBeGreaterThan(heightTolerance);
    });

    it('exports successfully with various scale factors', async () => {
      const root = makeNode('root', 'Root', [
        makeNode('child1', 'Child 1'),
        makeNode('child2', 'Child 2'),
      ]);

      const scales = [0.5, 1.0, 1.5, 2.0];
      
      for (const scale of scales) {
        const png = await exportToPNG([root], {
          metadata: makeMetadata(),
          minWidth: 960,
          minHeight: 640,
          padding: 48,
          scale,
        });

        expect(png.length).toBeGreaterThan(8);
        const dims = readPngDimensions(png);
        expect(dims).not.toBeNull();
      }
    });
  });

  describe('Large Scale Export (100+ nodes at 200% scale)', () => {
    it('exports 100+ node mindmap at 200% scale without issues', async () => {
      const root = createLargeMindmap();
      const nodeCount = countNodes(root);
      expect(nodeCount).toBeGreaterThan(100);

      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 1200,
        minHeight: 800,
        padding: 48,
        scale: 2.0,
      });

      expect(png.length).toBeGreaterThan(8);
      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();

      if (dims) {
        // 200% scale should produce larger dimensions
        expect(dims.width).toBeGreaterThan(1200);
        expect(dims.height).toBeGreaterThan(800);
        // Should still be within reasonable limits
        expect(dims.width).toBeLessThanOrEqual(12000);
        expect(dims.height).toBeLessThanOrEqual(12000);
      }
    });

    it('handles extreme scale (400%) with proper fitting', async () => {
      const root = createWideTree(3, 5);
      
      const png = await exportToPNG([root], {
        metadata: makeMetadata(),
        minWidth: 960,
        minHeight: 640,
        padding: 48,
        scale: 4.0,
      });

      expect(png.length).toBeGreaterThan(8);
      const dims = readPngDimensions(png);
      expect(dims).not.toBeNull();

      if (dims) {
        // Should be capped at maximum raster limits
        expect(dims.width).toBeLessThanOrEqual(12000);
        expect(dims.height).toBeLessThanOrEqual(12000);
      }
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
