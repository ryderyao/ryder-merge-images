/** 多幀影像 → 動畫 GIF（瀏覽器本地，gifenc） */

import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { loadImageFromUrl, type LoadedImage } from "@/lib/image-strip";

/** 輸出畫布最長邊上限，避免編碼過久或記憶體過高 */
export const GIF_MAX_EDGE_PX = 800;

function clampDelaySeconds(seconds: number): number {
  if (Number.isNaN(seconds)) return 0.2;
  return Math.min(1, Math.max(0.1, seconds));
}

function computeOutputSize(loaded: LoadedImage[]): {
  width: number;
  height: number;
  scaledDown: boolean;
} {
  const maxNatW = Math.max(...loaded.map((l) => l.naturalWidth));
  const maxNatH = Math.max(...loaded.map((l) => l.naturalHeight));
  const longEdge = Math.max(maxNatW, maxNatH);
  const scale = longEdge > GIF_MAX_EDGE_PX ? GIF_MAX_EDGE_PX / longEdge : 1;
  return {
    width: Math.max(1, Math.round(maxNatW * scale)),
    height: Math.max(1, Math.round(maxNatH * scale)),
    scaledDown: scale < 1,
  };
}

function drawFrameContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  outW: number,
  outH: number,
): void {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, outW, outH);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const s = Math.min(outW / nw, outH / nh);
  const dw = Math.max(1, Math.round(nw * s));
  const dh = Math.max(1, Math.round(nh * s));
  const dx = Math.floor((outW - dw) / 2);
  const dy = Math.floor((outH - dh) / 2);
  ctx.drawImage(img, dx, dy, dw, dh);
}

export interface EncodeGifResult {
  blob: Blob;
  width: number;
  height: number;
  scaledDown: boolean;
  frameCount: number;
  delayMs: number;
}

/**
 * 依目前順序將多張圖（object URL）編成循環播放的 GIF。
 * 每幀延遲為毫秒（由秒數換算，已限制在 0.1～1 秒）。
 */
export async function encodeObjectUrlsToAnimatedGif(
  objectUrls: string[],
  delaySeconds: number,
): Promise<EncodeGifResult> {
  if (objectUrls.length === 0) {
    throw new Error("沒有可輸出的圖片");
  }

  const loaded = await Promise.all(objectUrls.map((u) => loadImageFromUrl(u)));
  const { width, height, scaledDown } = computeOutputSize(loaded);
  const delayMs = Math.round(clampDelaySeconds(delaySeconds) * 1000);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("無法建立繪圖環境");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const gif = GIFEncoder({ initialCapacity: 2 * 1024 * 1024 });

  for (let i = 0; i < loaded.length; i++) {
    drawFrameContain(ctx, loaded[i].image, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const palette = quantize(imageData.data, 256);
    const index = applyPalette(imageData.data, palette);

    if (i === 0) {
      gif.writeFrame(index, width, height, { palette, delay: delayMs, repeat: 0 });
    } else {
      gif.writeFrame(index, width, height, { palette, delay: delayMs });
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const blobBody = new Uint8Array(bytes.byteLength);
  blobBody.set(bytes);
  return {
    blob: new Blob([blobBody], { type: "image/gif" }),
    width,
    height,
    scaledDown,
    frameCount: loaded.length,
    delayMs,
  };
}
