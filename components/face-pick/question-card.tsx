import type { JSX } from "react";

interface QuestionCardProps {
  text: string;
}

export function QuestionCard({ text }: QuestionCardProps): JSX.Element {
  return (
    <div
      className="mx-auto w-[calc(100%-2rem)] max-w-[340px] rounded-2xl border-2 border-[#C4B5FD]/80 bg-white/95 px-4 py-3 text-center shadow-lg backdrop-blur-sm"
      style={{ marginTop: "max(env(safe-area-inset-top, 0px), 56px)" }}
    >
      <p className="text-[clamp(1.05rem,4.5vw,1.35rem)] font-bold leading-snug text-[#1C1C1E]">
        {text}
      </p>
    </div>
  );
}
