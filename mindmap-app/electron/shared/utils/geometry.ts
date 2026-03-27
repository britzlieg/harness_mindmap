export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConnectionPath {
  start: Point;
  end: Point;
  cp1: Point;
  cp2: Point;
}

export function midPoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function cubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

export function calculateConnectionPath(
  from: Rect,
  to: Rect
): ConnectionPath {
  const fromCenterX = from.x + from.width / 2;
  const toCenterX = to.x + to.width / 2;
  const lineOverlap = 1;

  let start: Point;
  let end: Point;

  if (toCenterX > fromCenterX) {
    start = { x: from.x + from.width - lineOverlap, y: from.y + from.height / 2 };
    end = { x: to.x + lineOverlap, y: to.y + to.height / 2 };
  } else {
    start = { x: from.x + lineOverlap, y: from.y + from.height / 2 };
    end = { x: to.x + to.width - lineOverlap, y: to.y + to.height / 2 };
  }

  const dx = Math.abs(end.x - start.x);
  const controlOffset = Math.max(dx * 0.5, 40);

  const cp1: Point = {
    x: start.x + (toCenterX > fromCenterX ? controlOffset : -controlOffset),
    y: start.y,
  };
  const cp2: Point = {
    x: end.x + (toCenterX > fromCenterX ? -controlOffset : controlOffset),
    y: end.y,
  };

  return { start, end, cp1, cp2 };
}

export function rectContainsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function scaleRect(rect: Rect, scale: number): Rect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
