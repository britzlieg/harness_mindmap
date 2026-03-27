import { useCallback, useRef } from 'react';
import { useCanvasStore } from '../stores/canvas-store';

interface UseCanvasInteractionOptions {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useCanvasInteraction({ containerRef }: UseCanvasInteractionOptions) {
  void containerRef;
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const { pan, setScale, scale } = useCanvasStore();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      pan(dx, dy);
    },
    [pan]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.1, Math.min(5.0, scale + delta));
      setScale(newScale);
    },
    [scale, setScale]
  );

  return { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel };
}
