import type { JSX } from "react";

interface QuestionCardProps {
  text: string;
}

export function QuestionCard({ text }: QuestionCardProps): JSX.Element {
  return (
    <div
      className="pointer-events-none px-5"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 48px)" }}
    >
      <p
        className="mx-auto max-w-[320px] text-center text-[clamp(1.1rem,4.8vw,1.35rem)] font-extrabold leading-snug tracking-tight text-white"
        style={{
          textShadow:
            "0 0 24px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.45), 0 0 1px rgba(0,0,0,0.8)",
        }}
      >
        {text}
      </p>
    </div>
  );
}
