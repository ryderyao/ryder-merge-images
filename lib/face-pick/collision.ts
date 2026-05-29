import type { Point2D } from "./smoothing";

export type HoverSide = "left" | "right" | null;

const HIT_PAD_X = 10;
const HIT_PAD_Y = 80;

function expandedRect(rect: DOMRect): DOMRect {
  return new DOMRect(
    rect.left - HIT_PAD_X,
    rect.top - HIT_PAD_Y,
    rect.width + HIT_PAD_X * 2,
    rect.height + HIT_PAD_Y * 2,
  );
}

export function pointInRect(point: Point2D, rect: DOMRect | null): boolean {
  if (!rect) return false;
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

/** 選項框碰撞優先；否則在畫面中段以頭部左右偏移判定。 */
export function detectHoverSide(
  point: Point2D,
  leftRect: DOMRect | null,
  rightRect: DOMRect | null,
): HoverSide {
  if (leftRect && pointInRect(point, expandedRect(leftRect))) return "left";
  if (rightRect && pointInRect(point, expandedRect(rightRect))) return "right";

  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = typeof window !== "undefined" ? window.innerWidth : 400;
  const bandTop = h * 0.22;
  const bandBottom = h * 0.88;
  if (point.y < bandTop || point.y > bandBottom) return null;

  const dead = w * 0.12;
  if (point.x < w / 2 - dead) return "left";
  if (point.x > w / 2 + dead) return "right";
  return null;
}
