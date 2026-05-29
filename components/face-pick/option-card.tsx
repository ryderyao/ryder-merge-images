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
    ? "border-[#FACC15] shadow-[0_0_16px_rgba(250,204,21,0.35)]"
    : "border-[#BFDBFE]/90";
  const bg = selecting ? "bg-[#FEF9C3]/95" : "bg-white/95";

  return (
    <div
      ref={boxRef}
      className={
        `relative flex min-h-[72px] w-[38%] max-w-[128px] flex-col items-center justify-center rounded-xl border-2 px-2 py-2.5 text-center shadow-md backdrop-blur-sm transition-all duration-200 ${bg} ${borderGlow}` +
        (selecting ? " scale-[1.04]" : " scale-100") +
        (exiting ? " opacity-0 scale-95" : "") +
        (entering ? " animate-fade-in" : "")
      }
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
