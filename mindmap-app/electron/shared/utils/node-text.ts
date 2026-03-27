import type { Node } from '../types';
import { DEFAULT_NEW_NODE_TEXT } from '../defaults';

export const DEFAULT_NODE_TEXT = DEFAULT_NEW_NODE_TEXT;

export function isBlankNodeText(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function ensureNodeText(value: unknown, fallback: string = DEFAULT_NODE_TEXT): string {
  return isBlankNodeText(value) ? fallback : (value as string);
}

export function normalizeNodeTextTree(nodes: Node[], fallback: string = DEFAULT_NODE_TEXT): Node[] {
  return nodes.map((node) => ({
    ...node,
    text: ensureNodeText(node.text, fallback),
    children: node.children ? normalizeNodeTextTree(node.children, fallback) : [],
  }));
}
