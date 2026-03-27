import { describe, it, expect } from 'vitest';
import {
  midPoint,
  lerp,
  cubicBezier,
  calculateConnectionPath,
  rectContainsPoint,
  scaleRect,
  type Point,
  type Rect,
} from '../../src/utils/geometry';

describe('midPoint', () => {
  it('returns the midpoint of two points', () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 10, y: 20 };
    expect(midPoint(a, b)).toEqual({ x: 5, y: 10 });
  });

  it('handles negative coordinates', () => {
    expect(midPoint({ x: -10, y: -20 }, { x: 10, y: 20 })).toEqual({ x: 0, y: 0 });
  });
});

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(5, 10, 0)).toBe(5);
  });

  it('returns b at t=1', () => {
    expect(lerp(5, 10, 1)).toBe(10);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('cubicBezier', () => {
  const p0: Point = { x: 0, y: 0 };
  const p1: Point = { x: 10, y: 0 };
  const p2: Point = { x: 10, y: 10 };
  const p3: Point = { x: 20, y: 10 };

  it('returns p0 at t=0', () => {
    expect(cubicBezier(p0, p1, p2, p3, 0)).toEqual({ x: 0, y: 0 });
  });

  it('returns p3 at t=1', () => {
    expect(cubicBezier(p0, p1, p2, p3, 1)).toEqual({ x: 20, y: 10 });
  });

  it('returns interpolated point at t=0.5', () => {
    const result = cubicBezier(p0, p1, p2, p3, 0.5);
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(5);
  });
});

describe('calculateConnectionPath', () => {
  it('creates right-to-left path when target is to the right', () => {
    const from: Rect = { x: 0, y: 0, width: 100, height: 50 };
    const to: Rect = { x: 300, y: 50, width: 100, height: 50 };
    const path = calculateConnectionPath(from, to);

    expect(path.start).toEqual({ x: 99, y: 25 });
    expect(path.end).toEqual({ x: 301, y: 75 });
    expect(path.cp1.x).toBeGreaterThan(path.start.x);
    expect(path.cp2.x).toBeLessThan(path.end.x);
  });

  it('creates left-to-right path when target is to the left', () => {
    const from: Rect = { x: 300, y: 0, width: 100, height: 50 };
    const to: Rect = { x: 0, y: 50, width: 100, height: 50 };
    const path = calculateConnectionPath(from, to);

    expect(path.start).toEqual({ x: 301, y: 25 });
    expect(path.end).toEqual({ x: 99, y: 75 });
    expect(path.cp1.x).toBeLessThan(path.start.x);
    expect(path.cp2.x).toBeGreaterThan(path.end.x);
  });

  it('uses minimum control offset of 40 for close rects', () => {
    const from: Rect = { x: 0, y: 0, width: 50, height: 50 };
    const to: Rect = { x: 60, y: 0, width: 50, height: 50 };
    const path = calculateConnectionPath(from, to);

    const cpOffset = Math.abs(path.cp1.x - path.start.x);
    expect(cpOffset).toBe(40);
  });
});

describe('rectContainsPoint', () => {
  const rect: Rect = { x: 10, y: 10, width: 100, height: 50 };

  it('returns true for a point inside', () => {
    expect(rectContainsPoint(rect, { x: 50, y: 30 })).toBe(true);
  });

  it('returns true for a point on the edge', () => {
    expect(rectContainsPoint(rect, { x: 10, y: 10 })).toBe(true);
    expect(rectContainsPoint(rect, { x: 110, y: 60 })).toBe(true);
  });

  it('returns false for a point outside', () => {
    expect(rectContainsPoint(rect, { x: 5, y: 30 })).toBe(false);
    expect(rectContainsPoint(rect, { x: 50, y: 70 })).toBe(false);
  });
});

describe('scaleRect', () => {
  it('scales a rect by a factor', () => {
    const rect: Rect = { x: 10, y: 20, width: 30, height: 40 };
    expect(scaleRect(rect, 2)).toEqual({ x: 20, y: 40, width: 60, height: 80 });
  });

  it('scales by 0.5', () => {
    const rect: Rect = { x: 10, y: 20, width: 30, height: 40 };
    expect(scaleRect(rect, 0.5)).toEqual({ x: 5, y: 10, width: 15, height: 20 });
  });
});
