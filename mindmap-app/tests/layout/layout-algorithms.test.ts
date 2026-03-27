import { describe, it, expect } from 'vitest';
import type { Node } from '../../src/types';
import {
  computeMindmapLayout,
  computeLogicLayout,
  computeOrgLayout,
  computeTreeRightLayout,
  computeTreeLeftLayout,
  computeLayout,
} from '../../src/utils/layout-algorithms';

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: 'node-' + Math.random().toString(36).slice(2, 8),
    parentId: null,
    text: 'Test Node',
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
    children: [],
    ...overrides,
  };
}

describe('computeMindmapLayout', () => {
  it('places root at origin', () => {
    const root = makeNode({ id: 'root', text: 'Root' });
    const positions = computeMindmapLayout([root]);
    expect(positions.get('root')).toEqual({ x: 0, y: 0 });
  });

  it('splits children left and right', () => {
    const child1 = makeNode({ id: 'c1', text: 'Left 1' });
    const child2 = makeNode({ id: 'c2', text: 'Left 2' });
    const child3 = makeNode({ id: 'c3', text: 'Right 1' });
    const root = makeNode({ id: 'root', text: 'Root', children: [child1, child2, child3] });

    const positions = computeMindmapLayout([root]);
    const rootPos = positions.get('root')!;
    const c1Pos = positions.get('c1')!;
    const c3Pos = positions.get('c3')!;

    expect(rootPos).toEqual({ x: 0, y: 0 });
    expect(c1Pos.x).toBeLessThan(rootPos.x);
    expect(c3Pos.x).toBeGreaterThan(rootPos.x);
  });

  it('handles deep nesting', () => {
    const grandchild = makeNode({ id: 'gc', text: 'Grandchild' });
    const child = makeNode({ id: 'c', text: 'Child', children: [grandchild] });
    const root = makeNode({ id: 'root', text: 'Root', children: [child] });

    const positions = computeMindmapLayout([root]);
    expect(positions.has('gc')).toBe(true);
    expect(positions.get('gc')!.x).not.toBe(0);
  });

  it('skips folded children', () => {
    const grandchild = makeNode({ id: 'gc', text: 'Grandchild' });
    const child = makeNode({ id: 'c', text: 'Child', children: [grandchild], isFolded: true });
    const root = makeNode({ id: 'root', text: 'Root', children: [child] });

    const positions = computeMindmapLayout([root]);
    expect(positions.has('root')).toBe(true);
    expect(positions.has('c')).toBe(true);
    expect(positions.has('gc')).toBe(false);
  });

  it('returns empty map for empty roots', () => {
    const positions = computeMindmapLayout([]);
    expect(positions.size).toBe(0);
  });
});

describe('computeLogicLayout', () => {
  it('places root at x=0', () => {
    const root = makeNode({ id: 'root', text: 'Root' });
    const positions = computeLogicLayout([root]);
    expect(positions.get('root')!.x).toBe(0);
  });

  it('places children to the right of parent', () => {
    const child = makeNode({ id: 'c', text: 'Child' });
    const root = makeNode({ id: 'root', text: 'Root', children: [child] });

    const positions = computeLogicLayout([root]);
    expect(positions.get('c')!.x).toBeGreaterThan(positions.get('root')!.x);
  });

  it('centers parent vertically between children', () => {
    const c1 = makeNode({ id: 'c1', text: 'A' });
    const c2 = makeNode({ id: 'c2', text: 'B' });
    const root = makeNode({ id: 'root', text: 'Root', children: [c1, c2] });

    const positions = computeLogicLayout([root]);
    const rPos = positions.get('root')!;
    const c1Pos = positions.get('c1')!;
    const c2Pos = positions.get('c2')!;

    expect(rPos.y).toBeCloseTo((c1Pos.y + c2Pos.y) / 2, 1);
  });
});

