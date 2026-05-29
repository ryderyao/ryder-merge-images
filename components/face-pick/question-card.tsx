import type { JSX } from "react";

interface QuestionCardProps {
  text: string;
}

export function QuestionCard({ text }: QuestionCardProps): JSX.Element {
  return (
    <div
      className="pointer-events-none px-4"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 44px)" }}
    >
      <div className="mx-auto w-full max-w-[360px] rounded-2xl border-2 border-white bg-white px-4 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.28)]">
        <p className="text-center text-[clamp(1.05rem,4.6vw,1.3rem)] font-extrabold leading-snug tracking-tight text-[#111827]">
          {text}
        </p>
      </div>
    </div>
  );
}
