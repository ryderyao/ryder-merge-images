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
  {
    slug: "images-to-gif",
    title: "多圖轉 GIF",
    summary: "多張圖片拖曳排序、調整每幀顯示 0.1～1 秒，瀏覽器內產出可下載的循環動畫 GIF。",
    scenario: "適合簡單輪播、梗圖或產品多視角。",
    ogDescription:
      "多圖排序、可調幀延遲、前端產生循環 GIF 並下載。本地處理、可預覽輪播與輸出檔。",
  },
  {
    slug: "ig-grid-preview",
    title: "IG 九宮格裁切",
    summary:
      "上傳一張 4:5 構圖的完整視覺（建議 3240×4050），自動裁成 9 張 1080×1350，並依 IG 發文順序一次下載九張已命名圖檔。",
    scenario:
      "先請 AI 依建議尺寸生成單張大圖，上傳後預覽九宮格，確認無誤再下載。此為 IG「風格」預覽，非官方 App；實際畫面以 Instagram 為準。",
    ogDescription:
      "單圖切 3×3、4:5 單格、九張 PNG 依序檔名下載與完整拼圖 PNG。瀏覽器本地處理。",
  },
  {
    slug: "shop-sales-board",
    title: "小店營收看板",
    summary:
      "上傳 Excel／CSV 銷售明細，在畫面上看走勢、熱賣品、怎麼付錢，並可下載一張清楚的報表圖。",
    scenario:
      "適合小店家把 POS 或表單匯出的檔案拉進來，快速看懂這段時間賣得怎樣。",
    ogDescription:
      "本機解析銷售表：營收走勢、熱銷排行、付款與分類、人員與會員回購概覽，可匯出看板 PNG。",
    ioHint: "上傳：.xlsx / .xls / .csv；輸出：畫面上的圖表與可下載的 PNG。",
  },
];

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getAllToolSlugs(): string[] {
  return TOOLS.map((t) => t.slug);
}
