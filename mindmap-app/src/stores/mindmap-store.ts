import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Node, FileMetadata } from '../types';
import { ensureNodeText, normalizeNodeTextTree } from '../utils/node-text';
import {
  DEFAULT_LAYOUT_TYPE,
  DEFAULT_MINDMAP_TITLE,
  DEFAULT_ROOT_TOPIC_TEXT,
  DEFAULT_THEME_NAME,
  MINDMAP_DOCUMENT_VERSION,
} from '../../electron/shared/defaults';

const MAX_UNDO_SIZE = 50;

interface MindmapStore {
  nodes: Node[];
  metadata: FileMetadata | null;
  filePath: string | null;
  undoStack: Node[][];
  redoStack: Node[][];
  initializeDocument: () => Node;
  setNodes: (nodes: Node[]) => void;
  setMetadata: (metadata: FileMetadata) => void;
  setFilePath: (path: string) => void;
  addNode: (parentId: string, text?: string) => Node;
  createRootNode: () => Node;
  updateNodeText: (nodeId: string, text: string) => void;
  deleteNode: (nodeId: string) => void;
  toggleFold: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
}

function deepCloneNodes(nodes: Node[]): Node[] {
  return JSON.parse(JSON.stringify(nodes));
}

function findNodeById(nodes: Node[], id: string): Node | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }

  return null;
}

function updateNodeInTree(nodes: Node[], id: string, updates: Partial<Node>): Node[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, ...updates, updatedAt: Date.now() };
    if (node.children) return { ...node, children: updateNodeInTree(node.children, id, updates) };
    return node;
  });
}

function removeNodeFromTree(nodes: Node[], id: string): Node[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => {
      if (node.children) return { ...node, children: removeNodeFromTree(node.children, id) };
      return node;
    });
}

function pushUndo(undoStack: Node[][], nodes: Node[]): Node[][] {
  const next = [...undoStack, deepCloneNodes(nodes)];
  if (next.length > MAX_UNDO_SIZE) next.shift();
  return next;
}

function createNode(params: {
  parentId: string | null;
  text: string;
  orderIndex: number;
}): Node {
  const now = Date.now();

  return {
    id: uuidv4(),
    parentId: params.parentId,
    text: ensureNodeText(params.text),
    note: '',
    labels: [],
    tags: [],
    priority: 0,
    progress: 0,
    style: {},
    isFolded: false,
    positionX: null,
    positionY: null,
    orderIndex: params.orderIndex,
    createdAt: now,
    updatedAt: now,
    children: [],
  };
}

function createDefaultMetadata(rootTopicId: string): FileMetadata {
  const now = Date.now();

  return {
    title: DEFAULT_MINDMAP_TITLE,
    rootTopicId,
    layoutType: DEFAULT_LAYOUT_TYPE,
    theme: DEFAULT_THEME_NAME,
    createdAt: now,
    updatedAt: now,
    version: MINDMAP_DOCUMENT_VERSION,
  };
}

export const useMindmapStore = create<MindmapStore>((set, get) => ({
  nodes: [],
  metadata: null,
  filePath: null,
  undoStack: [],
  redoStack: [],
  initializeDocument: () => {
    const state = get();
    if (state.nodes.length > 0) return state.nodes[0];

    const root = createNode({
      parentId: null,
      text: DEFAULT_ROOT_TOPIC_TEXT,
      orderIndex: 0,
    });

    set({
      nodes: [root],
      metadata: state.metadata ?? createDefaultMetadata(root.id),
      redoStack: [],
    });

    return root;
  },
  setNodes: (nodes) => set({ nodes: normalizeNodeTextTree(nodes) }),
  setMetadata: (metadata) => set({ metadata }),
  setFilePath: (path) => set({ filePath: path }),
  createRootNode: () => {
    const state = get();
    const root = createNode({
      parentId: null,
      text: DEFAULT_ROOT_TOPIC_TEXT,
      orderIndex: 0,
    });

    set({
      nodes: [root],
      metadata: state.metadata ?? createDefaultMetadata(root.id),
      undoStack: state.nodes.length > 0 ? pushUndo(state.undoStack, state.nodes) : state.undoStack,
      redoStack: [],
    });

    return root;
  },
  addNode: (parentId, text = '') => {
    const state = get();
    const parent = findNodeById(state.nodes, parentId);
    const newNode = createNode({
      parentId,
      text: ensureNodeText(text),
      orderIndex: parent?.children ? parent.children.length : 0,
    });

    if (!parent) return newNode;

    const newNodes = updateNodeInTree(state.nodes, parentId, {
      children: [...(parent.children || []), newNode],
    });

    set({
      nodes: newNodes,
      undoStack: pushUndo(state.undoStack, state.nodes),
      redoStack: [],
    });

    return newNode;
  },
  updateNodeText: (nodeId, text) => {
    const state = get();
    set({
      nodes: updateNodeInTree(state.nodes, nodeId, { text: ensureNodeText(text) }),
      undoStack: pushUndo(state.undoStack, state.nodes),
      redoStack: [],
    });
  },
  deleteNode: (nodeId) => {
    const state = get();
    set({
      nodes: removeNodeFromTree(state.nodes, nodeId),
      undoStack: pushUndo(state.undoStack, state.nodes),
      redoStack: [],
    });
  },
  toggleFold: (nodeId) => {
    const state = get();
    const node = findNodeById(state.nodes, nodeId);
    if (!node) return;

    set({
      nodes: updateNodeInTree(state.nodes, nodeId, { isFolded: !node.isFolded }),
      undoStack: pushUndo(state.undoStack, state.nodes),
      redoStack: [],
    });
  },
  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    const prev = state.undoStack[state.undoStack.length - 1];
    set({
      nodes: prev,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, deepCloneNodes(state.nodes)],
    });
  },
  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    const next = state.redoStack[state.redoStack.length - 1];
    set({
      nodes: next,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, deepCloneNodes(state.nodes)],
    });
  },
}));
