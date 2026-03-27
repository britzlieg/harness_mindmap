import { useRef, useEffect } from 'react';
import { calculateConnectionPath, Rect } from '../../utils/geometry';

interface ConnectionLineProps {
  fromRect: Rect;
  toRect: Rect;
  color: string;
  width: number;
  dashed?: boolean;
}

export function ConnectionLine({ fromRect, toRect, color, width, dashed }: ConnectionLineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const path = calculateConnectionPath(fromRect, toRect);

    ctx.beginPath();
    ctx.moveTo(path.start.x, path.start.y);
    ctx.bezierCurveTo(path.cp1.x, path.cp1.y, path.cp2.x, path.cp2.y, path.end.x, path.end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [6, 4] : []);
    ctx.stroke();
  }, [fromRect, toRect, color, width, dashed]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    />
  );
}
