import type { JSX } from "react";
import { FACE_PICK_GAME_DATA } from "@/lib/face-pick/game-data";

interface StartScreenProps {
  onStart: () => void;
  loading: boolean;
}

export function StartScreen({ onStart, loading }: StartScreenProps): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-black px-8 text-center">
      <h1
        className="text-[clamp(2.25rem,9vw,3rem)] font-black leading-none tracking-tight text-white"
        style={{ textShadow: "0 0 40px rgba(255,255,255,0.15)" }}
      >
        {FACE_PICK_GAME_DATA.title}
      </h1>
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="mt-14 min-w-[200px] rounded-full bg-white px-10 py-4 text-[17px] font-bold text-black transition active:scale-[0.97] disabled:opacity-50"
      >
        {loading ? "…" : "開始"}
      </button>
    </div>
  );
}
