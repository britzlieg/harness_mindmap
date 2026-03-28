import { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/canvas-store';
import { useMindmapStore } from '../../stores/mindmap-store';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { NodeRenderer } from './NodeRenderer';
import { ConnectionCanvas } from './ConnectionCanvas';
import { CanvasControls } from './CanvasControls';
import type { Node } from '../../types';
import { computeLayout } from '../../utils/layout-algorithms';
import { getDepthAwareNodeThemeStyle, getTheme, normalizeThemeName } from '../../themes';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 36;
const LAYOUT_ORIGIN_X = 320;
const LAYOUT_ORIGIN_Y = 120;

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

export function MindMapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scale, offsetX, offsetY, selectedNodeId, selectNode, deselectAll } = useCanvasStore();
  const { nodes, metadata, updateNodeText } = useMindmapStore();
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } = useCanvasInteraction({
    containerRef,
  });

  useEffect(() => {
    if (nodes.length === 0) {
      if (selectedNodeId) deselectAll();
      return;
    }

    if (!selectedNodeId || !findNodeById(nodes, selectedNodeId)) {
      selectNode(nodes[0].id);
    }
  }, [nodes, selectedNodeId, selectNode, deselectAll]);

  useEffect(() => {
    if (editingNodeId && !findNodeById(nodes, editingNodeId)) {
      setEditingNodeId(null);
      setEditingText('');
    }
  }, [nodes, editingNodeId]);

  const handleClick = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
    },
    [selectNode]
  );

  const handleDoubleClick = useCallback((nodeId: string) => {
    const node = findNodeById(nodes, nodeId);
    if (!node) return;
    selectNode(nodeId);
    setEditingNodeId(nodeId);
    setEditingText(node.text);
  }, [nodes, selectNode]);

  const handleEditingCommit = useCallback((nodeId: string) => {
    const currentNode = findNodeById(nodes, nodeId);
    if (currentNode && currentNode.text !== editingText) {
      updateNodeText(nodeId, editingText);
    }
    setEditingNodeId(null);
    setEditingText('');
  }, [nodes, editingText, updateNodeText]);

  const handleEditingCancel = useCallback(() => {
    setEditingNodeId(null);
    setEditingText('');
  }, []);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) deselectAll();
    },
    [deselectAll]
  );

  const nodeRects = new Map<string, { x: number; y: number; width: number; height: number }>();
  const visibleNodes: Array<{ node: Node; depth: number }> = [];
  const activeTheme = getTheme(normalizeThemeName(metadata?.theme));
  const gridSize = Math.max(8, Math.round(24 * scale));
  const positions = computeLayout(nodes, metadata?.layoutType ?? 'mindmap');

  function collectVisibleNodes(nodeList: Node[], depth: number) {
    for (const node of nodeList) {
      if (!positions.has(node.id)) continue;
      visibleNodes.push({ node, depth });
      if (node.children && !node.isFolded) {
        collectVisibleNodes(node.children, depth + 1);
      }
    }
  }

  for (const [nodeId, position] of positions) {
    nodeRects.set(nodeId, {
      x: position.x + LAYOUT_ORIGIN_X,
      y: position.y + LAYOUT_ORIGIN_Y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }
  collectVisibleNodes(nodes, 0);

  return (
    <div
      ref={containerRef}
      data-testid="mindmap-canvas"
      className="canvas-stage"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: activeTheme.canvas.background,
        backgroundImage: `radial-gradient(circle at 14% 12%, rgba(34, 211, 238, 0.08), transparent 38%), radial-gradient(circle at 86% 84%, rgba(56, 189, 248, 0.07), transparent 42%), linear-gradient(${activeTheme.canvas.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${activeTheme.canvas.gridColor} 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleBackgroundClick}
    >
      <ConnectionCanvas
        nodes={nodes}
        nodeRects={nodeRects}
        color={activeTheme.connection.color}
        width={activeTheme.connection.width}
        dashed={activeTheme.connection.style === 'dashed'}
        scale={scale}
        offsetX={offsetX}
        offsetY={offsetY}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {visibleNodes.map(({ node, depth }) => {
          const rect = nodeRects.get(node.id);
          if (!rect) return null;
          const hasChildren = (node.children?.length ?? 0) > 0;
          const themeStyle = getDepthAwareNodeThemeStyle(activeTheme, depth, hasChildren);

          return (
            <NodeRenderer
              key={node.id}
              node={node}
              themeStyle={themeStyle}
              selected={selectedNodeId === node.id}
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              editing={editingNodeId === node.id}
              editingText={editingText}
              onEditingTextChange={setEditingText}
              onEditingCommit={() => handleEditingCommit(node.id)}
              onEditingCancel={handleEditingCancel}
            />
          );
        })}
      </div>

      <CanvasControls />
    </div>
  );
}
