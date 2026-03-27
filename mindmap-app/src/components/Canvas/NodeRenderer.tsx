import type { Node, NodeStyle } from '../../types';

interface NodeRendererProps {
  node: Node;
  themeStyle?: NodeStyle;
  selected: boolean;
  onClick: (nodeId: string) => void;
  onDoubleClick: (nodeId: string) => void;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  editing?: boolean;
  editingText?: string;
  onEditingTextChange?: (text: string) => void;
  onEditingCommit?: () => void;
  onEditingCancel?: () => void;
}

function mergeNodeStyles(themeStyle: NodeStyle, nodeStyle: NodeStyle): NodeStyle {
  return {
    backgroundColor: nodeStyle.backgroundColor ?? themeStyle.backgroundColor,
    textColor: nodeStyle.textColor ?? themeStyle.textColor,
    borderColor: nodeStyle.borderColor ?? themeStyle.borderColor,
    borderRadius: nodeStyle.borderRadius ?? themeStyle.borderRadius,
    fontSize: nodeStyle.fontSize ?? themeStyle.fontSize,
    fontWeight: nodeStyle.fontWeight ?? themeStyle.fontWeight,
    padding: nodeStyle.padding ?? themeStyle.padding,
  };
}

export function NodeRenderer({
  node,
  themeStyle,
  selected,
  onClick,
  onDoubleClick,
  x,
  y,
  width,
  height,
  editing,
  editingText,
  onEditingTextChange,
  onEditingCommit,
  onEditingCancel,
}: NodeRendererProps) {
  const resolvedStyle = mergeNodeStyles(themeStyle ?? {}, node.style);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: x ?? node.positionX ?? 0,
    top: y ?? node.positionY ?? 0,
    width,
    minHeight: height,
    backgroundColor: resolvedStyle.backgroundColor || '#f0f0f0',
    color: resolvedStyle.textColor || '#333333',
    borderRadius: resolvedStyle.borderRadius || 8,
    fontSize: resolvedStyle.fontSize || 14,
    fontWeight: resolvedStyle.fontWeight || 400,
    padding: resolvedStyle.padding || 8,
    minWidth: 80,
    maxWidth: 300,
    cursor: 'pointer',
    userSelect: 'none',
    border: `1px solid ${resolvedStyle.borderColor || '#d9d9d9'}`,
    boxShadow: selected ? '0 0 0 2px #1890ff' : '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.15s ease',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={style}
      onClick={() => onClick(node.id)}
      onDoubleClick={() => onDoubleClick(node.id)}
      data-node-id={node.id}
    >
      {editing ? (
        <input
          data-testid={`node-inline-input-${node.id}`}
          autoFocus
          type="text"
          value={editingText ?? ''}
          onChange={(e) => onEditingTextChange?.(e.target.value)}
          onBlur={() => onEditingCommit?.()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEditingCommit?.();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onEditingCancel?.();
            }
          }}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            padding: 0,
            margin: 0,
          }}
        />
      ) : (
        <span>{node.text || '新节点'}</span>
      )}
      {node.priority > 0 && (
        <span style={{
          marginLeft: 8, fontSize: 10, backgroundColor: '#ff4d4f',
          color: '#fff', borderRadius: 4, padding: '1px 4px',
        }}>
          P{node.priority}
        </span>
      )}
      {node.progress > 0 && (
        <div role="progressbar" style={{
          marginTop: 4, height: 3, backgroundColor: '#e0e0e0',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: `${node.progress * 100}%`, height: '100%',
            backgroundColor: '#52c41a', transition: 'width 0.3s ease',
          }} />
        </div>
      )}
    </div>
  );
}
