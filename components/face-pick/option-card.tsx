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
  const borderGlow = selecting
    ? "border-[#FACC15] shadow-[0_0_20px_rgba(250,204,21,0.45)]"
    : "border-[#BFDBFE]/90";
  const bg = selecting ? "bg-[#FEF9C3]/95" : "bg-white/95";
  const scale = selecting ? 1.08 + holdProgress * 0.1 : 1;

  return (
    <div
      ref={boxRef}
      className={
        `relative flex min-h-[100px] w-[38%] max-w-[132px] flex-col items-center justify-center rounded-xl border-2 px-2.5 py-4 text-center shadow-md backdrop-blur-sm transition-all duration-200 ${bg} ${borderGlow}` +
        (exiting ? " opacity-0 scale-95" : "") +
        (entering ? " animate-fade-in" : "")
      }
      style={{ transform: exiting ? undefined : `scale(${scale})` }}
    >
      <p className="text-[clamp(0.78rem,3.2vw,0.92rem)] font-semibold leading-snug text-[#1C1C1E]">
        {label}
      </p>
      {selecting ? (
        <div className="absolute inset-x-2 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-[#FDE68A]">
          <div
            className="h-full rounded-full bg-[#EAB308] transition-[width] duration-75"
            style={{ width: `${holdProgress * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
