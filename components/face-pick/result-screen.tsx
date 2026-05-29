import { useCallback, useState } from "react";
import type { JSX } from "react";
import { FACE_PICK_GAME_DATA } from "@/lib/face-pick/game-data";

interface ResultScreenProps {
  result: string;
  onPlayAgain: () => void;
}

export function ResultScreen({ result, onPlayAgain }: ResultScreenProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = `${FACE_PICK_GAME_DATA.title}：我最後選擇「${result}」`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [result]);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#1a1033] via-[#2d1b4e] to-[#0f172a] px-6 text-center">
      <p className="text-[15px] font-medium text-[#C4B5FD]">你最後選擇的是</p>
      <p className="mt-4 max-w-[320px] text-[clamp(1.35rem,5.5vw,1.75rem)] font-bold leading-snug text-white">
        {result}
      </p>
      <div className="mt-10 flex w-full max-w-[280px] flex-col gap-3">
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
  );
}
