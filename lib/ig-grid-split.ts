/**
 * IG 九宮格：單格 4:5（1080×1350），完整拼圖 3240×4050。
 * 上傳任意比例圖片後，先 fit 到整張 4:5 畫布再均分 3×3。
 */

export const IG_TILE_W = 1080;
export const IG_TILE_H = 1350;
export const IG_GRID_COLS = 3;
export const IG_GRID_ROWS = 3;

export const IG_FULL_W = IG_TILE_W * IG_GRID_COLS; // 3240
export const IG_FULL_H = IG_TILE_H * IG_GRID_ROWS; // 4050

export type IgGridFitMode = "cover" | "contain";

export async function fileToNormalizedGridCanvas(file: File, mode: IgGridFitMode): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = IG_FULL_W;
    canvas.height = IG_FULL_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("無法建立繪圖環境");
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (mode === "contain") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, IG_FULL_W, IG_FULL_H);
    }

    const iw = bitmap.width;
    const ih = bitmap.height;
    const scale =
      mode === "cover"
        ? Math.max(IG_FULL_W / iw, IG_FULL_H / ih)
        : Math.min(IG_FULL_W / iw, IG_FULL_H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (IG_FULL_W - dw) / 2;
    const dy = (IG_FULL_H - dh) / 2;
    ctx.drawImage(bitmap, dx, dy, dw, dh);
    return canvas;
  } finally {
    bitmap.close();
  }
}

/** 列優先：index 0=左上 … 8=右下 */
export function splitGridCanvasToTileCanvases(source: HTMLCanvasElement): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let row = 0; row < IG_GRID_ROWS; row++) {
    for (let col = 0; col < IG_GRID_COLS; col++) {
      const c = document.createElement("canvas");
      c.width = IG_TILE_W;
      c.height = IG_TILE_H;
      const ctx = c.getContext("2d");
      if (!ctx) {
        throw new Error("無法建立切片畫布");
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        source,
        col * IG_TILE_W,
        row * IG_TILE_H,
        IG_TILE_W,
        IG_TILE_H,
        0,
        0,
        IG_TILE_W,
        IG_TILE_H,
      );
      out.push(c);
    }
  }
  return out;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("輸出 PNG 失敗"))), "image/png");
  });
}

export async function splitFileToTileBlobs(
  file: File,
  mode: IgGridFitMode,
): Promise<{ fullBlob: Blob; tileBlobs: Blob[] }> {
  const gridCanvas = await fileToNormalizedGridCanvas(file, mode);
  const fullBlob = await canvasToPngBlob(gridCanvas);
  const tiles = splitGridCanvasToTileCanvases(gridCanvas);
  const tileBlobs = await Promise.all(tiles.map((c) => canvasToPngBlob(c)));
  return { fullBlob, tileBlobs };
}
