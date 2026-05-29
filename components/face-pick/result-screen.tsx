"use client";

import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import { FACE_PICK_GAME_DATA } from "@/lib/face-pick/game-data";

interface ResultScreenProps {
  result: string;
  onPlayAgain: () => void;
}

export function ResultScreen({ result, onPlayAgain }: ResultScreenProps): JSX.Element {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 850);
    return () => clearTimeout(t);
  }, []);

  const summary = `你為了一百萬接受了『${result}』`;

  const handleCopy = useCallback(async () => {
    const text = `${FACE_PICK_GAME_DATA.title}：${summary}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [summary]);

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
          <p className="mt-5 text-[clamp(1.15rem,4.8vw,1.45rem)] font-bold leading-relaxed text-white">
            {summary}
          </p>
          <p className="mt-3 text-[14px] text-[#94A3B8]">這是你一路選下來的答案</p>
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
              onClick={() => void handleCopy()}
              className="rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-[15px] font-semibold text-white active:scale-[0.98]"
            >
              {copied ? "已複製" : "複製結果"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
