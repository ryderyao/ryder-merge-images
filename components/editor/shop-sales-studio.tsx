"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Download,
  Loader2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { sendGa4Event } from "@/lib/gtag";
import { guessColumnMapping } from "@/lib/shop-sales-mapping";
import { parseSalesFile } from "@/lib/shop-sales-parse";
import {
  REQUIRED_FIELDS_FOR_BUILD,
  ROW_SOFT_WARN,
  SALES_FIELD_LABELS,
  type ColumnMapping,
  type SalesFieldKey,
} from "@/lib/shop-sales-types";
import {
  type TrendGranularity,
  computeSalesStats,
  normalizeRows,
} from "@/lib/shop-sales-stats";

const IOS_PANEL =
  "bg-white/75 backdrop-blur-md border border-white/30 shadow-[0_1px_2px_rgba(28,28,30,0.04),0_16px_48px_rgba(28,28,30,0.07)] rounded-[28px]";
const SOFT_BTN =
  "inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition active:opacity-95 disabled:opacity-40 disabled:pointer-events-none";

const CHART_COLORS = ["#0A84FF", "#34C759", "#FF9F0A", "#FF375F", "#AF52DE", "#5AC8FA", "#8E8E93"];
const TICK_FILL = "#8E8E93";
const GRID_STROKE = "#E5E5EA";

function currency(n: number): string {
  return n.toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

function tipRevenue(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [`NT$ ${currency(Number.isFinite(n) ? n : 0)}`, "營收"];
}

function tipAvg(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [`NT$ ${currency(Number.isFinite(n) ? n : 0)}`, "平均每列"];
}

function tipQty(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [String(Number.isFinite(n) ? Math.round(n) : 0), "件數"];
}

function tipMoneyLabel(value: unknown, label: string): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [`NT$ ${currency(Number.isFinite(n) ? n : 0)}`, label];
}

type PieSliceWithPct = { name: string; value: number; pct: number };

function withPiePercentages(rows: { name: string; value: number }[]): PieSliceWithPct[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total <= 0) return rows.map((r) => ({ ...r, pct: 0 }));
  return rows.map((r) => ({ ...r, pct: (r.value / total) * 100 }));
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: PieSliceWithPct }>;
}): JSX.Element | null {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-2xl border border-[#1C1C1E]/10 bg-white px-3 py-2.5 text-[13px] shadow-lg">
      <p className="font-semibold text-[#1C1C1E]">{row.name}</p>
      <p className="mt-1 tabular-nums text-[#48484A]">NT$ {currency(row.value)}</p>
      <p className="mt-0.5 tabular-nums font-semibold text-[#0A84FF]">{row.pct.toFixed(1)}%</p>
    </div>
  );
}

