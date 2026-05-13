"use client";

import JSZip from "jszip";
import {
  AlertCircle,
  Download,
  ImagePlus,
  Loader2,
  Trash2,
  Package,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import type { JSX } from "react";
import { DashboardCard } from "@/components/ui/dashboard-card";
import {
  baseNameForExport,
  convertFileToMainProductJpeg,
  OUTPUT_SIZE_PX,
} from "@/lib/ecommerce-main-product-image";
import { sendGa4Event } from "@/lib/gtag";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
}

const IOS_PANEL =
  "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-[28px]";
const SOFT_BUTTON =
  "inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition active:opacity-95 disabled:opacity-40 disabled:pointer-events-none";

export default function MainProductImageBatch(): JSX.Element {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoLines, setInfoLines] = useState<string[]>([]);

  const revokeMany = useCallback((urls: string[]): void => {
    urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const ingestFiles = (list: FileList | File[]): void => {
    const next: QueueItem[] = [];
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      next.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });
    if (next.length === 0) return;
    setItems((prev) => [...prev, ...next]);
    setErrorMessage(null);
    setInfoLines([]);
  };

  const removeItem = (id: string): void => {
    setItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setErrorMessage(null);
  };

  const clearAll = (): void => {
    revokeMany(items.map((i) => i.previewUrl));
    setItems([]);
    setErrorMessage(null);
    setInfoLines([]);
  };

  const convertAndZip = async (): Promise<void> => {
    setErrorMessage(null);
    setInfoLines([]);
    if (items.length === 0) {
      setErrorMessage("請先加入至少一張圖片");
      return;
    }
    setBusy(true);
    const warnings: string[] = [];
    const zip = new JSZip();
    let added = 0;
    try {
      for (const it of items) {
        try {
          const { blob, hints } = await convertFileToMainProductJpeg(it.file);
          hints.forEach((h) => warnings.push(`${it.file.name}：${h}`));
          zip.file(`${baseNameForExport(it.file.name)}.jpg`, blob);
          added += 1;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "轉換失敗";
          warnings.push(`${it.file.name}：${msg}`);
        }
      }

      if (added === 0) {
        setErrorMessage("沒有任何檔案轉換成功，請確認圖檔格式後再試。");
        if (warnings.length) setInfoLines(warnings);
        return;
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(zipBlob);
      anchor.download = `main-product-${OUTPUT_SIZE_PX}px-${Date.now()}.zip`;
      anchor.rel = "noopener";
      anchor.click();
      queueMicrotask(() => URL.revokeObjectURL(anchor.href));

      sendGa4Event("main_product_batch_zip", {
        image_count: items.length,
        output_px: OUTPUT_SIZE_PX,
      });

      if (warnings.length) setInfoLines(warnings);
    } catch {
      setErrorMessage("打包失敗，請稍後再試或減少張數。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-0 max-w-6xl flex-col gap-8 px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6 lg:px-8">
      <input
        ref={inputRef}
        id={`main-product-upload-${uid}`}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          if (e.target.files?.length) {
            ingestFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      <DashboardCard className={`p-5 sm:p-8 ${busy ? "pointer-events-none opacity-[0.92]" : ""}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[#636366]">批量處理</p>
            <p className="text-[17px] font-semibold text-[#1C1C1E]">
              輸出規格：JPG · {OUTPUT_SIZE_PX}×{OUTPUT_SIZE_PX} px · 檔案約 50 KB～1000 KB（自動調整品質）
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={`${SOFT_BUTTON} bg-[#0A84FF]/90 text-white shadow-md`}
              onClick={() => inputRef.current?.click()}
            >
              <span className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" aria-hidden />
                選擇圖片
              </span>
            </button>
            <button
              type="button"
              disabled={items.length === 0 || busy}
              className={`${SOFT_BUTTON} border border-white/50 bg-white/75 text-[#D70015]`}
              onClick={() => clearAll()}
            >
              <Trash2 className="mr-1 h-4 w-4" aria-hidden />
              全部清除
            </button>
          </div>
        </div>

        <div
          className={`${IOS_PANEL} mt-8 border-dashed border-[#CED1DE]/90 p-8 text-center`}
          role="presentation"
          tabIndex={0}
          aria-label="拖曳圖片上傳"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (busy) return;
            if (e.dataTransfer.files?.length) ingestFiles(e.dataTransfer.files);
          }}
        >
          <p className="text-base font-semibold text-[#1C1C1E]">拖曳多張圖片到此，或按上方「選擇圖片」</p>
          <p className="mt-2 text-sm text-[#8E8E93]">支援 JPG／PNG／WebP 等（依瀏覽器）</p>
        </div>

        {items.length === 0 ? (
          <p className="mt-8 text-center text-sm text-[#8E8E93]">尚未加入圖片；預覽縮圖確認無誤後再轉換。</p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((it) => (
              <li key={it.id} className={`${IOS_PANEL} overflow-hidden p-2`}>
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#EFEFF4]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob 預覽 */}
                  <img src={it.previewUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                  <button
                    type="button"
                    aria-label={`移除 ${it.file.name}`}
                    disabled={busy}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-40"
                    onClick={() => removeItem(it.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p className="mt-2 truncate px-0.5 text-[11px] font-medium text-[#636366]" title={it.file.name}>
                  {it.file.name}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#636366]">{items.length > 0 ? `已選 ${items.length} 張` : "未選擇圖片"}</p>
          <button
            type="button"
            disabled={items.length === 0 || busy}
            className={`${SOFT_BUTTON} w-full justify-center rounded-[22px] bg-[#34C759] text-white shadow-lg sm:w-auto sm:min-w-[220px]`}
            onClick={() => void convertAndZip()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                轉換並打包…
              </>
            ) : (
              <>
                <Package className="mr-2 h-5 w-5" aria-hidden />
                轉換並下載 ZIP
              </>
            )}
          </button>
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#AEAEB2]">
          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ZIP 內為 JPG，檔名沿用原檔（不含原副檔名）。全部在你的瀏覽器處理。
        </p>
      </DashboardCard>

      {errorMessage ? (
        <div role="alert">
          <DashboardCard className="flex gap-4 border-[#FF6961]/70 p-6 text-[#D70015]">
            <AlertCircle className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-sm font-semibold leading-relaxed">{errorMessage}</span>
          </DashboardCard>
        </div>
      ) : null}

      {infoLines.length > 0 ? (
        <DashboardCard className="border-[#FFCC00]/40 bg-[#FFFBEB]/90 p-6 text-[#8E6A00]">
          <p className="text-sm font-semibold leading-relaxed">部分項目需注意：</p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-relaxed">
            {infoLines.map((line, idx) => (
              <li key={`${idx}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </DashboardCard>
      ) : null}
    </div>
  );
}
