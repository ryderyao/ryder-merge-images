import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { ROW_HARD_LIMIT, type ParseResult } from "./shop-sales-types";

function trimRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim();
    if (!key) continue;
    out[key] = v;
  }
  return out;
}

export async function parseSalesFile(file: File): Promise<ParseResult> {
  const name = file.name || "匯出檔";
  const lower = name.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
    });
    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new Error("這份 CSV 讀起來怪怪的，請確認第一列是表頭。");
    }
    const rows = parsed.data
      .map((r) => trimRowKeys(r))
      .filter((r) => Object.keys(r).length > 0)
      .slice(0, ROW_HARD_LIMIT);
    const headers =
      parsed.meta.fields?.map((h) => String(h).trim()).filter(Boolean) ??
      (rows[0] ? Object.keys(rows[0]) : []);
    if (!headers.length) throw new Error("找不到欄位名稱，請確認第一列是表頭。");
    return { headers, rows, fileLabel: name };
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array", cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("試算表裡沒有資料。");
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    }) as Record<string, unknown>[];
    const trimmed = rows
      .map((r) => trimRowKeys(r))
      .filter((r) => Object.keys(r).length > 0)
      .slice(0, ROW_HARD_LIMIT);
    const headers = trimmed[0] ? Object.keys(trimmed[0]) : [];
    if (!headers.length) throw new Error("找不到欄位名稱。");
    return { headers, rows: trimmed, fileLabel: name };
  }

  throw new Error("目前支援 CSV 或 Excel（.xlsx / .xls）。");
}
