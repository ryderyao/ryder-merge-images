/** 工具庫註冊表：新增工具時在此列出一筆，並在 ToolWorkspace 接上對應 UI */

export interface ToolDefinition {
  slug: string;
  title: string;
  /** 首頁卡片用：一行說明 */
  summary: string;
  /** 工具頂部：用途與情境（可稍長） */
  scenario: string;
  /** SEO／OG；未填則使用 summary */
  ogDescription?: string;
  /** 輸入／輸出格式一行話（選填） */
  ioHint?: string;
}

export const TOOLS: readonly ToolDefinition[] = [
  {
    slug: "merge-strip",
    title: "長條圖合併",
    summary: "多張細節圖縱向接成單張長條圖，並可依比例或段數切回區塊。",
    scenario:
      "適合電商詳情頁、多張截圖需固定順序與比例時使用。所有影像只在你的瀏覽器處理，不會上傳到伺服器。",
    ogDescription:
      "拖曳排序、縱向合併電商長條圖，並可依最近一次合併比例或均分段數拆解。瀏覽器本地處理。",
    ioHint: "輸入：常見圖檔（JPG／PNG／WebP 等，依瀏覽器）；輸出：PNG。",
  },
  {
    slug: "main-product-1000",
    title: "電商主商品圖",
    summary: "批量將圖片轉成 1000×1000 JPG，並自動控制在約 50～1000 KB，方便上架使用。",
    scenario: "適合 AI 出圖或其他非標準像素的照片；拖曳或選擇多張，確認縮圖後一鍵下載。",
    ogDescription:
      "批量輸出電商主商品圖：1000×1000 JPG、約 50～1000 KB 自動調整品質，ZIP 下載。瀏覽器本地處理。",
  },
];

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getAllToolSlugs(): string[] {
  return TOOLS.map((t) => t.slug);
}
