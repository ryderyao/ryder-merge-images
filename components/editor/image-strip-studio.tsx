"use client";

import { AnimatePresence, motion, Reorder } from "framer-motion";
import {
  GripVertical,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Scissors,
  Layers3,
  Download,
  AlertCircle,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import type { JSX } from "react";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { mergeImagesVertically, splitMergedByHeights, splitImageEqualParts } from "@/lib/image-strip";
import { sendGa4Event } from "@/lib/gtag";

interface StripItem {
  id: string;
  url: string;
}

const IOS_PANEL =
  "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-[32px]";
const SOFT_BUTTON =
  "inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition active:opacity-95 disabled:opacity-40 disabled:pointer-events-none";

/** 電商長條圖：多圖拖拉排序 → 縱向合併 / 對應比例或均等拆解（全在瀏覽器本地處理） */
export default function ImageStripStudio(): JSX.Element {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<StripItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [segmentHeights, setSegmentHeights] = useState<number[] | null>(null);

  /** 無合併元資料時使用的均等切分段數（例如單張長屏截圖） */
  const [equalParts, setEqualParts] = useState<number>(5);

  const revokeSafely = useCallback((urls: Iterable<string>): void => {
    for (const u of urls) {
      URL.revokeObjectURL(u);
    }
  }, []);

  const ingestFiles = (list: FileList | File[]): void => {
    const next: StripItem[] = [];
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      next.push({ id: crypto.randomUUID(), url });
    });
    setItems((prev) => [...prev, ...next]);
    setMergedUrl(null);
    setMergedBlob(null);
    setSegmentHeights(null);
    setErrorMessage(null);
  };

  const onMerge = async (): Promise<void> => {
    setErrorMessage(null);
    if (items.length < 2) {
      setErrorMessage("請至少選擇兩張圖片再以縱向合併為長條圖");
      return;
    }
    setBusy(true);
    try {
      const urls = items.map((i) => i.url);
      const result = await mergeImagesVertically(urls);
      setMergedUrl(result.dataUrl);
      setMergedBlob(result.blob);
      setSegmentHeights(result.segmentHeights);
      sendGa4Event("strip_merge", {
        image_count: items.length,
        output_width_px: result.canvasWidth,
      });
    } catch {
      setErrorMessage("影像合併失敗：請確認檔案可讀並非損毁檔案");
    } finally {
      setBusy(false);
    }
  };

  /** 一有合併切片資訊就依比例還原；否則以均等切分分拆目前預覽圖（單圖亦能使用） */
  const onSplit = async (): Promise<void> => {
    setErrorMessage(null);
    let sourceUrl = mergedUrl;
    let heights = segmentHeights;

    if (!sourceUrl && items.length === 1) {
      sourceUrl = items[0].url;
      heights = null;
    }

    if (!sourceUrl) {
      setErrorMessage("請先「一鍵合併」或只保留單張長圖以利拆解流程");
      return;
    }

    setBusy(true);
    try {
      const splits =
        heights && heights.length
          ? await splitMergedByHeights(sourceUrl, heights)
          : await splitImageEqualParts(sourceUrl, Math.max(2, equalParts));

      revokeSafely(items.map((i) => i.url));
      const nextItems: StripItem[] = splits.map((dataUrl) => ({
        id: crypto.randomUUID(),
        url: dataUrl,
      }));
      setItems(nextItems);
      setMergedUrl(null);
      setMergedBlob(null);
      setSegmentHeights(null);
      sendGa4Event("strip_split", {
        segment_count: splits.length,
        mode: heights?.length ? "proportional" : "equal",
      });
    } catch {
      setErrorMessage("拆解失敗：請確認圖檔可被瀏覽器讀取");
    } finally {
      setBusy(false);
    }
  };

  const triggerUpload = (): void => {
    inputRef.current?.click();
  };

  const downloadMerged = (): void => {
    if (!mergedBlob) return;
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(mergedBlob);
    anchor.download = `strip-${Date.now()}.png`;
    anchor.rel = "noopener";
    anchor.click();
    queueMicrotask(() => URL.revokeObjectURL(anchor.href));
  };

  const discardMergePreview = (): void => {
    setMergedUrl(null);
    setMergedBlob(null);
    setSegmentHeights(null);
  };

  const canMerge = items.length >= 2 && !busy;
  const canSplit =
    !busy &&
    (Boolean(mergedUrl) || items.length === 1);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#636366]">電商視覺</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(2.4rem,4vw,3.75rem)] font-semibold leading-none tracking-tighter text-[#1C1C1E]">
                長條圖合併工作台
              </h1>
            </div>
          </div>
          <span className={`${IOS_PANEL} shrink-0 px-5 py-2 text-sm font-semibold text-[#3A3A3C]`}>
            Drag · Merge · Slice
          </span>
        </div>
        <p className="max-w-2xl text-base text-[#8E8E93] md:text-[17px]">
          上傳電商細節圖，拖曳排列順序，一鍵輸出高解析長條圖；再依最近一次合併比例或自定段數將畫面切回電商區塊節奏。
        </p>
      </header>

      <input
        ref={inputRef}
        id={`strip-upload-${uid}`}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) {
            ingestFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      <BentoGrid>
        <BentoItem span={4}>
          <DashboardCard className="p-5 sm:p-8">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">素材列</p>
                  <div className="flex items-center gap-2 text-xl font-semibold tracking-tighter text-[#1C1C1E] sm:text-[28px]">
                    <LayoutGrid className="h-6 w-6 text-[#8E8E93]" aria-hidden />
                    拖曳區塊
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`count-${items.length}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm font-medium text-[#8E8E93]"
                    >
                      {`${items.length} 張`}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end md:justify-start">
                  <button
                    type="button"
                    onClick={() => triggerUpload()}
                    aria-controls={`strip-upload-${uid}`}
                    className={`${SOFT_BUTTON} bg-[#0A84FF]/90 text-white shadow-lg shadow-[#1C252E29]`}
                  >
                    <span className="flex items-center gap-2">
                      <ImagePlus className="h-4 w-4" />
                      上傳影像
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={`${SOFT_BUTTON} bg-white/85 text-[#1C1C1E] backdrop-blur border border-white/40 shadow-md`}
                  >
                    新增更多
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      revokeSafely(items.map((i) => i.url));
                      setItems([]);
                      discardMergePreview();
                    }}
                    className={`${SOFT_BUTTON} border border-transparent text-[#8E8E93]`}
                  >
                    重置畫板
                  </button>
                </div>
              </div>
            </motion.div>

            <div className={`${IOS_PANEL} mt-8 p-6`}>
              <div
                className="rounded-[26px] border border-dashed border-[#CED1DE] bg-white/65 px-6 py-8 text-center text-sm leading-relaxed text-[#636366]"
                tabIndex={0}
                aria-label="拖曳圖片上傳"
                role="presentation"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files?.length) {
                    ingestFiles(e.dataTransfer.files);
                  }
                }}
              >
                <DropInstruction />
              </div>

              <Reorder.Group axis="y" values={items} onReorder={setItems} className="mt-6 flex flex-col gap-3 md:gap-4">
                {items.map((item) => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    dragElastic={0.06}
                    className={`${IOS_PANEL} w-full shrink-0 cursor-grab active:cursor-grabbing outline-none md:grid md:grid-cols-[280px,minmax(0,1fr)] md:gap-6 md:items-stretch`}
                    aria-label={`拖曳圖 ${item.id}`}
                  >
                    <div className="flex items-center justify-between rounded-t-[32px] border-b border-white/45 bg-[#FFFFFF55] px-4 py-2 text-[#8E8E93] backdrop-blur md:hidden">
                      <GripVertical aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">上下拖曳調整區塊</span>
                      <GripVertical aria-hidden />
                    </div>
                    <div className="hidden md:flex md:h-full md:w-[260px] md:min-h-[220px] md:flex-col md:justify-between md:rounded-l-[inherit] md:border-r md:border-white/25 md:bg-[#FFFFFF40] md:px-5 md:py-5">
                      <GripVertical aria-hidden />
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#636366]">拖曳區塊</p>
                      <span className="text-sm font-semibold text-[#1C1C1E]">垂直排序</span>
                    </div>
                    <motion.div
                      layout
                      className="flex min-h-[140px] w-full shrink-0 items-center justify-center rounded-b-[32px] bg-[#EFEFF4]/95 px-3 py-4 md:rounded-none md:rounded-r-[32px] md:px-6 md:py-5 md:min-h-[200px]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- 需依原圖比例完整顯示，避免 fill+object-cover 裁切 */}
                      <img
                        src={item.url}
                        alt=""
                        draggable={false}
                        className="max-h-[min(52vh,480px)] w-full max-w-full object-contain select-none rounded-2xl"
                      />
                    </motion.div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {items.length === 0 ? (
                <motion.p layout className="mt-8 text-center text-sm text-[#8E8E93]">
                  尚未載入素材，將商品細節圖拖進虛線框或按下「上傳影像」。
                </motion.p>
              ) : null}
            </div>
          </DashboardCard>
        </BentoItem>

        <BentoItem span={2}>
          <DashboardCard className="flex flex-col gap-6 p-5 sm:p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
              <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">合併</p>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tighter text-[#1C1C1E] sm:text-[28px]">
                一鍵縱向合併
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#636366]">
                比照頂端列順序，將最寬的寬幅當對齊基準並保持比例，自動輸出具透明度的電商級長條圖。
              </p>
              <motion.button
                type="button"
                disabled={!canMerge || busy}
                onClick={() => void onMerge()}
                className={`${SOFT_BUTTON} mt-6 w-full justify-center rounded-[22px] bg-[#34C759] text-[#F6FFF7]`}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    合併中…
                  </>
                ) : (
                  <>
                    <Layers3 className="mr-2 h-5 w-5" aria-hidden /> 一鍵合併
                  </>
                )}
              </motion.button>
              <button
                type="button"
                disabled={busy || (!mergedBlob && !mergedUrl)}
                onClick={downloadMerged}
                className={`${SOFT_BUTTON} mt-4 w-full justify-center rounded-[22px] border border-white/50 bg-white/70 text-[#1C1C1E]`}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden /> 儲存合併結果
              </button>
            </motion.div>
          </DashboardCard>
        </BentoItem>

        <BentoItem span={2}>
          <DashboardCard className="flex flex-col gap-6 p-5 sm:p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
              <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">拆解</p>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tighter text-[#1C1C1E] sm:text-[28px]">
                一鍵拆解
              </h2>

              {!segmentHeights?.length ? (
                <label className="mt-6 block space-y-2 text-sm font-medium text-[#3A3A3C]" htmlFor="equal-parts-slider">
                  無合併資訊時，改以垂直均等切分段數拆解單張長圖
                  <div className="flex items-center gap-4">
                    <input
                      id="equal-parts-slider"
                      type="range"
                      min={2}
                      max={12}
                      value={equalParts}
                      aria-valuemin={2}
                      aria-valuemax={12}
                      aria-valuenow={equalParts}
                      onChange={(e) => setEqualParts(Number.parseInt(e.target.value, 10))}
                      className="w-full accent-[#0A84FF]"
                    />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={equalParts}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.25 }}
                        className="min-w-[2.75rem] text-right font-semibold text-[#34C759]"
                      >
                        {equalParts}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </label>
              ) : (
                <p className="mt-4 text-[15px] leading-relaxed text-[#636366]">
                  最近一次合併包含 {segmentHeights.length}{" "}
                  區塊，拆解時會自動恢復對應比例，並覆寫目前素材列表。
                </p>
              )}

              <motion.button
                type="button"
                disabled={!canSplit || busy}
                onClick={() => void onSplit()}
                className={`${SOFT_BUTTON} mt-6 w-full justify-center rounded-[22px] bg-[#AF52DE] text-white`}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    拆解中…
                  </>
                ) : (
                  <>
                    <Scissors className="mr-2 h-5 w-5" aria-hidden /> 一鍵拆解
                  </>
                )}
              </motion.button>
              {mergedUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={discardMergePreview}
                  className={`${SOFT_BUTTON} mt-3 w-full justify-center rounded-[22px] text-[#636366]`}
                >
                  清除合併預覽
                </button>
              ) : null}
            </motion.div>
          </DashboardCard>
        </BentoItem>

        <BentoItem span={4}>
          <DashboardCard className="p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">預覽</p>
                <motion.h3
                  className="text-[22px] font-semibold tracking-tighter text-[#1C1C1E] sm:text-[28px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: mergedUrl ? 1 : 0.7 }}
                  transition={{ duration: 0.35 }}
                >
                  縱向條結果
                </motion.h3>
              </div>
              <AnimatePresence mode="wait">
                {busy ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#8E8E93]"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing
                  </motion.span>
                ) : mergedUrl ? (
                  <motion.span
                    key="ready"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="text-sm font-semibold text-[#34C759]"
                  >
                    已建立合併預覽
                  </motion.span>
                ) : (
                  <motion.span key="idle" layout className="text-sm font-medium text-[#8E8E93]" exit={{ opacity: 0 }}>
                    未完成合併
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
              <AnimatePresence mode="wait">
                {mergedUrl ? (
                  <motion.div
                    key={mergedUrl}
                    className="contents"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.34, ease: "easeOut" }}
                  >
                    <section
                      className={`${IOS_PANEL} flex min-h-[200px] flex-col p-4 sm:p-6`}
                      aria-labelledby="merged-strip-overview-heading"
                    >
                      <div className="mb-4 flex shrink-0 flex-col gap-1 border-b border-white/40 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <h4
                          id="merged-strip-overview-heading"
                          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#636366]"
                        >
                          完整預覽 · 縮覽全圖
                        </h4>
                        <span className="text-[11px] font-medium text-[#8E8E93]">全貌 · 等比縮小 · 無捲動</span>
                      </div>
                      <div className="flex min-h-[min(220px,28svh)] flex-1 items-center justify-center overflow-visible rounded-[22px] bg-[#EFEFF4]/95 px-3 py-6 sm:px-5 sm:py-8">
                        {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
                        <img
                          src={mergedUrl}
                          alt="合併結果完整縮覽"
                          fetchPriority="high"
                          draggable={false}
                          className="mx-auto block h-auto max-h-[min(85svh,900px)] w-full max-w-full object-contain select-none rounded-[18px] shadow-sm"
                        />
                      </div>
                    </section>
                    <section
                      className={`${IOS_PANEL} flex min-h-[200px] flex-col p-4 sm:p-6`}
                      aria-labelledby="merged-strip-detail-heading"
                    >
                      <div className="mb-4 shrink-0 border-b border-white/40 pb-3">
                        <h4
                          id="merged-strip-detail-heading"
                          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#636366]"
                        >
                          細節檢視 · 上下滾動
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-[#8E8E93]">以版面寬度呈現輸出品質，過長區段請向下滑動。</p>
                      </div>
                      <div className="min-h-[min(62vh,640px)] max-h-[min(70vh,720px)] flex-1 overflow-y-auto overscroll-contain rounded-[22px] bg-[#FAFAFB]/98 shadow-inner [scrollbar-width:thin]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mergedUrl}
                          alt="合併結果細節（可捲動檢視）"
                          loading="lazy"
                          className="mx-auto block w-full min-w-0 rounded-[14px]"
                        />
                      </div>
                    </section>
                  </motion.div>
                ) : items[0]?.url ? (
                  <motion.div
                    key={items[0].id}
                    className="contents"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <section
                      className={`${IOS_PANEL} flex min-h-[200px] flex-col p-4 sm:p-6`}
                      aria-labelledby="single-strip-overview-heading"
                    >
                      <div className="mb-4 shrink-0 border-b border-white/40 pb-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <h4
                            id="single-strip-overview-heading"
                            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#636366]"
                          >
                            完整預覽 · 縮覽全圖
                          </h4>
                          <span className="text-[11px] font-medium text-[#8E8E93]">全貌 · 等比縮小 · 無捲動</span>
                        </div>
                        <p className="mt-2 text-xs text-[#8E8E93]">細節請使用右側捲動區。</p>
                      </div>
                      <div className="flex min-h-[min(220px,28svh)] flex-1 items-center justify-center overflow-visible rounded-[22px] bg-[#EFEFF4]/95 px-3 py-6 sm:px-5 sm:py-8">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={items[0].url}
                          alt="單圖完整縮覽"
                          loading="lazy"
                          draggable={false}
                          className="mx-auto block h-auto max-h-[min(85svh,900px)] w-full max-w-full object-contain select-none rounded-[18px] shadow-sm"
                        />
                      </div>
                    </section>
                    <section
                      className={`${IOS_PANEL} flex min-h-[200px] flex-col p-4 sm:p-6`}
                      aria-labelledby="single-strip-detail-heading"
                    >
                      <div className="mb-4 shrink-0 border-b border-white/40 pb-3">
                        <h4
                          id="single-strip-detail-heading"
                          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#636366]"
                        >
                          細節檢視 · 上下滾動
                        </h4>
                        <p className="mt-1 text-xs text-[#8E8E93]">仍可透過均等切分將此長圖回填至素材列。</p>
                      </div>
                      <div className="min-h-[min(62vh,640px)] max-h-[min(70vh,720px)] flex-1 overflow-y-auto overscroll-contain rounded-[22px] bg-[#FAFAFB]/98 shadow-inner [scrollbar-width:thin]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={items[0].url}
                          alt="單圖細節（可捲動）"
                          loading="lazy"
                          className="mx-auto block w-full min-w-0 rounded-[14px]"
                        />
                      </div>
                    </section>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    layout
                    className={`${IOS_PANEL} rounded-[32px] border border-dashed border-[#CED1DE]/80 px-10 py-20 text-center text-sm text-[#8E8E93] lg:col-span-2`}
                  >
                    合併成功後將顯示「左側全貌縮覽／右側可捲動細節」兩區；若只保留單張長圖也會以相同方式預覽。
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DashboardCard>
        </BentoItem>
      </BentoGrid>

      <AnimatePresence>
        {errorMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <div role="alert">
              <DashboardCard className="flex gap-4 border-[#FF6961]/70 p-6 text-[#D70015]">
                <AlertCircle className="h-6 w-6 shrink-0" aria-hidden />
                <span className="text-sm leading-relaxed font-semibold">{errorMessage}</span>
              </DashboardCard>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const DropInstruction = (): JSX.Element => (
  <>
    <p className="text-base font-semibold text-[#1C1C1E]">拖曳圖片進來或以按鈕選擇</p>
    <p className="mt-3 text-[15px] text-[#8E8E93] md:text-[16px]">支援 JPG / PNG / WebP／HEIC（依瀏覽器）</p>
  </>
);
