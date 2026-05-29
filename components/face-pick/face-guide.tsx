import type { JSX } from "react";

interface FaceGuideProps {
  guideRef: React.RefObject<HTMLDivElement | null>;
}

export function FaceGuide({ guideRef }: FaceGuideProps): JSX.Element {
  return (
    <div
      ref={guideRef}
      className="pointer-events-none flex h-[min(42vw,200px)] w-[min(52vw,240px)] items-center justify-center rounded-[48%] border-2 border-dashed border-white/55"
      aria-hidden
    >
      <span className="text-[11px] font-medium tracking-wide text-white/50">臉放這裡</span>
    </div>
  );
}
