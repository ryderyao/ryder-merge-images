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
import { prepareIconCell } from "@/lib/line-theme/remove-background";

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

function fitCellToMenuCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const icon = prepareIconCell(source);
  return fitContainCanvas(icon, MENU_ICON_W, MENU_ICON_H);
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

async function scaleSquareCanvas(source: HTMLCanvasElement, size: number): Promise<HTMLCanvasElement> {
  const icon = prepareIconCell(source);
  return fitContainCanvas(icon, size, size);
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

async function processMenuGrid(file: File, fileNames: readonly string[]): Promise<LineThemeOutputFile[]> {
  const bitmap = await createImageBitmap(file);
  try {
    const cells = splitGridCells(bitmap, 3, 3);
    const out: LineThemeOutputFile[] = [];
    for (let i = 0; i < fileNames.length; i++) {
      const menuCanvas = fitCellToMenuCanvas(cells[i]!);
      out.push({ name: fileNames[i]!, blob: await canvasToPngBlob(menuCanvas) });
    }
    return out;
  } finally {
    bitmap.close();
  }
}

async function processProfile(file: File): Promise<LineThemeOutputFile[]> {
  const bitmap = await createImageBitmap(file);
  try {
    const out: LineThemeOutputFile[] = [];
    for (const spec of PROFILE_OUTPUTS) {
      const square = extractHalfSquare(bitmap, spec.side);
      const scaled = await scaleSquareCanvas(square, spec.width);
      out.push({ name: spec.name, blob: await canvasToPngBlob(scaled) });
    }
    return out;
  } finally {
    bitmap.close();
  }
}

async function processPasscodeGrid(
  file: File,
  mappings: typeof PASSCODE_OFF_FILES | typeof PASSCODE_ON_FILES,
): Promise<LineThemeOutputFile[]> {
  const bitmap = await createImageBitmap(file);
  try {
    const cells = splitGridCells(bitmap, 2, 2);
    const out: LineThemeOutputFile[] = [];
    for (let i = 0; i < mappings.length; i++) {
      const cell = cells[i]!;
      const ios = await scaleSquareCanvas(cell, PASSCODE_IOS_SIZE);
      const android = await scaleSquareCanvas(cell, PASSCODE_ANDROID_SIZE);
      out.push({ name: mappings[i]!.ios, blob: await canvasToPngBlob(ios) });
      out.push({ name: mappings[i]!.android, blob: await canvasToPngBlob(android) });
    }
    return out;
  } finally {
    bitmap.close();
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
  const [
    coverFiles,
    menuOffFiles,
    menuOnFiles,
    profileFiles,
    passcodeOffFiles,
    passcodeOnFiles,
  ] = await Promise.all([
    processCover(files.cover),
    processMenuGrid(files.menuOff, MENU_OFF_FILES),
    processMenuGrid(files.menuOn, MENU_ON_FILES),
    processProfile(files.profile),
    processPasscodeGrid(files.passcodeOff, PASSCODE_OFF_FILES),
    processPasscodeGrid(files.passcodeOn, PASSCODE_ON_FILES),
  ]);

  return [
    ...coverFiles,
    ...menuOffFiles,
    ...menuOnFiles,
    ...profileFiles,
    ...passcodeOffFiles,
    ...passcodeOnFiles,
  ];
}
