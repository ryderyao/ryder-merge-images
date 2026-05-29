import type { JSX } from "react";

interface FaceGuideProps {
  guideRef: React.RefObject<HTMLDivElement | null>;
}

/** 直向長橢圓虛線，近似人臉輪廓 */
export function FaceGuide({ guideRef }: FaceGuideProps): JSX.Element {
  return (
    <div
      ref={guideRef}
      className="pointer-events-none relative flex h-[min(58vw,300px)] w-[min(40vw,180px)] items-center justify-center"
      aria-hidden
    >
      <svg
        viewBox="0 0 100 140"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          cx="50"
          cy="72"
          rx="36"
          ry="54"
          stroke="rgba(255,255,255,0.58)"
          strokeWidth="2"
          strokeDasharray="7 5"
        />
      </svg>
      <span className="absolute text-[11px] font-medium tracking-wide text-white/50">臉放這裡</span>
    </div>
  );
}
