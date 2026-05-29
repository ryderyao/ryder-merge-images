import type { JSX } from "react";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setVideoElement?: (node: HTMLVideoElement | null) => void;
}

export function CameraView({ videoRef, setVideoElement }: CameraViewProps): JSX.Element {
  const refCb =
    setVideoElement ??
    ((node: HTMLVideoElement | null) => {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    });

  return (
    <video
      ref={refCb}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ transform: "scaleX(-1)" }}
      playsInline
      muted
    />
  );
}
