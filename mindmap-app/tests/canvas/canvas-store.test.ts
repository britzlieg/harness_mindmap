import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../../src/stores/canvas-store';
import { CANVAS_CONSTANTS } from '../../src/utils/constants';

describe('canvas-store', () => {
  beforeEach(() => {
    useCanvasStore.setState({ scale: 1, offsetX: 0, offsetY: 0, selectedNodeId: null });
  });

  it('should have correct default state', () => {
    const state = useCanvasStore.getState();
    expect(state.scale).toBe(1);
    expect(state.offsetX).toBe(0);
    expect(state.offsetY).toBe(0);
    expect(state.selectedNodeId).toBeNull();
  });

  describe('zoomIn', () => {
    it('should increase scale by SCALE_STEP', () => {
      useCanvasStore.getState().zoomIn();
      expect(useCanvasStore.getState().scale).toBeCloseTo(1.1);
    });

    it('should clamp to MAX_SCALE', () => {
      useCanvasStore.setState({ scale: CANVAS_CONSTANTS.MAX_SCALE });
      useCanvasStore.getState().zoomIn();
      expect(useCanvasStore.getState().scale).toBe(CANVAS_CONSTANTS.MAX_SCALE);
    });
  });

  describe('zoomOut', () => {
    it('should decrease scale by SCALE_STEP', () => {
      useCanvasStore.getState().zoomOut();
      expect(useCanvasStore.getState().scale).toBeCloseTo(0.9);
    });

    it('should clamp to MIN_SCALE', () => {
      useCanvasStore.setState({ scale: CANVAS_CONSTANTS.MIN_SCALE });
      useCanvasStore.getState().zoomOut();
      expect(useCanvasStore.getState().scale).toBe(CANVAS_CONSTANTS.MIN_SCALE);
    });
  });

  describe('resetZoom', () => {
    it('should reset scale and offsets to defaults', () => {
      useCanvasStore.setState({ scale: 2.5, offsetX: 100, offsetY: -50 });
      useCanvasStore.getState().resetZoom();
      const state = useCanvasStore.getState();
      expect(state.scale).toBe(1);
      expect(state.offsetX).toBe(0);
      expect(state.offsetY).toBe(0);
    });
  });

  describe('setScale', () => {
    it('should set scale within bounds', () => {
      useCanvasStore.getState().setScale(2.5);
      expect(useCanvasStore.getState().scale).toBe(2.5);
    });

    it('should clamp to MIN_SCALE', () => {
      useCanvasStore.getState().setScale(0.01);
      expect(useCanvasStore.getState().scale).toBe(CANVAS_CONSTANTS.MIN_SCALE);
    });

    it('should clamp to MAX_SCALE', () => {
      useCanvasStore.getState().setScale(10);
      expect(useCanvasStore.getState().scale).toBe(CANVAS_CONSTANTS.MAX_SCALE);
    });
  });

  describe('setOffset', () => {
    it('should set offset values', () => {
      useCanvasStore.getState().setOffset(42, -17);
      const state = useCanvasStore.getState();
      expect(state.offsetX).toBe(42);
      expect(state.offsetY).toBe(-17);
    });
  });

  describe('pan', () => {
    it('should add delta to current offset', () => {
      useCanvasStore.setState({ offsetX: 10, offsetY: 20 });
      useCanvasStore.getState().pan(5, -3);
      const state = useCanvasStore.getState();
      expect(state.offsetX).toBe(15);
      expect(state.offsetY).toBe(17);
    });
  });

  describe('selectNode', () => {
    it('should set selectedNodeId', () => {
      useCanvasStore.getState().selectNode('abc-123');
      expect(useCanvasStore.getState().selectedNodeId).toBe('abc-123');
    });
  });

  describe('deselectAll', () => {
    it('should clear selectedNodeId', () => {
      useCanvasStore.setState({ selectedNodeId: 'abc-123' });
      useCanvasStore.getState().deselectAll();
      expect(useCanvasStore.getState().selectedNodeId).toBeNull();
    });
  });
});
