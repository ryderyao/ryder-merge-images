/** IG 九宮格：視覺列優先 index 0=左上 … 8=右下；發文順序為新貼文在左上，故先右下格先發。 */

export const GRID_CELL_NAMES = [
  "左上",
  "上中",
  "右上",
  "左中",
  "正中",
  "右中",
  "左下",
  "下中",
  "右下",
] as const;

/** 第 1 則對應視覺 index 8，第 9 則對應 index 0 */
export const POSTING_VISUAL_ORDER: readonly number[] = [8, 7, 6, 5, 4, 3, 2, 1, 0];

export const POST_STEP_LABELS = [
  "先發",
  "第二發",
  "第三發",
  "第四發",
  "第五發",
  "第六發",
  "第七發",
  "第八發",
  "最後發",
] as const;

/** ZIP 檔名：01_先發.png … */
export function zipEntryBaseName(stepIndex1Based: number): string {
  const pad = String(stepIndex1Based).padStart(2, "0");
  const label = POST_STEP_LABELS[stepIndex1Based - 1];
  return `${pad}_${label}`;
}

export function buildPostingOrderLines(cellNamesInVisualOrder: string[]): string[] {
  const lines: string[] = [
    "每則貼文建議輸出 1080×1350（4:5）。請照以下順序發文（越晚上傳的越靠近預覽左上）：",
    "",
  ];
  for (let step = 1; step <= 9; step++) {
    const visualIdx = POSTING_VISUAL_ORDER[step - 1];
    const cellName = cellNamesInVisualOrder[visualIdx] ?? GRID_CELL_NAMES[visualIdx];
    const label = POST_STEP_LABELS[step - 1];
    lines.push(`${String(step).padStart(2, "0")} ${label}：預覽「${cellName}」格`);
  }
  return lines;
}
