import type { ColumnMapping, SalesFieldKey } from "./shop-sales-types";

/** 不應對到「銷售金額」的欄位（避免誤選折扣、單價、成本等） */
const AMOUNT_HEADER_REJECT = /折扣|單價|成本|毛利|進價|運費|稅額|退貨|作廢/i;

const KEYWORDS: Record<SalesFieldKey, string[]> = {
  date: [
    "結帳日期",
    "結帳日",
    "交易日期",
    "銷售日期",
    "訂單日期",
    "date",
    "orderdate",
    "checkout",
    "saledate",
    "日期",
    "成交日",
    "開單日",
    "建單日",
    "訂單日",
    "datetime",
    "created",
    "時間", // 僅在無「結帳日期」時可能對到「結帳時間」—排序時可讓完整日期欄優先
  ],
  itemName: [
    "商品名稱",
    "產品名稱",
    "品名",
    "商品",
    "item",
    "productname",
    "product",
    "sku",
    "品項",
    "名稱",
    "項目",
    "description",
    "明細",
    "品名稱",
  ],
  amount: [
    "銷售金額",
    "實收金額",
    "銷售額",
    "含稅金額",
    "實收",
    "小計",
    "金額合計",
    "總計",
    "lineamount",
    "amount",
    "total",
    "sales",
    "revenue",
    "金額",
    "總額",
    "收入",
    "營業額",
    "saleamt",
  ],
  quantity: [
    "數量",
    "件數",
    "購買數量",
    "qty",
    "quantity",
    "count",
    "pcs",
    "單位",
  ],
  transactionId: [
    "訂單id",
    "訂單編號",
    "訂單號",
    "訂單編碼",
    "orderid",
    "order_id",
    "order",
    "transaction",
    "invoice",
    "receipt",
    "單號",
    "訂單",
    "交易",
    "流水號",
    "票號",
    "doc",
    "so",
  ],
  customerId: [
    "客戶id",
    "客戶編號",
    "客戶編碼",
    "會員編號",
    "會員id",
    "customerid",
    "memberid",
    "customer",
    "member",
    "vip",
    "會員",
    "顧客",
    "客戶",
    "userid",
    "phone",
    "電話",
    "手機",
  ],
  staffName: [
    "服務人員",
    "銷售人員",
    "門市人員",
    "收銀員",
    "店員",
    "staff",
    "cashier",
    "員工",
    "人員",
    "服務",
    "結帳",
    "業務",
    "seller",
  ],
  category: [
    "商品分類",
    "產品分類",
    "品類",
    "類別",
    "category",
    "type",
    "分類",
    "部門",
    "群組",
    "通路",
    "門市",
    "channel",
  ],
  paymentMethod: [
    "付款方式",
    "支付方式",
    "結帳方式",
    "pay",
    "payment",
    "付款",
    "支付",
    "方式",
    "method",
  ],
};

function norm(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function scoreHeader(header: string, field: SalesFieldKey): number {
  const raw = header.trim();
  const n = norm(header);
  if (!n) return 0;

  if (field === "amount" && AMOUNT_HEADER_REJECT.test(raw)) return 0;

  // 「商品分類」不要因只含「商品」就被當成品名；有「分類」且沒有「名稱」時當成品類欄
  if (field === "itemName" && /分類/.test(raw) && !/名稱|品名/.test(raw)) return 0;

  let best = 0;
  for (const kw of KEYWORDS[field]) {
    const k = norm(kw);
    if (!k) continue;
    if (n === k) return 100;
    if (n.includes(k) || k.includes(n)) best = Math.max(best, 55);
    else if (n.endsWith(k) || n.startsWith(k)) best = Math.max(best, 45);
  }
  return best;
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const used = new Set<string>();
  const mapping: ColumnMapping = {};
  /** 慣用欄位順序：先搶訂單／客戶／日期，再品名與金額，避免「商品分類」在 item 之前用掉「商品」字樣 */
  const fields: SalesFieldKey[] = [
    "transactionId",
    "customerId",
    "date",
    "category",
    "itemName",
    "quantity",
    "amount",
    "staffName",
    "paymentMethod",
  ];

  for (const field of fields) {
    let bestHeader = "";
    let bestScore = 0;
    for (const h of headers) {
      if (used.has(h)) continue;
      const sc = scoreHeader(h, field);
      if (sc > bestScore) {
        bestScore = sc;
        bestHeader = h;
      }
    }
    if (bestScore >= 40 && bestHeader) {
      mapping[field] = bestHeader;
      used.add(bestHeader);
    }
  }
  return mapping;
}
