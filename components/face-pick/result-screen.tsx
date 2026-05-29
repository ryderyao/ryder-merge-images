"use client";

import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";

interface ResultScreenProps {
  result: string;
  onPlayAgain: () => void;
}

function gamePageUrl(): string {
  if (typeof window === "undefined") return "";
  const u = new URL(window.location.href);
  u.searchParams.delete("debug");
  return u.toString();
}

export function ResultScreen({ result, onPlayAgain }: ResultScreenProps): JSX.Element {
  const [revealed, setRevealed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 850);
    return () => clearTimeout(t);
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = gamePageUrl();
    if (!url || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setLinkCopied(false);
    }
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#1a1033] via-[#2d1b4e] to-[#0f172a] px-6 text-center">
      {!revealed ? (
        <div className="relative flex flex-col items-center gap-4">
          <span className="animate-result-ring absolute h-28 w-28 rounded-full border-2 border-[#FACC15]/40" />
          <div className="animate-result-spin flex h-20 w-20 items-center justify-center rounded-full bg-[#FACC15]/20 text-3xl">
            💰
          </div>
          <p className="animate-pulse text-[14px] font-medium text-[#C4B5FD]">結算中…</p>
        </div>
      ) : (
        <div className="animate-result-pop w-full max-w-[340px]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#C4B5FD]">
            最終結果
          </p>
          <div className="mx-auto mt-6 max-w-[300px] text-left">
            <p className="text-[clamp(1.2rem,5vw,1.5rem)] font-bold leading-snug text-white">
              你為了一百萬
            </p>
            <p className="mt-3 pl-5 text-[clamp(1.05rem,4.5vw,1.35rem)] font-bold leading-snug text-[#FEF9C3]">
              「{result}」
            </p>
          </div>
          <div className="mt-10 flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={onPlayAgain}
              className="rounded-full bg-white px-8 py-3.5 text-[16px] font-bold text-[#1C1C1E] shadow-lg active:scale-[0.98]"
            >
              再玩一次
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-[15px] font-semibold text-white active:scale-[0.98]"
            >
              {linkCopied ? "已複製連結" : "複製遊戲連結"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
