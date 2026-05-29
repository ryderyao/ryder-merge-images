import type { Point2D } from "./smoothing";

export type HoverSide = "left" | "right" | null;

const HIT_PAD_X = 8;
const HIT_PAD_Y = 24;

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

function sideFromX(point: Point2D, centerX: number, deadHalf: number): HoverSide {
  if (point.x < centerX - deadHalf) return "left";
  if (point.x > centerX + deadHalf) return "right";
  return null;
}

/** Box overlap first; in face guide use head tilt (horizontal). */
export function detectHoverSide(
  point: Point2D,
  leftRect: DOMRect | null,
  rightRect: DOMRect | null,
  faceGuideRect: DOMRect | null,
): HoverSide {
  if (leftRect && pointInRect(point, expandedRect(leftRect))) return "left";
  if (rightRect && pointInRect(point, expandedRect(rightRect))) return "right";

  if (faceGuideRect && pointInRect(point, faceGuideRect)) {
    const cx = faceGuideRect.left + faceGuideRect.width / 2;
    return sideFromX(point, cx, faceGuideRect.width * 0.14);
  }

  return null;
}
