"use client";

import JSZip from "jszip";
import { AlertCircle, Check, Download, ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { JSX } from "react";
import { DashboardCard } from "@/components/ui/dashboard-card";
import {
  EXPECTED_OUTPUT_COUNT,
  LINE_THEME_ZIP_NAME,
  LINE_THEME_SLOTS,
  type LineThemeSlotId,
} from "@/lib/line-theme/output-map";
import { processLineThemePack } from "@/lib/line-theme/process";
import { checkAspectRatio, readImageSize } from "@/lib/line-theme/validate";
import { sendGa4Event } from "@/lib/gtag";

const IOS_PANEL =
  "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-[28px]";
const SOFT_BUTTON =
  "inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition active:opacity-95 disabled:opacity-40 disabled:pointer-events-none";

interface SlotState {
  file: File;
  previewUrl: string;
  ratioWarning: string | null;
}

interface LineThemeStudioProps {
  hidePageHeading?: boolean;
}

export default function LineThemeStudio({ hidePageHeading: _hide }: LineThemeStudioProps): JSX.Element {
  const uid = useId();
  const [slots, setSlots] = useState<Partial<Record<LineThemeSlotId, SlotState>>>({});
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<LineThemeSlotId | null>(null);
  const inputRefs = useRef<Partial<Record<LineThemeSlotId, HTMLInputElement | null>>>({});
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    return () => {
      Object.values(slotsRef.current).forEach((s) => {
        if (s) URL.revokeObjectURL(s.previewUrl);
      });
    };
  }, []);

  const uploadedCount = LINE_THEME_SLOTS.filter((s) => slots[s.id]).length;
  const allReady = uploadedCount === LINE_THEME_SLOTS.length;

  const setSlotFile = useCallback(async (slotId: LineThemeSlotId, file: File): Promise<void> => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("請上傳圖片檔");
      return;
    }

    const slotDef = LINE_THEME_SLOTS.find((s) => s.id === slotId)!;
    let ratioWarning: string | null = null;
    try {
      const { width, height } = await readImageSize(file);
      ratioWarning = checkAspectRatio(width, height, slotDef);
    } catch {
      setErrorMessage("無法讀取這張圖片，請換一張試試");
      return;
    }

    setSlots((prev) => {
      const old = prev[slotId];
      if (old) URL.revokeObjectURL(old.previewUrl);
      return {
        ...prev,
        [slotId]: {
          file,
          previewUrl: URL.createObjectURL(file),
          ratioWarning,
        },
      };
    });
    setErrorMessage(null);
  }, []);

  const clearSlot = useCallback((slotId: LineThemeSlotId): void => {
    setSlots((prev) => {
      const old = prev[slotId];
      if (old) URL.revokeObjectURL(old.previewUrl);
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setErrorMessage(null);
  }, []);

  const handleDownload = async (): Promise<void> => {
    if (!allReady) {
      setErrorMessage("請先上傳全部 6 張圖片，才能產生完整 LINE 主題素材包。");
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const files = {
        cover: slots.cover!.file,
        menuOff: slots["menu-off"]!.file,
        menuOn: slots["menu-on"]!.file,
        profile: slots.profile!.file,
        passcodeOff: slots["passcode-off"]!.file,
        passcodeOn: slots["passcode-on"]!.file,
      };

      const outputs = await processLineThemePack(files);
      if (outputs.length !== EXPECTED_OUTPUT_COUNT) {
        throw new Error(`素材數量不符（預期 ${EXPECTED_OUTPUT_COUNT} 張，實際 ${outputs.length} 張）`);
      }
      const zip = new JSZip();
      for (const o of outputs) {
        zip.file(o.name, o.blob);
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(zipBlob);
      anchor.download = LINE_THEME_ZIP_NAME;
      anchor.rel = "noopener";
      anchor.click();
      queueMicrotask(() => URL.revokeObjectURL(anchor.href));

      sendGa4Event("line_theme_pack_zip", { file_count: outputs.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "打包失敗";
      setErrorMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-6 lg:px-8">
      <DashboardCard className={`${IOS_PANEL} p-6 sm:p-8`}>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E8E93]">上傳</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#1C1C1E] sm:text-2xl">
              依序上傳 6 張母圖
            </h2>
            <p className="mt-1 text-sm text-[#636366]">
              已上傳 {uploadedCount}／{LINE_THEME_SLOTS.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINE_THEME_SLOTS.map((slot, index) => {
            const state = slots[slot.id];
            const inputId = `${uid}-${slot.id}`;
            return (
              <div
                key={slot.id}
                className="flex flex-col overflow-hidden rounded-[20px] border border-[#E5E5EA] bg-white/90"
              >
                <div className="border-b border-[#EFEFEF] px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#8E8E93]">第 {index + 1} 張</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-[#1C1C1E]">{slot.label}</p>
                  <p className="mt-0.5 text-[12px] text-[#8E8E93]">{slot.ratioLabel}</p>
                </div>

                <div
                  className={`relative flex aspect-[4/3] items-center justify-center bg-[#F2F2F7] transition ${
                    dragOverSlot === slot.id ? "ring-2 ring-[#0A84FF] ring-inset" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverSlot(slot.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverSlot((prev) => (prev === slot.id ? null : prev));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverSlot(null);
                    const f = e.dataTransfer.files?.[0];
                    if (f) void setSlotFile(slot.id, f);
                  }}
                >
                  {state ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob preview */}
                      <img src={state.previewUrl} alt="" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => clearSlot(slot.id)}
                        className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white transition hover:bg-black/70"
                        aria-label={`移除 ${slot.label}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-[#34C759] px-2.5 py-1 text-[11px] font-semibold text-white">
                        <Check className="h-3 w-3" aria-hidden />
                        已上傳
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRefs.current[slot.id]?.click()}
                      className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#8E8E93] transition hover:bg-[#EAEAEF] hover:text-[#636366]"
                    >
                      <ImagePlus className="h-8 w-8 opacity-60" aria-hidden />
                      <span className="text-sm font-semibold">點選或拖曳上傳</span>
                    </button>
                  )}
                  <input
                    ref={(el) => {
                      inputRefs.current[slot.id] = el;
                    }}
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void setSlotFile(slot.id, f);
                      e.target.value = "";
                    }}
                  />
                </div>

                {state?.ratioWarning ? (
                  <p className="border-t border-[#EFEFEF] px-3 py-2 text-[12px] leading-snug text-[#FF9500]">
                    {state.ratioWarning}
                  </p>
                ) : null}

                {state ? (
                  <div className="border-t border-[#EFEFEF] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => inputRefs.current[slot.id]?.click()}
                      className="text-[12px] font-semibold text-[#0A84FF] hover:underline"
                    >
                      重新上傳
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {errorMessage ? (
          <div className="mt-6 flex items-start gap-2 rounded-2xl border border-[#FF3B30]/20 bg-[#FF3B30]/5 px-4 py-3 text-sm text-[#FF3B30]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-[#EFEFEF] pt-8">
          <button
            type="button"
            disabled={!allReady || busy}
            onClick={() => void handleDownload()}
            className={`${SOFT_BUTTON} min-w-[220px] bg-[#1C1C1E] text-white hover:bg-[#2C2C2E]`}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                打包中…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                下載 LINE 主題素材包
              </>
            )}
          </button>
          {!allReady ? (
            <p className="text-center text-[13px] text-[#8E8E93]">6 張都上傳後才能下載</p>
          ) : (
            <p className="text-center text-[13px] text-[#8E8E93]">圖片只在你的瀏覽器處理，不會上傳到伺服器</p>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
