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
    const t = setTimeout(() => setRevealed(true), 750);
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
    <div className="flex h-full flex-col items-center justify-center bg-black px-8 text-center">
      {!revealed ? (
        <div className="relative flex flex-col items-center">
          <span className="animate-result-ring absolute h-24 w-24 rounded-full border border-white/20" />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl">
            ✦
          </div>
        </div>
      ) : (
        <div className="animate-result-pop w-full max-w-[320px]">
          <div className="text-left">
            <p className="text-[clamp(1.25rem,5.2vw,1.55rem)] font-black leading-tight text-white">
              你為了一百萬
            </p>
            <p className="mt-4 pl-1 text-[clamp(1.05rem,4.5vw,1.3rem)] font-bold leading-snug text-amber-300">
              「{result}」
            </p>
          </div>
          <div className="mt-12 flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={onPlayAgain}
              className="rounded-full bg-white py-3.5 text-[16px] font-bold text-black active:scale-[0.98]"
            >
              再玩一次
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="rounded-full py-3.5 text-[15px] font-semibold text-white/70 active:scale-[0.98]"
            >
              {linkCopied ? "已複製連結" : "複製遊戲連結"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
