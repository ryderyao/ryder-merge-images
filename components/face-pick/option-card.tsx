import type { JSX } from "react";

interface OptionCardProps {
  label: string;
  side: "left" | "right";
  active: boolean;
  holdProgress: number;
  exiting: boolean;
  entering: boolean;
  boxRef: React.RefObject<HTMLDivElement | null>;
}

export function OptionCard({
  label,
  side,
  active,
  holdProgress,
  exiting,
  entering,
  boxRef,
}: OptionCardProps): JSX.Element {
  const borderGlow =
    active && holdProgress > 0
      ? "border-[#818CF8] shadow-[0_0_20px_rgba(129,140,248,0.45)]"
      : "border-[#BFDBFE]/90";

  return (
    <div
      ref={boxRef}
      className={
        "relative flex min-h-[100px] w-[44%] max-w-[168px] flex-col items-center justify-center rounded-2xl border-2 bg-white/95 px-3 py-4 text-center shadow-lg backdrop-blur-sm transition-all duration-200 " +
        borderGlow +
        (active ? " scale-[1.04]" : " scale-100") +
        (exiting ? " opacity-0 scale-95" : "") +
        (entering ? " animate-fade-in" : "")
      }
    >
      <p className="text-[clamp(0.95rem,3.8vw,1.15rem)] font-semibold leading-snug text-[#1C1C1E]">
        {label}
      </p>
      {active && holdProgress > 0 ? (
        <div className="absolute inset-x-3 bottom-2 h-1 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full bg-[#6366F1] transition-[width] duration-75"
            style={{ width: `${holdProgress * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
