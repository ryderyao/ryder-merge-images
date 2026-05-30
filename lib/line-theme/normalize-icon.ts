/** 依 alpha 偵測內容、統一縮放置中（不去背，假設使用者已提供透明 PNG） */

export const ICON_ALPHA_THRESHOLD = 20;

/**
 * 主體最大邊長占輸出畫布短邊的比例。
 * 官方 Menu 約 73～87%，但 LINE tab 會再裁頂部；略低于官方较安全。
 */
export const MENU_CONTENT_FILL = 0.56;
export const PASSCODE_CONTENT_FILL = 0.54;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ContentMeasure {
  maxDim: number;
  hasAlphaContent: boolean;
}

function findContentBounds(canvas: HTMLCanvasElement, alphaThreshold: number): Bounds | null {
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
      if (a > alphaThreshold) {
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

function cropToBounds(source: HTMLCanvasElement, bounds: Bounds): HTMLCanvasElement {
  const w = bounds.maxX - bounds.minX + 1;
  const h = bounds.maxY - bounds.minY + 1;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法裁切內容");
  ctx.drawImage(source, bounds.minX, bounds.minY, w, h, 0, 0, w, h);
  return canvas;
}

function getContentCrop(source: HTMLCanvasElement): HTMLCanvasElement {
  const bounds = findContentBounds(source, ICON_ALPHA_THRESHOLD);
  if (!bounds) return source;
  return cropToBounds(source, bounds);
}

export function measureContent(source: HTMLCanvasElement): ContentMeasure {
  const bounds = findContentBounds(source, ICON_ALPHA_THRESHOLD);
  if (!bounds) {
    return {
      maxDim: Math.max(source.width, source.height),
      hasAlphaContent: false,
    };
  }
  const w = bounds.maxX - bounds.minX + 1;
  const h = bounds.maxY - bounds.minY + 1;
  return { maxDim: Math.max(w, h), hasAlphaContent: true };
}

/** 整組 OFF 格取最大 bbox，九宮格／四宮格 tab 列大小一致 */
export function computeGridUniformScale(
  offCells: HTMLCanvasElement[],
  outW: number,
  outH: number,
  fillRatio: number,
): number {
  let globalMax = 0;
  for (const cell of offCells) {
    globalMax = Math.max(globalMax, measureContent(cell).maxDim);
  }
  if (globalMax <= 0) globalMax = 1;
  const targetMax = Math.min(outW, outH) * fillRatio;
  return targetMax / globalMax;
}

export function normalizeIconCell(
  source: HTMLCanvasElement,
  outW: number,
  outH: number,
  scale: number,
): HTMLCanvasElement {
  const crop = getContentCrop(source);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立正規化畫布");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const dw = crop.width * scale;
  const dh = crop.height * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;
  ctx.drawImage(crop, dx, dy, dw, dh);
  return canvas;
}

export interface PairedIconOutput {
  offCanvas: HTMLCanvasElement;
  onCanvas: HTMLCanvasElement;
}

export function normalizePairedIconsWithScale(
  offCell: HTMLCanvasElement,
  onCell: HTMLCanvasElement,
  outW: number,
  outH: number,
  scale: number,
): PairedIconOutput {
  return {
    offCanvas: normalizeIconCell(offCell, outW, outH, scale),
    onCanvas: normalizeIconCell(onCell, outW, outH, scale),
  };
}
