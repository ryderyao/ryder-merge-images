import {
  COVER_OUTPUTS,
  MENU_ICON_H,
  MENU_ICON_W,
  MENU_OFF_FILES,
  MENU_ON_FILES,
  PASSCODE_ANDROID_SIZE,
  PASSCODE_IOS_SIZE,
  PASSCODE_OFF_FILES,
  PASSCODE_ON_FILES,
  PROFILE_OUTPUTS,
} from "@/lib/line-theme/output-map";
import {
  MENU_CONTENT_FILL,
  PASSCODE_CONTENT_FILL,
  computeGridUniformScale,
  normalizePairedIconsWithScale,
} from "@/lib/line-theme/normalize-icon";

export interface LineThemeOutputFile {
  name: string;
  blob: Blob;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("輸出 PNG 失敗"))), "image/png");
  });
}

function drawCoverCrop(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  outW: number,
  outH: number,
): void {
  const iw = bitmap.width;
  const ih = bitmap.height;
  const scale = Math.max(outW / iw, outH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, dx, dy, dw, dh);
}

async function bitmapToCoverCanvas(bitmap: ImageBitmap, outW: number, outH: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立繪圖環境");
  drawCoverCrop(ctx, bitmap, outW, outH);
  return canvas;
}

function splitGridCells(bitmap: ImageBitmap, cols: number, rows: number): HTMLCanvasElement[] {
  const cellW = bitmap.width / cols;
  const cellH = bitmap.height / rows;
  const out: HTMLCanvasElement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const c = document.createElement("canvas");
      c.width = Math.round(cellW);
      c.height = Math.round(cellH);
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("無法建立切片畫布");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        bitmap,
        col * cellW,
        row * cellH,
        cellW,
        cellH,
        0,
        0,
        c.width,
        c.height,
      );
      out.push(c);
    }
  }
  return out;
}

function fitContainCanvas(
  source: HTMLCanvasElement,
  outW: number,
  outH: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立輸出畫布");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const sw = source.width;
  const sh = source.height;
  const scale = Math.min(outW / sw, outH / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;
  ctx.drawImage(source, dx, dy, dw, dh);
  return canvas;
}

function extractHalfSquare(bitmap: ImageBitmap, side: "left" | "right"): HTMLCanvasElement {
  const halfW = bitmap.width / 2;
  const h = bitmap.height;
  const size = Math.min(halfW, h);
  const sx = side === "left" ? (halfW - size) / 2 : halfW + (halfW - size) / 2;
  const sy = (h - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size);
  canvas.height = Math.round(size);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立 Profile 畫布");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function processCover(file: File): Promise<LineThemeOutputFile[]> {
  const bitmap = await createImageBitmap(file);
  try {
    const out: LineThemeOutputFile[] = [];
    for (const spec of COVER_OUTPUTS) {
      const canvas = await bitmapToCoverCanvas(bitmap, spec.width, spec.height);
      out.push({ name: spec.name, blob: await canvasToPngBlob(canvas) });
    }
    return out;
  } finally {
    bitmap.close();
  }
}

async function processMenuPaired(offFile: File, onFile: File): Promise<LineThemeOutputFile[]> {
  const offBitmap = await createImageBitmap(offFile);
  const onBitmap = await createImageBitmap(onFile);
  try {
    const offCells = splitGridCells(offBitmap, 3, 3);
    const onCells = splitGridCells(onBitmap, 3, 3);
    const scale = computeGridUniformScale(
      offCells,
      MENU_ICON_W,
      MENU_ICON_H,
      MENU_CONTENT_FILL,
    );
    const out: LineThemeOutputFile[] = [];

    for (let i = 0; i < MENU_OFF_FILES.length; i++) {
      const { offCanvas, onCanvas } = normalizePairedIconsWithScale(
        offCells[i]!,
        onCells[i]!,
        MENU_ICON_W,
        MENU_ICON_H,
        scale,
      );
      out.push({ name: MENU_OFF_FILES[i]!, blob: await canvasToPngBlob(offCanvas) });
      out.push({ name: MENU_ON_FILES[i]!, blob: await canvasToPngBlob(onCanvas) });
    }
    return out;
  } finally {
    offBitmap.close();
    onBitmap.close();
  }
}

async function processProfile(file: File): Promise<LineThemeOutputFile[]> {
  const bitmap = await createImageBitmap(file);
  try {
    const out: LineThemeOutputFile[] = [];
    for (const spec of PROFILE_OUTPUTS) {
      const square = extractHalfSquare(bitmap, spec.side);
      const scaled = fitContainCanvas(square, spec.width, spec.height);
      out.push({ name: spec.name, blob: await canvasToPngBlob(scaled) });
    }
    return out;
  } finally {
    bitmap.close();
  }
}

async function processPasscodePaired(offFile: File, onFile: File): Promise<LineThemeOutputFile[]> {
  const offBitmap = await createImageBitmap(offFile);
  const onBitmap = await createImageBitmap(onFile);
  try {
    const offCells = splitGridCells(offBitmap, 2, 2);
    const onCells = splitGridCells(onBitmap, 2, 2);
    const iosScale = computeGridUniformScale(
      offCells,
      PASSCODE_IOS_SIZE,
      PASSCODE_IOS_SIZE,
      PASSCODE_CONTENT_FILL,
    );
    const androidScale = computeGridUniformScale(
      offCells,
      PASSCODE_ANDROID_SIZE,
      PASSCODE_ANDROID_SIZE,
      PASSCODE_CONTENT_FILL,
    );
    const out: LineThemeOutputFile[] = [];

    for (let i = 0; i < PASSCODE_OFF_FILES.length; i++) {
      const mapping = PASSCODE_OFF_FILES[i]!;
      const onMapping = PASSCODE_ON_FILES[i]!;

      const iosPair = normalizePairedIconsWithScale(
        offCells[i]!,
        onCells[i]!,
        PASSCODE_IOS_SIZE,
        PASSCODE_IOS_SIZE,
        iosScale,
      );
      const androidPair = normalizePairedIconsWithScale(
        offCells[i]!,
        onCells[i]!,
        PASSCODE_ANDROID_SIZE,
        PASSCODE_ANDROID_SIZE,
        androidScale,
      );

      out.push({ name: mapping.ios, blob: await canvasToPngBlob(iosPair.offCanvas) });
      out.push({ name: onMapping.ios, blob: await canvasToPngBlob(iosPair.onCanvas) });
      out.push({ name: mapping.android, blob: await canvasToPngBlob(androidPair.offCanvas) });
      out.push({ name: onMapping.android, blob: await canvasToPngBlob(androidPair.onCanvas) });
    }
    return out;
  } finally {
    offBitmap.close();
    onBitmap.close();
  }
}

export interface LineThemeMotherFiles {
  cover: File;
  menuOff: File;
  menuOn: File;
  profile: File;
  passcodeOff: File;
  passcodeOn: File;
}

export async function processLineThemePack(files: LineThemeMotherFiles): Promise<LineThemeOutputFile[]> {
  const [coverFiles, menuFiles, profileFiles, passcodeFiles] = await Promise.all([
    processCover(files.cover),
    processMenuPaired(files.menuOff, files.menuOn),
    processProfile(files.profile),
    processPasscodePaired(files.passcodeOff, files.passcodeOn),
  ]);

  return [...coverFiles, ...menuFiles, ...profileFiles, ...passcodeFiles];
}
