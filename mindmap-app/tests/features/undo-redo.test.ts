import { describe, it, expect, beforeEach } from 'vitest';
import { useMindmapStore } from '../../src/stores/mindmap-store';

describe('undo/redo', () => {
  beforeEach(() => {
    useMindmapStore.setState({
      nodes: [
        {
          id: 'root',
          parentId: null,
          text: 'Root',
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
        },
      ],
      undoStack: [],
      redoStack: [],
      metadata: null,
      filePath: null,
    });
  });

  it('records snapshot on addNode', () => {
    const { addNode } = useMindmapStore.getState();
    addNode('root', 'Child 1');
    expect(useMindmapStore.getState().undoStack.length).toBe(1);
    expect(useMindmapStore.getState().undoStack[0]).toHaveLength(1);
  });

  it('undo restores previous state', () => {
    const { addNode, undo } = useMindmapStore.getState();
    addNode('root', 'Child 1');
    expect(useMindmapStore.getState().nodes[0].children).toHaveLength(1);
    undo();
    expect(useMindmapStore.getState().nodes[0].children).toHaveLength(0);
    expect(useMindmapStore.getState().redoStack.length).toBe(1);
  });

  it('redo restores undone state', () => {
    const { addNode, undo, redo } = useMindmapStore.getState();
    addNode('root', 'Child 1');
    undo();
    redo();
    expect(useMindmapStore.getState().nodes[0].children).toHaveLength(1);
    expect(useMindmapStore.getState().undoStack.length).toBe(1);
  });

  it('clears redo on new action', () => {
    const { addNode, undo } = useMindmapStore.getState();
    addNode('root', 'Child 1');
    undo();
    expect(useMindmapStore.getState().redoStack.length).toBe(1);
    addNode('root', 'Child 2');
    expect(useMindmapStore.getState().redoStack.length).toBe(0);
  });

  it('limits undo stack to 50 entries', () => {
    const { addNode } = useMindmapStore.getState();
    for (let i = 0; i < 55; i++) {
      addNode('root', `Child ${i}`);
    }
    expect(useMindmapStore.getState().undoStack.length).toBeLessThanOrEqual(50);
  });

  it('does not crash on empty undo stack', () => {
    const { undo, redo } = useMindmapStore.getState();
    expect(() => undo()).not.toThrow();
    expect(() => redo()).not.toThrow();
    expect(useMindmapStore.getState().nodes).toHaveLength(1);
  });

  it('initializes a blank document with a root node without creating undo history', () => {
    useMindmapStore.setState({
      nodes: [],
      undoStack: [],
      redoStack: [],
      metadata: null,
      filePath: null,
    });

    const { initializeDocument } = useMindmapStore.getState();
    const root = initializeDocument();
    const state = useMindmapStore.getState();

    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].id).toBe(root.id);
    expect(state.nodes[0].text).toBe('Central Topic');
    expect(state.metadata?.rootTopicId).toBe(root.id);
    expect(state.undoStack).toHaveLength(0);
  });

  it('snapshot records on updateNodeText', () => {
    const { updateNodeText } = useMindmapStore.getState();
    updateNodeText('root', 'Updated');
    expect(useMindmapStore.getState().undoStack.length).toBe(1);
    expect(useMindmapStore.getState().undoStack[0][0].text).toBe('Root');
  });

  it('snapshot records on deleteNode', () => {
    const { addNode, deleteNode } = useMindmapStore.getState();
    addNode('root', 'ToDelete');
    const childId = useMindmapStore.getState().nodes[0].children![0].id;
    deleteNode(childId);
    expect(useMindmapStore.getState().undoStack.length).toBe(2);
    expect(useMindmapStore.getState().nodes[0].children).toHaveLength(0);
  });

  it('snapshot records on toggleFold', () => {
    const { toggleFold } = useMindmapStore.getState();
    toggleFold('root');
    expect(useMindmapStore.getState().nodes[0].isFolded).toBe(true);
    expect(useMindmapStore.getState().undoStack.length).toBe(1);
    toggleFold('root');
    expect(useMindmapStore.getState().undoStack.length).toBe(2);
    expect(useMindmapStore.getState().nodes[0].isFolded).toBe(false);
  });
});
