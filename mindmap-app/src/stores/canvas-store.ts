import { create } from 'zustand';
import { CANVAS_CONSTANTS } from '../utils/constants';

interface CanvasStore {
  scale: number;
  offsetX: number;
  offsetY: number;
  selectedNodeId: string | null;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setScale: (scale: number) => void;
  setOffset: (x: number, y: number) => void;
  pan: (dx: number, dy: number) => void;
  selectNode: (nodeId: string) => void;
  deselectAll: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  selectedNodeId: null,
  zoomIn: () => {
    const newScale = Math.min(get().scale + CANVAS_CONSTANTS.SCALE_STEP, CANVAS_CONSTANTS.MAX_SCALE);
    set({ scale: newScale });
  },
  zoomOut: () => {
    const newScale = Math.max(get().scale - CANVAS_CONSTANTS.SCALE_STEP, CANVAS_CONSTANTS.MIN_SCALE);
    set({ scale: newScale });
  },
  resetZoom: () => {
    set({ scale: 1, offsetX: 0, offsetY: 0 });
  },
  setScale: (scale) => {
    set({ scale: Math.max(CANVAS_CONSTANTS.MIN_SCALE, Math.min(CANVAS_CONSTANTS.MAX_SCALE, scale)) });
  },
  setOffset: (x, y) => set({ offsetX: x, offsetY: y }),
  pan: (dx, dy) => set((state) => ({ offsetX: state.offsetX + dx, offsetY: state.offsetY + dy })),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  deselectAll: () => set({ selectedNodeId: null }),
}));
