import { useState, useEffect } from 'react';
import { useMindmapStore } from '../../stores/mindmap-store';
import { useCanvasStore } from '../../stores/canvas-store';
import { NODE_EDITOR_TEXT } from '../../constants/ui-text';
import type { Node } from '../../types';

function findNode(nodes: Node[], id: string | null): Node | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function NodeEditor() {
  const nodes = useMindmapStore((s) => s.nodes);
  const updateNodeText = useMindmapStore((s) => s.updateNodeText);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const [text, setText] = useState('');

  const selectedNode = findNode(nodes, selectedNodeId);

  useEffect(() => {
    if (selectedNode) setText(selectedNode.text);
  }, [selectedNode]);

  if (!selectedNode) return <div className="panel-empty">{NODE_EDITOR_TEXT.empty}</div>;

  return (
    <div className="panel-stack">
      <div>
        <label className="panel-section-title">{NODE_EDITOR_TEXT.label}</label>
        <input
          type="text" value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => updateNodeText(selectedNode.id, text)}
          className="ui-input"
        />
      </div>
    </div>
  );
}