function DonutLegendContent(props: {
  payload?: ReadonlyArray<{ value?: string; color?: string; payload?: PieSliceWithPct }>;
}): JSX.Element {
  const { payload } = props;
  if (!payload?.length) return <></>;
  return (
    <ul className="mx-auto flex max-w-full flex-wrap justify-center gap-x-4 gap-y-2 px-1 pt-1">
      {payload.map((entry, i) => {
        const row = entry.payload;
        const pct = row?.pct ?? 0;
        return (
          <li
            key={`${String(entry.value)}-${i}`}
            className="flex items-start gap-1.5 text-[11px] leading-tight"
          >
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="flex min-w-0 flex-col">
              <span className="font-medium text-[#1C1C1E]">{entry.value}</span>
              <span className="tabular-nums text-[#8E8E93]">{pct.toFixed(1)}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function rowBucket(n: number): string {
  if (n < 100) return "lt_100";
  if (n < 500) return "100_499";
  if (n < 2000) return "500_1999";
  return "2000_plus";
}

function isAcceptedSalesFile(file: File): boolean {
  const n = (file.name || "").toLowerCase();
  return n.endsWith(".csv") || n.endsWith(".xlsx") || n.endsWith(".xls");
}

/** 預覽用：把儲存格拉成可讀字串 */
function previewCellText(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" });
  }
  const s = String(v).replace(/\s+/g, " ").trim();
  return s || "—";
}

const ALL_FIELDS: SalesFieldKey[] = [
  "date",
  "itemName",
  "amount",
  "quantity",
  "transactionId",
  "customerId",
  "staffName",
  "category",
  "paymentMethod",
];

function mappingComplete(m: ColumnMapping): boolean {
  return REQUIRED_FIELDS_FOR_BUILD.every((k) => Boolean(m[k]?.trim()));
}

interface ShopSalesStudioProps {
  hidePageHeading?: boolean;
}

export default function ShopSalesStudio({ hidePageHeading: _hide }: ShopSalesStudioProps): JSX.Element {
  const inputId = useId();
  const dashRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("day");
  const [exporting, setExporting] = useState(false);
  const buildGaSent = useRef(false);
  const [dropHighlight, setDropHighlight] = useState(false);
  const dragDepth = useRef(0);

  const onPickFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setErr(null);
    setBusy(true);
    buildGaSent.current = false;
    try {
      const { headers: hs, rows, fileLabel: label } = await parseSalesFile(file);
      setFileLabel(label);
      setHeaders(hs);
      setRawRows(rows);
      setMapping(guessColumnMapping(hs));
      setAnalysisStarted(false);
    } catch (e) {
      setFileLabel(null);
      setHeaders([]);
      setRawRows([]);
      setMapping({});
      setAnalysisStarted(false);
      setErr(e instanceof Error ? e.message : "讀檔時發生問題，請換一份試試。");
    } finally {
      setBusy(false);
    }
  }, []);

  const normalizedPack = useMemo(() => {
    if (!mappingComplete(mapping)) return null;
    return normalizeRows(rawRows, mapping);
  }, [rawRows, mapping]);

  const stats = useMemo(() => {
    if (!analysisStarted || !normalizedPack) return null;
    return computeSalesStats(normalizedPack.rows, mapping, trendGranularity);
  }, [analysisStarted, normalizedPack, mapping, trendGranularity]);

  const paymentPieData = useMemo(
    () => (stats ? withPiePercentages(stats.paymentShare) : []),
    [stats],
  );
  const categoryPieData = useMemo(
    () => (stats ? withPiePercentages(stats.categoryShare) : []),
    [stats],
  );

  useEffect(() => {
    if (!analysisStarted || !stats || !normalizedPack || buildGaSent.current) return;
    buildGaSent.current = true;
    const ext = fileLabel?.toLowerCase().endsWith(".csv") ? "csv" : "sheet";
    sendGa4Event("shop_sales_build", {
      file_kind: ext,
      rows: rowBucket(normalizedPack.rows.length),
    });
  }, [analysisStarted, stats, normalizedPack, fileLabel]);

  useEffect(() => {
    if (!analysisStarted || !stats) return;
    const id = window.setTimeout(() => {
      document.getElementById("shop-sales-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(id);
  }, [analysisStarted, stats]);

  const handleMapChange = (key: SalesFieldKey, col: string) => {
    setAnalysisStarted(false);
    setMapping((prev) => {
      const next = { ...prev };
      if (!col || col === "__none__") delete next[key];
      else next[key] = col;
      return next;
    });
  };

  const handleExportPng = async () => {
    const el = dashRef.current;
    if (!el || !stats) return;
    setExporting(true);
    setErr(null);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#F2F2F7",
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) {
          setErr("圖片存不下來，請再試一次。");
          return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `營收看板_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        sendGa4Event("shop_sales_png", { ok: true });
      }, "image/png");
    } catch {
      setErr("輸出圖片時卡住，可改用螢幕截圖。");
      sendGa4Event("shop_sales_png", { ok: false });
    } finally {
      setExporting(false);
    }
  };

  const rowWarn =
    rawRows.length >= ROW_SOFT_WARN ? (
      <p className="text-[12px] leading-relaxed text-[#FF9F0A]">
        資料列不少，瀏覽器可能會頓一下；建議先篩選區間再上傳。
      </p>
    ) : null;

  const onUploadDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current += 1;
    setDropHighlight(true);
  };

  const onUploadDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDropHighlight(false);
    }
  };

  const onUploadDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) e.dataTransfer.dropEffect = "copy";
  };

  const onUploadDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDropHighlight(false);
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!isAcceptedSalesFile(f)) {
      setErr("請拖曳 .csv、.xlsx 或 .xls 檔。");
      return;
    }
    void onPickFile(f);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-2 sm:px-6 lg:px-8">
      <section
        className={
          IOS_PANEL +
          " p-6 sm:p-8 transition-[box-shadow,ring] " +
          (dropHighlight
            ? " ring-2 ring-[#0A84FF] ring-offset-2 ring-offset-[#F2F2F7] shadow-[0_0_0_1px_rgba(10,132,255,0.35)]"
            : "")
        }
        aria-label="上傳"
        onDragEnter={onUploadDragEnter}
        onDragLeave={onUploadDragLeave}
        onDragOver={onUploadDragOver}
        onDrop={onUploadDrop}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8E8E93]">本機分析</p>
            <h2 className="text-xl font-semibold tracking-tight text-[#1C1C1E] sm:text-2xl">上傳你的銷售報表</h2>
            <p className="max-w-xl text-[15px] leading-relaxed text-[#636366]">
              Excel 或 CSV 都可以。把檔案拖進這塊區域，或按右側按鈕選擇。
            </p>
            {rowWarn}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
            <input
              id={inputId}
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="sr-only"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor={inputId}
              className={
                SOFT_BTN +
                " gap-2 bg-[#1C1C1E] text-white hover:opacity-95 " +
                (busy ? " pointer-events-none opacity-50" : "")
              }
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              選擇檔案
            </label>
            {fileLabel ? (
              <p className="text-center text-[13px] text-[#636366] md:text-right">
                目前：<span className="font-medium text-[#1C1C1E]">{fileLabel}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {err ? (
        <p className="mt-6 rounded-2xl border border-[#FF375F]/25 bg-[#FF375F]/[0.06] px-4 py-3 text-[14px] text-[#1C1C1E]">
          {err}
        </p>
      ) : null}

      {headers.length > 0 ? (
        <section className="mt-8 space-y-5" aria-label="對欄位">
          <div className="rounded-[28px] border border-[#1C1C1E]/[0.06] bg-white/70 px-5 py-5 sm:px-7 sm:py-6">
            <h3 className="text-lg font-semibold text-[#1C1C1E]">你的表頭與第一列</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8E8E93]">
              先對一下名稱與內容，再從下面選單替每個項目挑對應的那一欄。
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#C7C7CC]/50 bg-white/90 shadow-inner">
              <table className="min-w-max w-full border-collapse text-left text-[13px] text-[#1C1C1E]">
                <thead>
                  <tr className="border-b border-[#E5E5EA] bg-[#F2F2F7]/90">
                    {headers.map((h, colIdx) => (
                      <th
                        key={`preview-head-${colIdx}`}
                        scope="col"
                        className="whitespace-nowrap px-3 py-3 font-semibold tracking-tight text-[#1C1C1E]"
                      >
                        {h || "（空白欄名）"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#E5E5EA]/80 last:border-0">
                    {headers.map((h, colIdx) => (
                      <td
                        key={`preview-cell-${colIdx}`}
                        className="max-w-[14rem] whitespace-normal break-words px-3 py-3 text-[#48484A]"
                      >
                        {previewCellText(rawRows[0]?.[h])}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {rawRows.length === 0 ? (
              <p className="mt-3 text-[12px] text-[#FF9F0A]">這份表讀不到任何資料列，請確認不是空白表。</p>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-[#1C1C1E]/[0.06] bg-white/60 px-5 py-5 sm:px-7 sm:py-6">
            <h3 className="text-lg font-semibold text-[#1C1C1E]">告訴我們哪一欄是什麼</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8E8E93]">
              底下清單已試著猜過，不對就改一下。前三項一定要有。
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {ALL_FIELDS.map((key) => {
                const meta = SALES_FIELD_LABELS[key];
                const val = mapping[key] ?? "";
                return (
                  <label key={key} className="block space-y-1.5">
                    <span className="flex items-baseline gap-2 text-[13px] font-semibold text-[#1C1C1E]">
                      {meta.title}
                      {meta.required ? (
                        <span className="text-[11px] font-medium text-[#0A84FF]">必填</span>
                      ) : null}
                    </span>
                    <span className="block text-[11px] leading-snug text-[#AEAEB2]">{meta.hint}</span>
                    <select
                      value={val || "__none__"}
                      onChange={(e) => handleMapChange(key, e.target.value)}
                      className="mt-0.5 w-full rounded-2xl border border-[#C7C7CC]/80 bg-white px-3 py-2.5 text-[14px] text-[#1C1C1E] outline-none focus:border-[#0A84FF]"
                    >
                      <option value="__none__">沒有這一欄</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-[#1C1C1E]/[0.06] pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] leading-relaxed text-[#8E8E93]">
                對完上面表頭預覽後，按右側產生圖表；若要改欄位，請用圖表上方的「返回修改欄位」。
              </p>
              <button
                type="button"
                disabled={!mappingComplete(mapping) || busy}
                onClick={() => {
                  if (!mappingComplete(mapping)) return;
                  buildGaSent.current = false;
                  setAnalysisStarted(true);
                }}
                className={
                  SOFT_BTN +
                  " gap-2 bg-[#0A84FF] text-white hover:opacity-95 disabled:pointer-events-none disabled:opacity-40"
                }
              >
                開始分析
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {stats && normalizedPack ? (
        <div id="shop-sales-results" className="mt-10 space-y-6 scroll-mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold text-[#1C1C1E]">營收看板</h3>
              <p className="mt-1 text-[13px] text-[#8E8E93]">
                有效列 {stats.rowCount.toLocaleString("zh-TW")} 筆
                {normalizedPack.duplicateDropped > 0
                  ? ` · 已去掉重複 ${normalizedPack.duplicateDropped.toLocaleString("zh-TW")} 筆`
                  : ""}
                {normalizedPack.skippedInvalid > 0
                  ? ` · 略過缺欄 ${normalizedPack.skippedInvalid.toLocaleString("zh-TW")} 列`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  buildGaSent.current = false;
                  setAnalysisStarted(false);
                }}
                className="rounded-full border border-[#C7C7CC]/90 bg-white px-4 py-2 text-[13px] font-semibold text-[#48484A] transition hover:bg-[#F2F2F7]"
              >
                返回修改欄位
              </button>
              <span className="text-[12px] font-medium text-[#8E8E93]">走勢節奏</span>
              {(
                [
                  ["day", "逐日"],
                  ["week", "依週"],
                  ["month", "依月"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTrendGranularity(value)}
                  className={
                    "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition " +
                    (trendGranularity === value
                      ? "bg-[#1C1C1E] text-white"
                      : "border border-[#C7C7CC]/80 bg-white text-[#48484A] hover:bg-white")
                  }
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void handleExportPng()}
                disabled={exporting}
                className={
                  SOFT_BTN +
                  " ml-1 gap-2 border border-[#1C1C1E]/10 bg-white text-[#1C1C1E] shadow-sm"
                }
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                下載這張看板圖
              </button>
            </div>
          </div>

          <div ref={dashRef} className="space-y-6 rounded-[32px] bg-[#F2F2F7]/80 p-4 sm:p-6">
            <BentoGrid>
              {[
                { label: "總營收", value: `NT$ ${currency(stats.totalRevenue)}` },
                { label: "平均每單約", value: `NT$ ${currency(stats.avgTicket)}` },
                { label: "總件數", value: `${currency(stats.totalQty)}` },
              ].map((kpi) => (
                <BentoItem key={kpi.label} span={1}>
                  <div className={IOS_PANEL + " flex h-full flex-col justify-center p-5"}>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8E8E93]">{kpi.label}</p>
                    <p className="mt-3 text-[clamp(1.25rem,3vw,1.75rem)] font-semibold tabular-nums tracking-tight text-[#1C1C1E]">
                      {kpi.value}
                    </p>
                  </div>
                </BentoItem>
              ))}

              <BentoItem span={2}>
                <div className={IOS_PANEL + " h-[320px] p-5 sm:h-[340px]"}>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#0A84FF]" aria-hidden />
                    <h4 className="text-[15px] font-semibold text-[#1C1C1E]">營收走勢</h4>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#AEAEB2]">橫軸是看板上方的節奏設定</p>
                  <div className="mt-2 h-[calc(100%-3.25rem)] min-h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.dailyTrend}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: TICK_FILL, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fill: TICK_FILL, fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid rgba(28,28,30,0.08)",
                            fontSize: 13,
                          }}
                          formatter={tipRevenue}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0A84FF"
                          strokeWidth={2}
                          fill="url(#revGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </BentoItem>

              <BentoItem span={2}>
                <div className={IOS_PANEL + " h-[320px] p-5 sm:h-[340px]"}>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#34C759]" aria-hidden />
                    <h4 className="text-[15px] font-semibold text-[#1C1C1E]">哪幾天最常賣</h4>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#AEAEB2]">每列平均帶來多少錢（愈高愈旺）</p>
                  <div className="mt-2 h-[calc(100%-3.25rem)] min-h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.weekdayAvg} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={44}
                          tick={{ fill: TICK_FILL, fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 16, border: "1px solid rgba(28,28,30,0.08)", fontSize: 13 }}
                          formatter={(v) => tipAvg(v)}
                        />
                        <Bar dataKey="revenue" radius={[0, 8, 8, 0]} fill="#34C759" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </BentoItem>

              <BentoItem span={2}>
                <div className={IOS_PANEL + " min-h-[300px] p-5"}>
                  <h4 className="text-[15px] font-semibold text-[#1C1C1E]">熱銷品（依數量）</h4>
                  <p className="mt-0.5 text-[11px] text-[#AEAEB2]">賣最多的前幾名</p>
                  <div className="mt-3 h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.topByQty} margin={{ left: 4, right: 12 }}>
                        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: TICK_FILL, fontSize: 9 }} interval={0} angle={-24} textAnchor="end" height={56} />
                        <YAxis tick={{ fill: TICK_FILL, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 16, border: "1px solid rgba(28,28,30,0.08)", fontSize: 13 }}
                          formatter={(v) => tipQty(v)}
                        />
                        <Bar dataKey="qty" radius={[8, 8, 0, 0]} fill="#0A84FF" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </BentoItem>

              <BentoItem span={2}>
                <div className={IOS_PANEL + " min-h-[300px] p-5"}>
                  <h4 className="text-[15px] font-semibold text-[#1C1C1E]">熱銷品（依銷售金額）</h4>
                  <p className="mt-0.5 text-[11px] text-[#AEAEB2]">貢獻營收最多的前幾名</p>
                  <div className="mt-3 h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.topByRevenue} margin={{ left: 4, right: 12 }}>
                        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: TICK_FILL, fontSize: 9 }} interval={0} angle={-24} textAnchor="end" height={56} />
                        <YAxis
                          tick={{ fill: TICK_FILL, fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 16, border: "1px solid rgba(28,28,30,0.08)", fontSize: 13 }}
                          formatter={(v) => tipRevenue(v)}
                        />
                        <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="#AF52DE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </BentoItem>

              {stats.paymentShare.length > 0 ? (
                <BentoItem span={2}>
                  <div className={IOS_PANEL + " flex h-[320px] flex-col p-5"}>
                    <h4 className="text-[15px] font-semibold text-[#1C1C1E]">付款方式占比</h4>
                    <p className="mt-0.5 text-[11px] text-[#AEAEB2]">依營收加總</p>
                    <div className="mt-2 min-h-0 w-full flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Pie
                            data={paymentPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="48%"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={2}
                          >
                            {paymentPieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<DonutTooltip />} />
                          <Legend content={<DonutLegendContent />} verticalAlign="bottom" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </BentoItem>
              ) : null}

              {stats.categoryShare.length > 0 ? (
                <BentoItem span={2}>
                  <div className={IOS_PANEL + " flex h-[320px] flex-col p-5"}>
                    <h4 className="text-[15px] font-semibold text-[#1C1C1E]">商品分類占比</h4>
                    <p className="mt-0.5 text-[11px] text-[#AEAEB2]">依營收加總</p>
                    <div className="mt-2 min-h-0 w-full flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Pie
                            data={categoryPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="48%"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={2}
                          >
                            {categoryPieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<DonutTooltip />} />
                          <Legend content={<DonutLegendContent />} verticalAlign="bottom" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </BentoItem>
              ) : null}

              {stats.staffByRevenue.length > 0 ? (
                <BentoItem span={4}>
                  <div className={IOS_PANEL + " min-h-[280px] p-5"}>
                    <h4 className="text-[15px] font-semibold text-[#1C1C1E]">人員表現</h4>
                    <p className="mt-0.5 text-[11px] text-[#AEAEB2]">依帳上營收排行（有對應欄位才有）</p>
                    <div className="mt-3 h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.staffByRevenue} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={96}
                            tick={{ fill: TICK_FILL, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: 16, border: "1px solid rgba(28,28,30,0.08)", fontSize: 13 }}
                            formatter={(v) => tipRevenue(v)}
                          />
                          <Bar dataKey="revenue" radius={[0, 8, 8, 0]} fill="#5AC8FA" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </BentoItem>
              ) : null}

              {stats.customerBlock ? (
                <BentoItem span={4}>
                  <div className={IOS_PANEL + " p-6"}>
                    <h4 className="text-[15px] font-semibold text-[#1C1C1E]">顧客再回來的比例</h4>
                    <p className="mt-0.5 text-[11px] text-[#AEAEB2]">
                      只統計有填顧客／會員編號的列，共 {stats.customerBlock.knownRows.toLocaleString("zh-TW")}{" "}
                      筆
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl bg-[#F2F2F7] p-4">
                        <p className="text-[11px] font-semibold text-[#8E8E93]">不同顧客數</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1C1C1E]">
                          {stats.customerBlock.uniqueCustomers}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F2F2F7] p-4">
                        <p className="text-[11px] font-semibold text-[#8E8E93]">至少來兩次</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1C1C1E]">
                          {stats.customerBlock.repeatCustomers}
                        </p>
                        <p className="mt-1 text-[11px] text-[#AEAEB2]">
                          約 {Math.round(stats.customerBlock.repeatRate * 100)}% 顧客會回購
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F2F2F7] p-4">
                        <p className="text-[11px] font-semibold text-[#8E8E93]">購買次數分布</p>
                        <ul className="mt-2 space-y-1 text-[13px] text-[#48484A]">
                          {stats.customerBlock.orderBuckets.map((b) => (
                            <li key={b.label} className="flex justify-between tabular-nums">
                              <span>{b.label}</span>
                              <span className="font-medium">{b.count} 人</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </BentoItem>
              ) : null}
            </BentoGrid>

            {stats.refundRows > 0 ? (
              <p className="text-center text-[11px] text-[#AEAEB2]">計入退款的列：{stats.refundRows} 筆</p>
            ) : null}
          </div>
        </div>
      ) : headers.length > 0 && !mappingComplete(mapping) ? (
        <p className="mt-8 rounded-2xl border border-[#C7C7CC]/80 bg-white/70 px-4 py-3 text-[14px] text-[#636366]">
          請把「結帳日期」「商品名稱」「銷售金額」三欄對好，再按「開始分析」。
        </p>
      ) : null}
    </div>
  );
}