describe('computeOrgLayout', () => {
  it('places children below parent', () => {
    const child = makeNode({ id: 'c', text: 'Child' });
    const root = makeNode({ id: 'root', text: 'Root', children: [child] });

    const positions = computeOrgLayout([root]);
    expect(positions.get('c')!.y).toBeGreaterThan(positions.get('root')!.y);
  });

  it('spreads children horizontally', () => {
    const c1 = makeNode({ id: 'c1', text: 'A' });
    const c2 = makeNode({ id: 'c2', text: 'B' });
    const root = makeNode({ id: 'root', text: 'Root', children: [c1, c2] });

    const positions = computeOrgLayout([root]);
    expect(positions.get('c1')!.x).not.toBe(positions.get('c2')!.x);
  });
});

describe('computeTreeRightLayout', () => {
  it('places children to the right of parent', () => {
    const child = makeNode({ id: 'c', text: 'Child' });
    const root = makeNode({ id: 'root', text: 'Root', children: [child] });

    const positions = computeTreeRightLayout([root]);
    expect(positions.get('c')!.x).toBeGreaterThan(positions.get('root')!.x);
  });

  it('skips descendants of folded nodes', () => {
    const grandchild = makeNode({ id: 'gc', text: 'Grandchild' });
    const child = makeNode({ id: 'c', text: 'Child', children: [grandchild], isFolded: true });
    const root = makeNode({ id: 'root', text: 'Root', children: [child] });

    const positions = computeTreeRightLayout([root]);
    expect(positions.has('root')).toBe(true);
    expect(positions.has('c')).toBe(true);
    expect(positions.has('gc')).toBe(false);
  });
});

describe('computeTreeLeftLayout', () => {
  it('places children to the left of parent', () => {
    const child = makeNode({ id: 'c', text: 'Child' });
    const root = makeNode({ id: 'root', text: 'Root', children: [child] });

    const positions = computeTreeLeftLayout([root]);
    expect(positions.get('c')!.x).toBeLessThan(positions.get('root')!.x);
  });

  it('preserves sibling vertical separation', () => {
    const c1 = makeNode({ id: 'c1', text: 'A' });
    const c2 = makeNode({ id: 'c2', text: 'B' });
    const root = makeNode({ id: 'root', text: 'Root', children: [c1, c2] });

    const positions = computeTreeLeftLayout([root]);
    expect(positions.get('c1')!.y).not.toBe(positions.get('c2')!.y);
  });
});

describe('computeLayout', () => {
  it('dispatches to mindmap algorithm', () => {
    const root = makeNode({ id: 'root', text: 'Root' });
    const mindmapPos = computeMindmapLayout([root]);
    const dispatched = computeLayout([root], 'mindmap');
    expect(dispatched).toEqual(mindmapPos);
  });

  it('dispatches to logic algorithm', () => {
    const root = makeNode({ id: 'root', text: 'Root' });
    const logicPos = computeLogicLayout([root]);
    const dispatched = computeLayout([root], 'logic');
    expect(dispatched).toEqual(logicPos);
  });

  it('dispatches to org algorithm', () => {
    const root = makeNode({ id: 'root', text: 'Root' });
    const orgPos = computeOrgLayout([root]);
    const dispatched = computeLayout([root], 'org');
    expect(dispatched).toEqual(orgPos);
  });

  it('dispatches to tree-right algorithm', () => {
    const root = makeNode({ id: 'root', text: 'Root' });
    const treeRightPos = computeTreeRightLayout([root]);
    const dispatched = computeLayout([root], 'tree-right');
    expect(dispatched).toEqual(treeRightPos);
  });

  it('dispatches to tree-left algorithm', () => {
    const root = makeNode({ id: 'root', text: 'Root' });
    const treeLeftPos = computeTreeLeftLayout([root]);
    const dispatched = computeLayout([root], 'tree-left');
    expect(dispatched).toEqual(treeLeftPos);
  });

  it('defaults to mindmap for unknown type', () => {
    const root = makeNode({ id: 'root', text: 'Root' });
    const mindmapPos = computeMindmapLayout([root]);
    const dispatched = computeLayout([root], 'unknown' as any);
    expect(dispatched).toEqual(mindmapPos);
  });
});
