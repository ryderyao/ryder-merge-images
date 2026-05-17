import { formatDateKey, parseDate, parseMoney, parseQuantity } from "./shop-sales-clean";
import type { ColumnMapping, SalesFieldKey } from "./shop-sales-types";

export type TrendGranularity = "day" | "week" | "month";

export interface NormalizedSaleRow {
  at: Date;
  dateKey: string;
  itemName: string;
  itemKey: string;
  qty: number;
  /** 帳上金額（已依退款規則調整正負） */
  lineRevenue: number;
  rawAmount: number;
  txId: string;
  customerId: string;
  staffName: string;
  category: string;
  paymentMethod: string;
  isRefundRow: boolean;
}

export interface SalesStats {
  /** 納入統計的列數（已去重） */
  rowCount: number;
  totalRevenue: number;
  grossBeforeRefund: number;
  refundRows: number;
  totalQty: number;
  uniqueItems: number;
  /** 用來算客單的「張數」說明 */
  ticketLabel: string;
  ticketCount: number;
  avgTicket: number;
  dailyTrend: { key: string; label: string; revenue: number; tickets: number }[];
  topByQty: { name: string; qty: number }[];
  topByRevenue: { name: string; revenue: number }[];
  paymentShare: { name: string; value: number }[];
  categoryShare: { name: string; value: number }[];
  staffByRevenue: { name: string; revenue: number }[];
  customerBlock: {
    knownRows: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
    orderBuckets: { label: string; count: number }[];
  } | null;
  weekdayAvg: { day: number; label: string; revenue: number }[];
  insights: string[];
  /** 週末營收占比 0–1 */
  weekendShare: number;
}

const WD_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function cell(
  raw: Record<string, unknown>,
  mapping: ColumnMapping,
  key: SalesFieldKey,
): unknown {
  const col = mapping[key];
  if (!col) return undefined;
  return raw[col];
}

function dedupeKey(r: NormalizedSaleRow): string {
  if (r.txId) return `${r.txId}|${r.dateKey}|${r.itemKey}|${r.rawAmount}|${r.qty}`;
  return `${r.dateKey}|${r.itemKey}|${r.rawAmount}|${r.qty}`;
}

export interface NormalizeRowsResult {
  rows: NormalizedSaleRow[];
  skippedInvalid: number;
  duplicateDropped: number;
}

function stableItemKey(rawName: string): string {
  const t = rawName.trim().toLowerCase().replace(/\s+/g, " ");
  return t || "__unnamed__";
}

/** 內建規則：負數金額視為退款；不略過週日；銷售金額欄為該列小計（非單價×數量） */
const TREAT_NEGATIVE_AS_REFUND = true;

export function normalizeRows(rawRows: Record<string, unknown>[], mapping: ColumnMapping): NormalizeRowsResult {
  const candidates: NormalizedSaleRow[] = [];
  let skippedInvalid = 0;
  for (const raw of rawRows) {
    const d = parseDate(cell(raw, mapping, "date"));
    if (!d) {
      skippedInvalid += 1;
      continue;
    }

    const nameCol = mapping.itemName;
    if (!nameCol) {
      skippedInvalid += 1;
      continue;
    }
    const rawName = String(cell(raw, mapping, "itemName") ?? "").trim();
    const itemName = rawName || "（未命名）";
    const itemKey = stableItemKey(rawName);

    const amtRaw = parseMoney(cell(raw, mapping, "amount"));
    if (amtRaw === null) {
      skippedInvalid += 1;
      continue;
    }

    const isRefund = TREAT_NEGATIVE_AS_REFUND && amtRaw < 0;

    const magnitude = Math.abs(amtRaw);
    const qty = parseQuantity(cell(raw, mapping, "quantity"));
    const lineBase = magnitude;
    const lineRevenue = isRefund ? -lineBase : lineBase;
    const txId = String(cell(raw, mapping, "transactionId") ?? "").trim();
    const customerId = String(cell(raw, mapping, "customerId") ?? "").trim();
    const staffName = String(cell(raw, mapping, "staffName") ?? "").trim() || "—";
    const category = String(cell(raw, mapping, "category") ?? "").trim() || "未分類";
    const paymentMethod = String(cell(raw, mapping, "paymentMethod") ?? "").trim() || "未註記";

    candidates.push({
      at: d,
      dateKey: formatDateKey(d),
      itemName,
      itemKey,
      qty: isRefund ? -qty : qty,
      lineRevenue,
      rawAmount: amtRaw,
      txId,
      customerId,
      staffName,
      category,
      paymentMethod,
      isRefundRow: isRefund,
    });
  }

  const seen = new Set<string>();
  const rows: NormalizedSaleRow[] = [];
  let duplicateDropped = 0;
  for (const r of candidates) {
    const k = dedupeKey(r);
    if (seen.has(k)) {
      duplicateDropped += 1;
      continue;
    }
    seen.add(k);
    rows.push(r);
  }
  return { rows, skippedInvalid, duplicateDropped };
}

