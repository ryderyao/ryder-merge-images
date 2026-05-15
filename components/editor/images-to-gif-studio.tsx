"use client";

import { AnimatePresence, motion, Reorder } from "framer-motion";
import { AlertCircle, Clapperboard, Download, GripVertical, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { JSX } from "react";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { encodeObjectUrlsToAnimatedGif, GIF_MAX_EDGE_PX } from "@/lib/frames-to-gif";
import { sendGa4Event } from "@/lib/gtag";

interface FrameItem {
  id: string;
  url: string;
}

const IOS_PANEL =
  "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-[32px]";
const SOFT_BUTTON =
  "inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition active:opacity-95 disabled:opacity-40 disabled:pointer-events-none";

interface ImagesToGifStudioProps {
  hidePageHeading?: boolean;
}

const DELAY_MIN = 0.1;
const DELAY_MAX = 1;
const DELAY_STEP = 0.05;

export default function ImagesToGifStudio({ hidePageHeading = false }: ImagesToGifStudioProps): JSX.Element {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<FrameItem[]>([]);
  const [delaySec, setDelaySec] = useState(0.2);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoTip, setInfoTip] = useState<string | null>(null);

  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifObjectUrl, setGifObjectUrl] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const revokeMany = useCallback((urls: string[]): void => {
    urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const ingestFiles = (list: FileList | File[]): void => {
    const next: FrameItem[] = [];
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      next.push({ id: crypto.randomUUID(), url: URL.createObjectURL(file) });
    });
    if (next.length === 0) return;
    setItems((prev) => [...prev, ...next]);
    setErrorMessage(null);
    setInfoTip(null);
    discardGifOutput();
  };

  const discardGifOutput = (): void => {
    setGifBlob(null);
    setGifObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewIndex(0);
  };

  const removeItem = (id: string): void => {
    setItems((prev) => {
      const t = prev.find((p) => p.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return prev.filter((p) => p.id !== id);
    });
    setErrorMessage(null);
    discardGifOutput();
  };

  const clearAll = (): void => {
    revokeMany(items.map((i) => i.url));
    setItems([]);
    setErrorMessage(null);
    setInfoTip(null);
    discardGifOutput();
  };

  const buildGif = async (): Promise<void> => {
    setErrorMessage(null);
    setInfoTip(null);
    if (items.length === 0) {
      setErrorMessage("請先加入至少一張圖片。");
      return;
    }
    setBusy(true);
    discardGifOutput();
    try {
      const urls = items.map((i) => i.url);
      const result = await encodeObjectUrlsToAnimatedGif(urls, delaySec);
      setGifBlob(result.blob);
      const u = URL.createObjectURL(result.blob);
      setGifObjectUrl(u);
      setPreviewIndex(0);
      const tips: string[] = [];
      if (result.scaledDown) {
        tips.push(`輸出已依最長邊不超過 ${GIF_MAX_EDGE_PX}px 縮放，以加快編碼。`);
      }
      tips.push("GIF 僅支援 256 色，照片可能會有色帶；屬格式限制。");
      setInfoTip(tips.join(" "));
      sendGa4Event("images_to_gif", {
        frame_count: result.frameCount,
        delay_ms: result.delayMs,
        width_px: result.width,
      });
    } catch {
      setErrorMessage("GIF 產生失敗：請確認圖檔可讀，或稍後再試。");
    } finally {
      setBusy(false);
    }
  };

  const downloadGif = (): void => {
    if (!gifBlob) return;
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(gifBlob);
    anchor.download = `animation-${Date.now()}.gif`;
    anchor.rel = "noopener";
    anchor.click();
    queueMicrotask(() => URL.revokeObjectURL(anchor.href));
  };

  useEffect(() => {
    setPreviewIndex((i) => (items.length === 0 ? 0 : Math.min(i, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    if (gifObjectUrl) return;
    if (items.length < 2) {
      setPreviewIndex(0);
      return;
    }
    const ms = Math.round(Math.min(DELAY_MAX, Math.max(DELAY_MIN, delaySec)) * 1000);
    const id = window.setInterval(() => {
      setPreviewIndex((i) => (i + 1) % items.length);
    }, ms);
    return () => window.clearInterval(id);
  }, [items.length, delaySec, gifObjectUrl]);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const gifOutRef = useRef<string | null>(null);
  gifOutRef.current = gifObjectUrl;

  useEffect(
    () => () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
      if (gifOutRef.current) URL.revokeObjectURL(gifOutRef.current);
    },
    [],
  );

  const delayPercent =
    ((Math.min(DELAY_MAX, Math.max(DELAY_MIN, delaySec)) - DELAY_MIN) / (DELAY_MAX - DELAY_MIN)) * 100;

  return (
    <div
      className={`mx-auto flex min-h-[100dvh] max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8 ${
        hidePageHeading ? "pb-12 pt-4 sm:pt-6" : "py-12"
      }`}
    >
      {!hidePageHeading ? (
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#636366]">動畫</p>
          <h1 className="text-[clamp(2.4rem,4vw,3.75rem)] font-semibold leading-none tracking-tighter text-[#1C1C1E]">
            多圖轉 GIF
          </h1>
          <p className="max-w-2xl text-base text-[#8E8E93] md:text-[17px]">
            上傳多張圖、拖曳排序、設定每幀顯示秒數，在瀏覽器內產出可下載的循環 GIF。
          </p>
        </header>
      ) : null}

      <input
        ref={inputRef}
        id={`gif-upload-${uid}`}
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
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">影格列</p>
                <div className="flex items-center gap-2 text-xl font-semibold tracking-tighter text-[#1C1C1E] sm:text-[28px]">
                  <Clapperboard className="h-6 w-6 text-[#8E8E93]" aria-hidden />
                  拖曳排序
                </div>
                <p className="text-sm font-medium text-[#8E8E93]">{items.length} 張</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className={`${SOFT_BUTTON} bg-[#0A84FF]/90 text-white shadow-lg shadow-[#1C252E29]`}
                >
                  <span className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    上傳圖片
                  </span>
                </button>
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={clearAll}
                  className={`${SOFT_BUTTON} border border-transparent text-[#8E8E93]`}
                >
                  重置
                </button>
              </div>
            </div>

            <div className={`${IOS_PANEL} mt-8 p-6`}>
              <div
                className="rounded-[26px] border border-dashed border-[#CED1DE] bg-white/65 px-6 py-8 text-center text-sm leading-relaxed text-[#636366]"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files?.length) ingestFiles(e.dataTransfer.files);
                }}
              >
                <p className="text-base font-semibold text-[#1C1C1E]">拖曳圖片至此或使用「上傳圖片」</p>
                <p className="mt-3 text-[15px] text-[#8E8E93]">一張即為靜態 GIF；多張則依序輪播。</p>
              </div>

              <Reorder.Group
                axis="y"
                values={items}
                onReorder={(next) => {
                  setItems(next);
                  discardGifOutput();
                }}
                className="mt-6 flex flex-col gap-3 md:gap-4"
              >
                {items.map((item, idx) => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    dragElastic={0.06}
                    className={`${IOS_PANEL} w-full shrink-0 cursor-grab active:cursor-grabbing outline-none md:grid md:grid-cols-[72px,280px,minmax(0,1fr),auto] md:items-center md:gap-4`}
                  >
                    <div className="hidden text-center text-sm font-bold tabular-nums text-[#8E8E93] md:block">
                      {idx + 1}
                    </div>
                    <div className="flex items-center justify-between rounded-t-[32px] border-b border-white/45 bg-[#FFFFFF55] px-4 py-2 text-[#8E8E93] backdrop-blur md:hidden">
                      <GripVertical aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">第 {idx + 1} 幀</span>
                      <GripVertical aria-hidden />
                    </div>
                    <div className="hidden md:flex md:h-full md:min-h-[120px] md:flex-col md:justify-center md:rounded-l-[inherit] md:border-r md:border-white/25 md:bg-[#FFFFFF40] md:px-3">
                      <GripVertical aria-hidden />
                    </div>
                    <motion.div layout className="flex min-h-[120px] items-center justify-center bg-[#EFEFF4]/95 px-3 py-4 md:rounded-none">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 需顯示原圖預覽 */}
                      <img
                        src={item.url}
                        alt=""
                        draggable={false}
                        className="max-h-[min(40vh,320px)] w-full max-w-full object-contain select-none rounded-2xl"
                      />
                    </motion.div>
                    <div className="flex justify-end border-t border-white/30 p-3 md:border-0 md:p-0">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#1C1C1E]/10 bg-white/80 px-3 py-2 text-xs font-semibold text-[#D70015] hover:bg-white"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        移除
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {items.length === 0 ? (
                <p className="mt-8 text-center text-sm text-[#8E8E93]">尚未加入圖片。</p>
              ) : null}
            </div>
          </DashboardCard>
        </BentoItem>

        <BentoItem span={2}>
          <DashboardCard className="flex flex-col gap-6 p-5 sm:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">輪播</p>
            <h2 className="text-[22px] font-semibold tracking-tighter text-[#1C1C1E] sm:text-[28px]">每幀顯示時間</h2>
            <p className="text-[15px] leading-relaxed text-[#636366]">可設為 {DELAY_MIN}～{DELAY_MAX} 秒；下方預覽會依此速度輪播素材列。</p>
            <label className="block space-y-3 text-sm font-medium text-[#3A3A3C]" htmlFor={`delay-${uid}`}>
              <div className="flex items-center justify-between gap-4">
                <span>間隔（秒）</span>
                <span className="tabular-nums text-[#34C759]">{delaySec.toFixed(2)} s</span>
              </div>
              <input
                id={`delay-${uid}`}
                type="range"
                min={DELAY_MIN}
                max={DELAY_MAX}
                step={DELAY_STEP}
                value={delaySec}
                onChange={(e) => {
                  setDelaySec(Number.parseFloat(e.target.value));
                  discardGifOutput();
                }}
                className="w-full accent-[#0A84FF]"
              />
              <div className="flex justify-between text-xs text-[#8E8E93]">
                <span>快 {DELAY_MIN}s</span>
                <span>慢 {DELAY_MAX}s</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-[#E5E5EA]"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-[#0A84FF] transition-[width] duration-150 ease-out"
                  style={{ width: `${delayPercent}%` }}
                />
              </div>
            </label>

            <motion.button
              type="button"
              disabled={busy || items.length === 0}
              onClick={() => void buildGif()}
              className={`${SOFT_BUTTON} mt-2 w-full justify-center rounded-[22px] bg-[#34C759] text-[#F6FFF7]`}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  編碼中…
                </>
              ) : (
                <>
                  <Clapperboard className="mr-2 h-5 w-5" aria-hidden /> 產生 GIF
                </>
              )}
            </motion.button>
            <button
              type="button"
              disabled={!gifBlob || busy}
              onClick={downloadGif}
              className={`${SOFT_BUTTON} w-full justify-center rounded-[22px] border border-white/50 bg-white/70 text-[#1C1C1E]`}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden /> 下載 GIF
            </button>
            {infoTip ? <p className="text-xs leading-relaxed text-[#8E8E93]">{infoTip}</p> : null}
          </DashboardCard>
        </BentoItem>

        <BentoItem span={2}>
          <DashboardCard className="flex flex-col gap-4 p-5 sm:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">預覽</p>
            <h2 className="text-[22px] font-semibold tracking-tighter text-[#1C1C1E] sm:text-[28px]">循環預覽</h2>
            <div className={`${IOS_PANEL} flex min-h-[220px] items-center justify-center p-4`}>
              {gifObjectUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={gifObjectUrl}
                  alt="GIF 預覽"
                  className="max-h-[min(50vh,360px)] w-full object-contain"
                />
              ) : items[previewIndex]?.url ? (
                <motion.div
                  key={items[previewIndex]?.id ?? "frame"}
                  initial={{ opacity: 0.35 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.12 }}
                  className="flex max-h-[min(50vh,360px)] w-full items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={items[previewIndex].url}
                    alt={`預覽第 ${previewIndex + 1} 幀`}
                    className="max-h-[min(50vh,360px)] w-full object-contain"
                  />
                </motion.div>
              ) : (
                <p className="text-center text-sm text-[#8E8E93]">加入圖片後會依間隔輪播素材；按下「產生 GIF」後改顯示輸出預覽。</p>
              )}
            </div>
            {gifObjectUrl ? (
              <p className="text-center text-xs text-[#8E8E93]">為避免與素材輪播混淆，輸出後優先顯示 GIF；調整順序或間隔後請再產生一次。</p>
            ) : null}
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
