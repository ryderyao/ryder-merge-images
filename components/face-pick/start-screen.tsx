import type { JSX } from "react";
import { FACE_PICK_GAME_DATA } from "@/lib/face-pick/game-data";

interface StartScreenProps {
  onStart: () => void;
  loading: boolean;
}

export function StartScreen({ onStart, loading }: StartScreenProps): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#1a1033] via-[#2d1b4e] to-[#0f172a] px-6 text-center">
      <div className="mb-8 space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C4B5FD]">互動小遊戲</p>
        <h1 className="text-[clamp(2rem,8vw,2.75rem)] font-bold tracking-tight text-white">
          {FACE_PICK_GAME_DATA.title}
        </h1>
        <p className="mx-auto max-w-[280px] text-[15px] leading-relaxed text-[#CBD5E1]">
          用頭部左右移動選擇選項，停在某邊約 0.2 秒即確認。
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="rounded-full bg-white px-10 py-4 text-[17px] font-bold text-[#1C1C1E] shadow-lg transition active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "準備中…" : "開始遊戲"}
      </button>
    </div>
  );
}
