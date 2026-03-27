import { useRef, useEffect } from 'react';
import { calculateConnectionPath } from '../../utils/geometry';
import type { Node } from '../../types';

interface ConnectionCanvasProps {
  nodes: Node[];
  nodeRects: Map<string, { x: number; y: number; width: number; height: number }>;
  color: string;
  width: number;
  dashed: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function ConnectionCanvas({
  nodes, nodeRects, color, width, dashed, scale, offsetX, offsetY,
}: ConnectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const context = canvas.getContext('2d');
    if (!context) return;
    const ctx = context;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.setLineDash(dashed ? [6, 4] : []);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;

    function drawConnections(nodeList: Node[]) {
      for (const node of nodeList) {
        if (!node.children || node.isFolded) continue;
        for (const child of node.children) {
          const from = nodeRects.get(node.id);
          const to = nodeRects.get(child.id);
          if (!from || !to) continue;
          const path = calculateConnectionPath(
            { x: from.x, y: from.y, width: from.width, height: from.height },
            { x: to.x, y: to.y, width: to.width, height: to.height }
          );
          ctx.beginPath();
          ctx.moveTo(path.start.x, path.start.y);
          ctx.bezierCurveTo(path.cp1.x, path.cp1.y, path.cp2.x, path.cp2.y, path.end.x, path.end.y);
          ctx.stroke();
        }
        drawConnections(node.children);
      }
    }

    drawConnections(nodes);
    ctx.restore();
  }, [nodes, nodeRects, color, width, dashed, scale, offsetX, offsetY]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="connection-canvas"
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%', pointerEvents: 'none',
      }}
    />
  );
}
