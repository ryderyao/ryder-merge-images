export interface Point2D {
  x: number;
  y: number;
}

export function smoothPoint(prev: Point2D | null, current: Point2D, alpha: number): Point2D {
  if (!prev) return current;
  return {
    x: prev.x * (1 - alpha) + current.x * alpha,
    y: prev.y * (1 - alpha) + current.y * alpha,
  };
}
