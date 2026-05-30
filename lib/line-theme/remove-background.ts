/** 依四角取樣，移除純色背景（適合 AI 生圖的單色底） */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface RemoveBackgroundOptions {
  /** RGB 色差閾值，預設 36 */
  tolerance?: number;
  /** 邊緣羽化區間，預設 20 */
  feather?: number;
}

function sampleCornerBackground(data: Uint8ClampedArray, w: number, h: number): Rgb {
  const patch = Math.max(2, Math.min(8, Math.floor(Math.min(w, h) * 0.06)));
  const corners = [
    [0, 0],
    [w - patch, 0],
    [0, h - patch],
    [w - patch, h - patch],
  ];

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (const [cx, cy] of corners) {
    for (let dy = 0; dy < patch; dy++) {
      for (let dx = 0; dx < patch; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const i = (y * w + x) * 4;
        r += data[i]!;
        g += data[i + 1]!;
        b += data[i + 2]!;
        count += 1;
      }
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function colorDistance(bg: Rgb, r: number, g: number, b: number): number {
  return Math.sqrt((bg.r - r) ** 2 + (bg.g - g) ** 2 + (bg.b - b) ** 2);
}

export function removeSolidBackground(
  source: HTMLCanvasElement,
  options?: RemoveBackgroundOptions,
): HTMLCanvasElement {
  const tolerance = options?.tolerance ?? 36;
  const feather = options?.feather ?? 20;

  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("無法建立去背畫布");

  ctx.drawImage(source, 0, 0);
  const { width: w, height: h } = canvas;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const bg = sampleCornerBackground(data, w, h);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const dist = colorDistance(bg, r, g, b);

    if (dist <= tolerance) {
      data[i + 3] = 0;
    } else if (dist <= tolerance + feather) {
      const alpha = Math.round((255 * (dist - tolerance)) / feather);
      data[i + 3] = Math.min(data[i + 3]!, alpha);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function findOpaqueBounds(canvas: HTMLCanvasElement): Bounds | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]!;
      if (a > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

/** 裁掉透明邊界，讓圖示在輸出畫布中更大 */
export function trimTransparent(source: HTMLCanvasElement): HTMLCanvasElement {
  const bounds = findOpaqueBounds(source);
  if (!bounds) return source;

  const w = bounds.maxX - bounds.minX + 1;
  const h = bounds.maxY - bounds.minY + 1;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法裁切透明邊界");
  ctx.drawImage(source, bounds.minX, bounds.minY, w, h, 0, 0, w, h);
  return canvas;
}

export function prepareIconCell(source: HTMLCanvasElement): HTMLCanvasElement {
  return trimTransparent(removeSolidBackground(source));
}
