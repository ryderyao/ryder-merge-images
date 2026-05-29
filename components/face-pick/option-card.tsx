import type { JSX } from "react";

interface OptionCardProps {
  label: string;
  active: boolean;
  holdProgress: number;
  exiting: boolean;
  entering: boolean;
  boxRef: React.RefObject<HTMLDivElement | null>;
}

export function OptionCard({
  label,
  active,
  holdProgress,
  exiting,
  entering,
  boxRef,
}: OptionCardProps): JSX.Element {
  const selecting = active && holdProgress > 0;
  const scale = selecting ? 1.06 + holdProgress * 0.08 : 1;

  return (
    <div
      ref={boxRef}
      className={
        "relative flex min-h-[108px] w-[46%] max-w-[158px] flex-col items-center justify-center rounded-[18px] px-3 py-4 text-center transition-all duration-200 " +
        (selecting
          ? "bg-[#FFFBEB]/96 shadow-[0_0_28px_rgba(251,191,36,0.4)] ring-2 ring-amber-400/90"
          : "bg-white/94 shadow-[0_8px_28px_rgba(0,0,0,0.18)] ring-1 ring-white/80 backdrop-blur-md") +
        (exiting ? " opacity-0" : " opacity-100") +
        (entering ? " animate-fade-in" : "")
      }
      style={{ transform: exiting ? "scale(0.94)" : `scale(${scale})` }}
    >
      <p className="text-[clamp(0.82rem,3.4vw,0.98rem)] font-bold leading-snug text-[#111827]">
        {label}
      </p>
      {selecting ? (
        <div className="absolute inset-x-3 bottom-2.5 h-[3px] overflow-hidden rounded-full bg-amber-200/50">
          <div
            className="h-full rounded-full bg-amber-500 transition-[width] duration-75"
            style={{ width: `${holdProgress * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
