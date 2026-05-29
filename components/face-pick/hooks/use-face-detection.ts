"use client";

import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  setInteractionSnapshot,
  resetInteractionSnapshot,
} from "./interaction-store";
import {
  DETECT_EVERY_N_FRAMES,
  FACE_DETECTOR_MODEL,
  FACE_DETECTOR_WASM,
  FACE_LOST_HINT_MS,
  SELECTION_COOLDOWN_MS,
  SELECTION_HOLD_MS,
  SMOOTHING_ALPHA,
} from "@/lib/face-pick/constants";
import { detectHoverSide } from "@/lib/face-pick/collision";
import type { GameAction } from "@/lib/face-pick/game-state";
import { smoothPoint, type Point2D } from "@/lib/face-pick/smoothing";
import { faceBoxCenterToScreen } from "@/lib/face-pick/video-map";

export interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  leftBoxRef: React.RefObject<HTMLElement | null>;
  rightBoxRef: React.RefObject<HTMLElement | null>;
  faceGuideRef: React.RefObject<HTMLElement | null>;
  dispatch: React.Dispatch<GameAction>;
  showDebugDot: boolean;
}

export interface UseFaceDetectionResult {
  loading: boolean;
  loadError: string | null;
}

export function useFaceDetection({
  videoRef,
  active,
  leftBoxRef,
  rightBoxRef,
  faceGuideRef,
  dispatch,
  showDebugDot,
}: UseFaceDetectionOptions): UseFaceDetectionResult {
  const detectorRef = useRef<FaceDetector | null>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const detectTsRef = useRef(0);
  const smoothedRef = useRef<Point2D | null>(null);
  const holdSideRef = useRef<"left" | "right" | null>(null);
  const holdStartRef = useRef<number>(0);
  const lastFaceAtRef = useRef<number>(0);
  const cooldownUntilRef = useRef<number>(0);
  const activeRef = useRef(active);
  const lastUiRef = useRef({ side: null as "left" | "right" | null, progress: -1, hint: false });

  useEffect(() => {
    activeRef.current = active;
    if (!active) resetInteractionSnapshot();
  }, [active]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(FACE_DETECTOR_WASM);
        if (cancelled) return;

        async function createDetector(delegate: "GPU" | "CPU") {
          return FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: FACE_DETECTOR_MODEL,
              delegate,
            },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.4,
          });
        }

        let detector: FaceDetector;
        try {
          detector = await createDetector("GPU");
        } catch {
          detector = await createDetector("CPU");
        }
        if (cancelled) {
          detector.close();
          return;
        }
        detectorRef.current = detector;
        detectTsRef.current = 0;
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError("人臉偵測載入失敗，請重新整理頁面。");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      detectorRef.current?.close();
      detectorRef.current = null;
      resetInteractionSnapshot();
    };
  }, [active]);

  const pushUi = useCallback(
    (
      side: "left" | "right" | null,
      progress: number,
      facePoint: Point2D | null,
      faceDetected: boolean,
      showFaceHint: boolean,
    ) => {
      const pRounded = Math.round(progress * 20) / 20;
      const prev = lastUiRef.current;
      if (
        !showDebugDot &&
        prev.side === side &&
        prev.progress === pRounded &&
        prev.hint === showFaceHint
      ) {
        return;
      }
      lastUiRef.current = { side, progress: pRounded, hint: showFaceHint };
      setInteractionSnapshot({
        hoveringSide: side,
        holdProgress: progress,
        facePoint: showDebugDot ? facePoint : null,
        faceDetected,
        showFaceHint,
      });
    },
    [showDebugDot],
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    const now = performance.now();

    if (!activeRef.current || !video || !detector) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (video.readyState < 2 || video.videoWidth <= 0) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    frameCountRef.current += 1;
    let screenPoint: Point2D | null = smoothedRef.current;
    let faceDetected = lastFaceAtRef.current > 0 && now - lastFaceAtRef.current < FACE_LOST_HINT_MS;
    let showFaceHint = false;

    if (frameCountRef.current % DETECT_EVERY_N_FRAMES === 0) {
      detectTsRef.current += 33;
      try {
        const result = detector.detectForVideo(video, detectTsRef.current);
        const box = result.detections[0]?.boundingBox;
        if (box) {
          lastFaceAtRef.current = now;
          faceDetected = true;
          showFaceHint = false;
          const raw = faceBoxCenterToScreen(box, video);
          smoothedRef.current = smoothPoint(smoothedRef.current, raw, SMOOTHING_ALPHA);
          screenPoint = smoothedRef.current;
        } else if (now - lastFaceAtRef.current > FACE_LOST_HINT_MS) {
          faceDetected = false;
          showFaceHint = true;
        }
      } catch {
        /* skip bad frame */
      }
    }

    if (activeRef.current && now >= cooldownUntilRef.current && screenPoint) {
      const faceGuide = faceGuideRef.current?.getBoundingClientRect() ?? null;
      const leftRect = leftBoxRef.current?.getBoundingClientRect() ?? null;
      const rightRect = rightBoxRef.current?.getBoundingClientRect() ?? null;
      const side = detectHoverSide(screenPoint, leftRect, rightRect, faceGuide);

      if (side) {
        if (holdSideRef.current !== side) {
          holdSideRef.current = side;
          holdStartRef.current = now;
        }
        const elapsed = now - holdStartRef.current;
        const progress = Math.min(1, elapsed / SELECTION_HOLD_MS);
        pushUi(side, progress, screenPoint, faceDetected, showFaceHint);

        if (progress >= 1) {
          dispatch({ type: "COOLDOWN_START" });
          dispatch({ type: "SELECT", side });
          cooldownUntilRef.current = now + SELECTION_COOLDOWN_MS;
          holdSideRef.current = null;
          holdStartRef.current = 0;
          lastUiRef.current = { side: null, progress: -1, hint: false };
          setTimeout(() => dispatch({ type: "COOLDOWN_END" }), SELECTION_COOLDOWN_MS);
        }
      } else {
        holdSideRef.current = null;
        holdStartRef.current = 0;
        pushUi(null, 0, screenPoint, faceDetected, showFaceHint);
      }
    } else {
      pushUi(null, 0, screenPoint, faceDetected, showFaceHint);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [videoRef, leftBoxRef, rightBoxRef, faceGuideRef, dispatch, pushUi]);

  useEffect(() => {
    if (!active || loading || loadError) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, loading, loadError, tick]);

  return { loading, loadError };
}
