import { useCanvasStore } from '../../stores/canvas-store';
import { CANVAS_CONTROLS_TEXT } from '../../constants/ui-text';

export function CanvasControls() {
  const { scale, zoomIn, zoomOut, resetZoom } = useCanvasStore();

  return (
    <div className="canvas-controls glass-surface">
      <button
        className="ui-button ui-button--secondary ui-button--icon"
        onClick={zoomOut}
        title={CANVAS_CONTROLS_TEXT.zoomOut}
      >
        -
      </button>
      <span className="canvas-controls__value">{Math.round(scale * 100)}%</span>
      <button
        className="ui-button ui-button--secondary ui-button--icon"
        onClick={zoomIn}
        title={CANVAS_CONTROLS_TEXT.zoomIn}
      >
        +
      </button>
      <button
        className="ui-button ui-button--secondary ui-button--icon"
        onClick={resetZoom}
        title={CANVAS_CONTROLS_TEXT.resetZoom}
        aria-label={CANVAS_CONTROLS_TEXT.resetZoom}
      >
        R
      </button>
    </div>
  );
}
