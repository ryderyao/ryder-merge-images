/** 清洗日期、金額、數量（本地端用） */

function normalizeMoneyString(raw: string): string {
  return raw.replace(/[,\s]/g, "").replace(/NT\$?/gi, "").replace(/^\$\s?/, "").trim();
}

export function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number.parseFloat(normalizeMoneyString(s));
  return Number.isFinite(n) ? n : null;
}

export function parseQuantity(v: unknown): number {
  if (v === null || v === undefined) return 1;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  const s = String(v).trim();
  if (!s) return 1;
  const n = Number.parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Excel 序號日期 */
function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(serial * 86400000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 盡力解析為 Date；失敗回 null。
 * 支援 ISO、常見中文分隔、Excel 序號。
 */
export function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 20000 && v < 60000) return excelSerialToDate(v);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = Number.parseFloat(s);
    if (serial > 20000 && serial < 100000) return excelSerialToDate(serial);
  }
  const normalized = s.replace(/\./g, "-").replace(/\//g, "-");
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) return d;
  const d2 = new Date(s);
  return Number.isNaN(d2.getTime()) ? null : d2;
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getHour(d: Date): number {
  return d.getHours();
}
