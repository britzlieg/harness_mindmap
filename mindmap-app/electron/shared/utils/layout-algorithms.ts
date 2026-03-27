import { normalizeLayoutType } from '../types';
import type { Node, LayoutType } from '../types';
import { CANVAS_CONSTANTS } from './constants';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 36;

function estimateNodeWidth(node: Node): number {
  return Math.max(NODE_WIDTH, node.text.length * 8 + 24);
}

function estimateNodeHeight(_node: Node): number {
  return NODE_HEIGHT;
}

export function computeMindmapLayout(roots: Node[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (roots.length === 0) return positions;

  const root = roots[0];

  function layoutSubtree(node: Node, x: number, y: number, direction: 1 | -1): number {
    const width = estimateNodeWidth(node);
    const height = estimateNodeHeight(node);
    positions.set(node.id, { x, y });

    if (!node.children || node.children.length === 0 || node.isFolded) {
      return height;
    }

    let childY = y;
    const childX = x + direction * (width + CANVAS_CONSTANTS.LEVEL_SPACING_X);

    for (const child of node.children) {
      const subtreeHeight = layoutSubtree(child, childX, childY, direction);
      childY += subtreeHeight + CANVAS_CONSTANTS.SIBLING_SPACING_Y;
    }

    return childY - y - CANVAS_CONSTANTS.SIBLING_SPACING_Y;
  }

  const rootWidth = estimateNodeWidth(root);
  positions.set(root.id, { x: 0, y: 0 });

  if (!root.children || root.children.length === 0) return positions;

  const mid = Math.ceil(root.children.length / 2);
  const leftChildren = root.children.slice(0, mid);
  const rightChildren = root.children.slice(mid);

  let leftY = 0;
  for (const child of leftChildren) {
    const h = layoutSubtree(child, -(rootWidth + CANVAS_CONSTANTS.LEVEL_SPACING_X), leftY, -1);
    leftY += h + CANVAS_CONSTANTS.SIBLING_SPACING_Y;
  }

  let rightY = 0;
  for (const child of rightChildren) {
    const h = layoutSubtree(child, rootWidth + CANVAS_CONSTANTS.LEVEL_SPACING_X, rightY, 1);
    rightY += h + CANVAS_CONSTANTS.SIBLING_SPACING_Y;
  }

  return positions;
}

export function computeLogicLayout(roots: Node[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  function layoutSubtree(node: Node, x: number, y: number): number {
    const width = estimateNodeWidth(node);
    const height = estimateNodeHeight(node);
    positions.set(node.id, { x, y });

    if (!node.children || node.children.length === 0 || node.isFolded) {
      return height;
    }

    let childY = y;
    const childX = x + width + CANVAS_CONSTANTS.LEVEL_SPACING_X;

    for (const child of node.children) {
      const subtreeHeight = layoutSubtree(child, childX, childY);
      childY += subtreeHeight + CANVAS_CONSTANTS.SIBLING_SPACING_Y;
    }

    const firstChild = positions.get(node.children[0].id)!;
    const lastChild = positions.get(node.children[node.children.length - 1].id)!;
    positions.set(node.id, { x, y: (firstChild.y + lastChild.y) / 2 });

    return childY - y - CANVAS_CONSTANTS.SIBLING_SPACING_Y;
  }

  let y = 0;
  for (const root of roots) {
    const h = layoutSubtree(root, 0, y);
    y += h + CANVAS_CONSTANTS.BRANCH_SPACING;
  }

  return positions;
}

function computeDirectionalTreeLayout(
  roots: Node[],
  direction: 1 | -1
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  function layoutSubtree(node: Node, x: number, y: number): number {
    const width = estimateNodeWidth(node);
    const height = estimateNodeHeight(node);
    positions.set(node.id, { x, y });

    if (!node.children || node.children.length === 0 || node.isFolded) {
      return height;
    }

    let childY = y;
    const childX = x + direction * (width + CANVAS_CONSTANTS.LEVEL_SPACING_X);

    for (const child of node.children) {
      const subtreeHeight = layoutSubtree(child, childX, childY);
      childY += subtreeHeight + CANVAS_CONSTANTS.SIBLING_SPACING_Y;
    }

    const firstChild = positions.get(node.children[0].id)!;
    const lastChild = positions.get(node.children[node.children.length - 1].id)!;
    positions.set(node.id, { x, y: (firstChild.y + lastChild.y) / 2 });

    return childY - y - CANVAS_CONSTANTS.SIBLING_SPACING_Y;
  }

  let y = 0;
  for (const root of roots) {
    const h = layoutSubtree(root, 0, y);
    y += h + CANVAS_CONSTANTS.BRANCH_SPACING;
  }

  return positions;
}

export function computeTreeRightLayout(roots: Node[]): Map<string, { x: number; y: number }> {
  return computeDirectionalTreeLayout(roots, 1);
}

export function computeTreeLeftLayout(roots: Node[]): Map<string, { x: number; y: number }> {
  return computeDirectionalTreeLayout(roots, -1);
}

export function computeOrgLayout(roots: Node[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  function getSubtreeWidth(node: Node): number {
    const width = estimateNodeWidth(node);
    if (!node.children || node.children.length === 0 || node.isFolded) return width;
    let total = 0;
    for (const child of node.children) {
      total += getSubtreeWidth(child) + CANVAS_CONSTANTS.BRANCH_SPACING;
    }
    return Math.max(width, total - CANVAS_CONSTANTS.BRANCH_SPACING);
  }

  function layoutSubtree(node: Node, x: number, y: number): void {
    const width = estimateNodeWidth(node);
    const subtreeWidth = getSubtreeWidth(node);
    positions.set(node.id, { x: x + (subtreeWidth - width) / 2, y });

    if (!node.children || node.children.length === 0 || node.isFolded) return;

    let childX = x;
    const childY = y + NODE_HEIGHT + CANVAS_CONSTANTS.LEVEL_SPACING_X;
    for (const child of node.children) {
      const childWidth = getSubtreeWidth(child);
      layoutSubtree(child, childX, childY);
      childX += childWidth + CANVAS_CONSTANTS.BRANCH_SPACING;
    }
  }

  let x = 0;
  for (const root of roots) {
    layoutSubtree(root, x, 0);
    x += getSubtreeWidth(root) + CANVAS_CONSTANTS.BRANCH_SPACING * 2;
  }

  return positions;
}

export function computeLayout(
  roots: Node[],
  type: LayoutType
): Map<string, { x: number; y: number }> {
  switch (normalizeLayoutType(type)) {
    case 'mindmap': return computeMindmapLayout(roots);
    case 'logic': return computeLogicLayout(roots);
    case 'org': return computeOrgLayout(roots);
    case 'tree-right': return computeTreeRightLayout(roots);
    case 'tree-left': return computeTreeLeftLayout(roots);
    default: return computeMindmapLayout(roots);
  }
}
