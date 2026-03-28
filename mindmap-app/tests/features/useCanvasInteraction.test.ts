import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCanvasInteraction } from '../../src/hooks/useCanvasInteraction';
import { useCanvasStore } from '../../src/stores/canvas-store';

function createInteractionHook(scale: number, pan = vi.fn(), setScale = vi.fn()) {
  useCanvasStore.setState({
    scale,
    pan,
    setScale,
    offsetX: 0,
    offsetY: 0,
    selectedNodeId: null,
  });

  const { result } = renderHook(() => useCanvasInteraction({
    containerRef: { current: null },
  }));

  return { result, pan, setScale };
}

describe('useCanvasInteraction', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts panning with Alt+left click and sends movement delta', () => {
    const { result, pan } = createInteractionHook(1);

    act(() => {
      result.current.handleMouseDown({
        button: 0,
        altKey: true,
        clientX: 10,
        clientY: 12,
      } as any);
    });
    act(() => {
      result.current.handleMouseMove({
        clientX: 25,
        clientY: 20,
      } as any);
    });

    expect(pan).toHaveBeenCalledWith(15, 8);
  });

  it('stops panning after mouse up', () => {
    const { result, pan } = createInteractionHook(1);

    act(() => {
      result.current.handleMouseDown({
        button: 1,
        clientX: 0,
        clientY: 0,
      } as any);
    });
    act(() => {
      result.current.handleMouseMove({
        clientX: 10,
        clientY: 5,
      } as any);
      result.current.handleMouseUp();
      result.current.handleMouseMove({
        clientX: 20,
        clientY: 15,
      } as any);
    });

    expect(pan).toHaveBeenCalledTimes(1);
    expect(pan).toHaveBeenCalledWith(10, 5);
  });

  it('zooms in on negative wheel delta and prevents default scroll', () => {
    const { result, setScale } = createInteractionHook(1);
    const preventDefault = vi.fn();

    act(() => {
      result.current.handleWheel({
        deltaY: -100,
        preventDefault,
      } as any);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(setScale).toHaveBeenCalledWith(1.1);
  });

  it('clamps zoom to minimum bound', () => {
    const { result, setScale } = createInteractionHook(0.1);

    act(() => {
      result.current.handleWheel({
        deltaY: 100,
        preventDefault: vi.fn(),
      } as any);
    });

    expect(setScale).toHaveBeenCalledWith(0.1);
  });

  it('clamps zoom to maximum bound', () => {
    const { result, setScale } = createInteractionHook(5);

    act(() => {
      result.current.handleWheel({
        deltaY: -100,
        preventDefault: vi.fn(),
      } as any);
    });

    expect(setScale).toHaveBeenCalledWith(5);
  });
});