function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((+t - +new Date(Date.UTC(y, 0, 1))) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

function weekLabel(key: string): string {
  const [y, w] = key.split("-W");
  return `${y} 第 ${Number(w)} 週`;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function aggregateTrend(
  byDay: Map<string, { revenue: number; tickets: Set<string> }>,
  granularity: TrendGranularity,
): { key: string; label: string; revenue: number; tickets: number }[] {
  if (granularity === "day") {
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        key,
        label: key,
        revenue: v.revenue,
        tickets: v.tickets.size,
      }));
  }

  const merged = new Map<string, { revenue: number; tickets: Set<string> }>();
  for (const [dayKey, v] of byDay) {
    const dk = `${dayKey}T12:00:00`;
    const d = new Date(dk);
    const gk = granularity === "week" ? weekKey(d) : monthKey(d);
    const cur = merged.get(gk) ?? { revenue: 0, tickets: new Set<string>() };
    cur.revenue += v.revenue;
    for (const t of v.tickets) cur.tickets.add(t);
    merged.set(gk, cur);
  }

  return [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: granularity === "week" ? weekLabel(key) : key,
      revenue: v.revenue,
      tickets: v.tickets.size,
    }));
}

export function computeSalesStats(
  rows: NormalizedSaleRow[],
  mapping: ColumnMapping,
  trendGranularity: TrendGranularity,
): SalesStats {
  const insights: string[] = [];
  const rowCount = rows.length;
  if (rowCount === 0) {
    return {
      rowCount: 0,
      totalRevenue: 0,
      grossBeforeRefund: 0,
      refundRows: 0,
      totalQty: 0,
      uniqueItems: 0,
      ticketLabel: "—",
      ticketCount: 0,
      avgTicket: 0,
      dailyTrend: [],
      topByQty: [],
      topByRevenue: [],
      paymentShare: [],
      categoryShare: [],
      staffByRevenue: [],
      customerBlock: null,
      weekdayAvg: [],
      insights: ["沒有讀到有效列，請檢查日期與銷售金額欄位。"],
      weekendShare: 0,
    };
  }

  let grossBeforeRefund = 0;
  let refundRows = 0;
  let totalQty = 0;

  for (const r of rows) {
    if (r.isRefundRow) refundRows += 1;
    else grossBeforeRefund += Math.abs(r.lineRevenue);
    totalQty += Math.abs(r.qty);
  }

  const totalRevenue = rows.reduce((s, r) => s + r.lineRevenue, 0);

  const txNonEmpty = rows.filter((r) => r.txId.length > 0).length;
  const txRatio = txNonEmpty / rowCount;
  const uniqueTx = new Set(rows.map((r) => r.txId).filter(Boolean));
  let ticketCount: number;
  let ticketLabel: string;
  if (mapping.transactionId && txRatio >= 0.2 && uniqueTx.size >= 2) {
    ticketCount = uniqueTx.size;
    ticketLabel = "依單據編號";
  } else {
    ticketCount = rowCount;
    ticketLabel = "依明細列數";
  }

  const avgTicket = ticketCount > 0 ? totalRevenue / ticketCount : 0;

  const byDay = new Map<string, { revenue: number; tickets: Set<string> }>();
  for (const r of rows) {
    const bucket = byDay.get(r.dateKey) ?? { revenue: 0, tickets: new Set<string>() };
    bucket.revenue += r.lineRevenue;
    const tid = r.txId || `${r.dateKey}-${r.at.getTime()}`;
    bucket.tickets.add(tid);
    byDay.set(r.dateKey, bucket);
  }

  const dailyTrend = aggregateTrend(byDay, trendGranularity);

  const itemQty = new Map<string, number>();
  const itemRev = new Map<string, number>();
  const itemLabel = new Map<string, string>();
  const soldItemKeys = new Set<string>();

  for (const r of rows) {
    const k = r.itemKey;
    if (!itemLabel.has(k)) itemLabel.set(k, r.itemName);
    itemRev.set(k, (itemRev.get(k) ?? 0) + r.lineRevenue);
    if (!r.isRefundRow) {
      soldItemKeys.add(k);
      itemQty.set(k, (itemQty.get(k) ?? 0) + Math.abs(r.qty));
    }
  }

  const uniqueItems = soldItemKeys.size;

  const topByQty = [...itemQty.entries()]
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, qty]) => ({ name: itemLabel.get(key) ?? key, qty }));
  const topByRevenue = [...itemRev.entries()]
    .filter(([, rev]) => rev > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, revenue]) => ({ name: itemLabel.get(key) ?? key, revenue }));

  const payMap = new Map<string, number>();
  for (const r of rows) {
    payMap.set(r.paymentMethod, (payMap.get(r.paymentMethod) ?? 0) + r.lineRevenue);
  }
  const paymentShare = [...payMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const catMap = new Map<string, number>();
  for (const r of rows) {
    catMap.set(r.category, (catMap.get(r.category) ?? 0) + r.lineRevenue);
  }
  const categoryShare = [...catMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const staffMap = new Map<string, number>();
  if (mapping.staffName) {
    for (const r of rows) {
      if (r.staffName === "—") continue;
      staffMap.set(r.staffName, (staffMap.get(r.staffName) ?? 0) + r.lineRevenue);
    }
  }
  const staffByRevenue = [...staffMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, revenue]) => ({ name, revenue }));

  let customerBlock: SalesStats["customerBlock"] = null;
  if (mapping.customerId) {
    const known = rows.filter((r) => r.customerId.length > 0);
    const byCust = new Map<string, number>();
    for (const r of known) {
      byCust.set(r.customerId, (byCust.get(r.customerId) ?? 0) + 1);
    }
    const uniqueCustomers = byCust.size;
    let repeatCustomers = 0;
    const orderBuckets: { label: string; count: number }[] = [
      { label: "1 次", count: 0 },
      { label: "2 次", count: 0 },
      { label: "3–5 次", count: 0 },
      { label: "6 次以上", count: 0 },
    ];
    for (const n of byCust.values()) {
      if (n >= 2) repeatCustomers += 1;
      if (n === 1) orderBuckets[0].count += 1;
      else if (n === 2) orderBuckets[1].count += 1;
      else if (n <= 5) orderBuckets[2].count += 1;
      else orderBuckets[3].count += 1;
    }
    const repeatRate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;
    customerBlock = {
      knownRows: known.length,
      uniqueCustomers,
      repeatCustomers,
      repeatRate,
      orderBuckets,
    };
  }

  const wdRev = new Map<number, number>();
  const wdCount = new Map<number, number>();
  for (const r of rows) {
    const wd = r.at.getDay();
    wdRev.set(wd, (wdRev.get(wd) ?? 0) + r.lineRevenue);
    wdCount.set(wd, (wdCount.get(wd) ?? 0) + 1);
  }
  const weekdayAvg = [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const sum = wdRev.get(day) ?? 0;
    const c = wdCount.get(day) ?? 0;
    return {
      day,
      label: `週${WD_LABELS[day]}`,
      revenue: c > 0 ? sum / c : 0,
    };
  });

  let weekendRev = 0;
  for (const r of rows) {
    const d = r.at.getDay();
    if (d === 0 || d === 6) weekendRev += r.lineRevenue;
  }
  const weekendShare = totalRevenue > 0 ? weekendRev / totalRevenue : 0;

  if (topByRevenue[0] && totalRevenue > 0) {
    const topShare = topByRevenue[0].revenue / totalRevenue;
    if (topShare >= 0.38) {
      insights.push("主力品項營收很集中，可留意庫存與介紹話術是否過度依賴單一品項。");
    }
  }
  if (weekendShare >= 0.35) {
    insights.push("週末貢獻偏高，可想想平日的小活動或套餐，讓來客更平均一點。");
  }
  if (customerBlock && customerBlock.repeatRate >= 0.28) {
    insights.push("熟客比例健康，維持會員禮遇或再來店理由，有助穩定營收。");
  } else if (customerBlock && customerBlock.uniqueCustomers >= 8 && customerBlock.repeatRate < 0.15) {
    insights.push("大多是一次客，可從體驗流程或回購小禮着手，慢慢拉高再消費。");
  }
  if (refundRows >= Math.max(3, Math.floor(rowCount * 0.05))) {
    insights.push("負數金額列不少，建議對一下是否皆為退款或沖帳，與實際狀況是否一致。");
  }
  if (paymentShare.length >= 2 && totalRevenue > 0) {
    const topPay = paymentShare[0].value / totalRevenue;
    if (topPay >= 0.75) {
      insights.push("付款方式偏單一，若打算推多元支付，可觀察之後占比變化。");
    }
  }
  if (dailyTrend.length >= 10) {
    const last = dailyTrend.slice(-5).reduce((s, x) => s + x.revenue, 0) / 5;
    const prev = dailyTrend.slice(-10, -5).reduce((s, x) => s + x.revenue, 0) / 5;
    if (prev > 0 && last / prev >= 1.12) {
      insights.push("最近幾段區間營收高於前一段，勢頭不錯。");
    } else if (prev > 0 && last / prev <= 0.88) {
      insights.push("最近幾段區間略低於前一段，可先檢查檔期、天氣或人力是否影響到店。");
    }
  }
  if (insights.length === 0) {
    insights.push("報表已整理好，可依圖表觀察趨勢與品項；若要更準，記得補上單號或會員編號。");
  }

  return {
    rowCount,
    totalRevenue,
    grossBeforeRefund,
    refundRows,
    totalQty,
    uniqueItems,
    ticketLabel,
    ticketCount,
    avgTicket,
    dailyTrend,
    topByQty,
    topByRevenue,
    paymentShare,
    categoryShare,
    staffByRevenue,
    customerBlock,
    weekdayAvg,
    insights,
    weekendShare,
  };
}
