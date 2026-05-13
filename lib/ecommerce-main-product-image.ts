/** 電商主商品圖：固定 1000×1000、白底 contain、JPEG 檔案大小區間（瀏覽器本地） */

export const OUTPUT_SIZE_PX = 1000;
const MIN_BYTES = 50 * 1024;
const MAX_BYTES = 1000 * 1024;

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("輸出失敗"))),
      "image/jpeg",
      quality,
    );
  });
}

/** 將圖片置于白底 1000×1000 畫布（等比置入，不中裁切） */
export function renderMainProductSquareCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE_PX;
  canvas.height = OUTPUT_SIZE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("無法建立繪圖環境");
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, OUTPUT_SIZE_PX, OUTPUT_SIZE_PX);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const iw = bitmap.width;
  const ih = bitmap.height;

  const scale = Math.min(OUTPUT_SIZE_PX / iw, OUTPUT_SIZE_PX / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = (OUTPUT_SIZE_PX - w) / 2;
  const y = (OUTPUT_SIZE_PX - h) / 2;
  ctx.drawImage(bitmap, x, y, w, h);
  return canvas;
}

/** 將 JPEG 品質調整至約 50 KB～1000 KB（盡量維持較佳品質） */
export async function encodeMainProductJpeg(canvas: HTMLCanvasElement): Promise<{ blob: Blob; hints: string[] }> {
  const hints: string[] = [];

  let lo = 0.42;
  let hi = 0.93;
  let bestBlob: Blob | null = null;
  let bestQ = 0.75;

  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const b = await canvasToJpegBlob(canvas, mid);
    if (b.size <= MAX_BYTES) {
      bestBlob = b;
      bestQ = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  if (!bestBlob) {
    const fallbacks = [0.42, 0.35, 0.28, 0.22];
    for (const q of fallbacks) {
      const b = await canvasToJpegBlob(canvas, q);
      bestBlob = b;
      bestQ = q;
      if (b.size <= MAX_BYTES) break;
    }
  }

  if (!bestBlob) {
    throw new Error("無法輸出 JPEG");
  }

  if (bestBlob.size > MAX_BYTES) {
    hints.push("無法壓縮至約 1000 KB 以下，請換較單純的原圖再試。");
    return { blob: bestBlob, hints };
  }

  if (bestBlob.size < MIN_BYTES) {
    for (let q = Math.min(0.98, bestQ + 0.02); q <= 0.98; q += 0.02) {
      const b = await canvasToJpegBlob(canvas, q);
      if (b.size > MAX_BYTES) break;
      bestBlob = b;
      bestQ = q;
      if (b.size >= MIN_BYTES) break;
    }
    if (bestBlob.size < MIN_BYTES) {
      hints.push("輸出檔小於約 50 KB（若平台上架有檔案大小下限請自行確認）。");
    }
  }

  return { blob: bestBlob, hints };
}

export async function convertFileToMainProductJpeg(file: File): Promise<{ blob: Blob; hints: string[] }> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("無法讀取此圖檔（格式可能不受瀏覽器支援）");
  }
  try {
    const canvas = renderMainProductSquareCanvas(bitmap);
    return encodeMainProductJpeg(canvas);
  } finally {
    bitmap.close();
  }
}

/** 產生 ZIP 內安全檔名（不含副檔名） */
export function baseNameForExport(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "").trim() || "image";
  return base.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120);
}
