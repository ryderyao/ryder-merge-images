"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setVideoElement: (node: HTMLVideoElement | null) => void;
  stream: MediaStream | null;
  error: string | null;
  starting: boolean;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
}

async function safePlay(video: HTMLVideoElement): Promise<void> {
  try {
    await video.play();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    throw e;
  }
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const attachStream = useCallback(async (video: HTMLVideoElement) => {
    const media = streamRef.current;
    if (!media) return;
    if (video.srcObject !== media) {
      video.srcObject = media;
    }
    video.muted = true;
    video.playsInline = true;
    if (video.paused) {
      await safePlay(video);
    }
  }, []);

  const setVideoElement = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node) void attachStream(node);
    },
    [attachStream],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    const v = videoRef.current;
    if (v) v.srcObject = null;
  }, []);

  const startCamera = useCallback(async (): Promise<boolean> => {
    setStarting(true);
    setError(null);
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("目前裝置不支援開啟鏡頭，請改用手機瀏覽器。");
      setStarting(false);
      return false;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = media;
      setStream(media);

      const v = videoRef.current;
      if (v) await attachStream(v);

      setStarting(false);
      return true;
    } catch {
      setError("你需要允許鏡頭權限，才能開始遊戲。");
      setStarting(false);
      return false;
    }
  }, [attachStream, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return { videoRef, setVideoElement, stream, error, starting, startCamera, stopCamera };
}
