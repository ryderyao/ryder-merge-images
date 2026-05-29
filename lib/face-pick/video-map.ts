import type { Point2D } from "./smoothing";

/** Map a point in video pixel space to screen coords, accounting for object-cover + mirror. */
export function videoPixelToScreen(
  px: number,
  py: number,
  video: HTMLVideoElement,
): Point2D {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0) return { x: 0, y: 0 };

  const rect = video.getBoundingClientRect();
  const scale = Math.max(rect.width / vw, rect.height / vh);
  const displayW = vw * scale;
  const displayH = vh * scale;
  const offsetX = (rect.width - displayW) / 2;
  const offsetY = (rect.height - displayH) / 2;

  const mirroredPx = vw - px;

  return {
    x: rect.left + offsetX + (mirroredPx / vw) * displayW,
    y: rect.top + offsetY + (py / vh) * displayH,
  };
}

export function faceBoxCenterToScreen(
  box: { originX: number; originY: number; width: number; height: number },
  video: HTMLVideoElement,
): Point2D {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const normalized =
    box.originX <= 1 && box.originY <= 1 && box.width <= 1 && box.height <= 1;
  const cx = normalized
    ? (box.originX + box.width / 2) * vw
    : box.originX + box.width / 2;
  const cy = normalized
    ? (box.originY + box.height / 2) * vh
    : box.originY + box.height / 2;
  return videoPixelToScreen(cx, cy, video);
}
