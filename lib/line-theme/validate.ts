import type { LineThemeSlotDefinition } from "@/lib/line-theme/output-map";

const RATIO_TOLERANCE = 0.15;

export const RATIO_WARNING =
  "圖片比例與建議不同，系統會自動裁切，可能會裁掉部分內容。";

export function checkAspectRatio(
  width: number,
  height: number,
  slot: LineThemeSlotDefinition,
): string | null {
  if (width <= 0 || height <= 0) {
    return "無法讀取圖片尺寸";
  }
  const actual = width / height;
  const expected = slot.expectedRatio;
  const diff = Math.abs(actual - expected) / expected;
  if (diff > RATIO_TOLERANCE) {
    return RATIO_WARNING;
  }
  return null;
}

export async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
