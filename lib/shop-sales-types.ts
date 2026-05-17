/** 小店營收分析：欄位鍵與常數 */

export const ROW_HARD_LIMIT = 12_000;
export const ROW_SOFT_WARN = 5000;

export type SalesFieldKey =
  | "date"
  | "itemName"
  | "quantity"
  | "amount"
  | "transactionId"
  | "customerId"
  | "staffName"
  | "category"
  | "paymentMethod";

export type ColumnMapping = Partial<Record<SalesFieldKey, string>>;

export interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  fileLabel: string;
}

export const SALES_FIELD_LABELS: Record<SalesFieldKey, { title: string; hint: string; required?: boolean }> = {
  date: { title: "結帳日期", hint: "結帳或成交那一天" },
  itemName: { title: "商品名稱", hint: "銷售明細上的品名" },
  amount: {
    title: "銷售金額",
    hint: "該列成交金額或小計（勿選「單價」「折扣」欄）",
    required: true,
  },
  quantity: { title: "數量", hint: "沒有就當 1 件" },
  transactionId: { title: "單據／交易編號", hint: "例如訂單ID、訂單編號" },
  customerId: { title: "顧客／會員編號", hint: "例如客戶ID、會員編號" },
  staffName: { title: "人員", hint: "例如服務人員、店員" },
  category: { title: "商品分類", hint: "品類或部門" },
  paymentMethod: { title: "付款方式", hint: "現金、刷卡等" },
};

export const REQUIRED_FIELDS_FOR_BUILD: SalesFieldKey[] = ["date", "itemName", "amount"];
