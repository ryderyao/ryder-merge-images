"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import type { JSX } from "react";
import { GameScreen } from "./game-screen";
import { ResultScreen } from "./result-screen";
import { StartScreen } from "./start-screen";
import { useCamera } from "./hooks/use-camera";
import {
  createInitialGameState,
  gameReducer,
} from "@/lib/face-pick/game-state";

export default function FacePickStudio(): JSX.Element {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const { videoRef, setVideoElement, error: cameraError, starting, startCamera, stopCamera } = useCamera();
  const [showDebug] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).has("debug") : false,
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (state.phase === "result") {
      stopCamera();
    }
  }, [state.phase, stopCamera]);

  const handleStart = useCallback(async () => {
    dispatch({ type: "START_CAMERA" });
    const ok = await startCamera();
    if (ok) {
      dispatch({ type: "CAMERA_READY" });
    } else {
      dispatch({
        type: "CAMERA_ERROR",
        message: "你需要允許鏡頭權限，才能開始遊戲。",
      });
    }
  }, [startCamera]);

  const handleRetry = useCallback(() => {
    dispatch({ type: "RESET" });
    stopCamera();
  }, [stopCamera]);

  const handlePlayAgain = useCallback(async () => {
    stopCamera();
    dispatch({ type: "RESET" });
    dispatch({ type: "START_CAMERA" });
    const ok = await startCamera();
    if (ok) {
      dispatch({ type: "CAMERA_READY" });
    } else {
      dispatch({
        type: "CAMERA_ERROR",
        message: "你需要允許鏡頭權限，才能開始遊戲。",
      });
    }
  }, [startCamera, stopCamera]);

  const errorMsg = state.errorMessage ?? cameraError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div
        className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-black shadow-2xl"
        style={{ aspectRatio: "9/16" }}
      >
        {state.phase === "idle" || state.phase === "requestingCamera" ? (
          <StartScreen onStart={() => void handleStart()} loading={starting || state.phase === "requestingCamera"} />
        ) : null}

        {state.phase === "error" ? (
          <div className="flex h-full flex-col items-center justify-center bg-black px-8 text-center">
            <p className="text-[15px] leading-relaxed text-white/85">{errorMsg}</p>
            <button
              type="button"
              onClick={() => void handleStart()}
              className="mt-10 min-w-[160px] rounded-full bg-white px-8 py-3.5 text-[16px] font-bold text-black"
            >
              重新嘗試
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 text-[14px] font-medium text-white/45"
            >
              返回
            </button>
          </div>
        ) : null}

        {state.phase === "playing" ? (
          <GameScreen
            videoRef={videoRef}
            setVideoElement={setVideoElement}
            gameState={state}
            dispatch={dispatch}
            showDebug={showDebug}
          />
        ) : null}

        {state.phase === "result" && state.finalResult ? (
          <ResultScreen result={state.finalResult} onPlayAgain={() => void handlePlayAgain()} />
        ) : null}
      </div>
    </div>
  );
}
