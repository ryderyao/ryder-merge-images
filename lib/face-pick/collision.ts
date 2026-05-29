import type { Point2D } from "./smoothing";

export type HoverSide = "left" | "right" | null;

const HIT_PAD_X = 12;
const HIT_PAD_Y = 48;

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

/** Prefer box overlap; fall back to horizontal zones when face is in play band. */
export function detectHoverSide(
  point: Point2D,
  leftRect: DOMRect | null,
  rightRect: DOMRect | null,
  playBandTop: number,
  playBandBottom: number,
): HoverSide {
  if (point.y < playBandTop || point.y > playBandBottom) return null;

  if (leftRect && pointInRect(point, expandedRect(leftRect))) return "left";
  if (rightRect && pointInRect(point, expandedRect(rightRect))) return "right";

  const mid = (playBandTop + playBandBottom) / 2;
  if (Math.abs(point.y - mid) > (playBandBottom - playBandTop) * 0.55) return null;

  const w = typeof window !== "undefined" ? window.innerWidth : 400;
  const dead = w * 0.12;
  if (point.x < w / 2 - dead) return "left";
  if (point.x > w / 2 + dead) return "right";
  return null;
}
