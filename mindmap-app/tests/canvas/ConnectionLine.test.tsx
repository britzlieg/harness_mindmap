import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionLine } from '../../src/components/Canvas/ConnectionLine';

vi.mock('../../src/utils/geometry', () => ({
  calculateConnectionPath: vi.fn(() => ({
    start: { x: 0, y: 0 },
    cp1: { x: 100, y: 50 },
    cp2: { x: 200, y: 150 },
    end: { x: 300, y: 200 },
  })),
}));

const defaultProps = {
  fromRect: { x: 0, y: 0, width: 100, height: 50 },
  toRect: { x: 300, y: 200, width: 100, height: 50 },
  color: '#000000',
  width: 2,
};

describe('ConnectionLine', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
    };

    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any;
  });

  it('renders a canvas element', () => {
    render(<ConnectionLine {...defaultProps} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  it('applies dashed line style when dashed prop is true', () => {
    render(<ConnectionLine {...defaultProps} dashed={true} />);
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([6, 4]);
  });

  it('applies solid line style when dashed prop is false', () => {
    render(<ConnectionLine {...defaultProps} dashed={false} />);
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
  });
});
