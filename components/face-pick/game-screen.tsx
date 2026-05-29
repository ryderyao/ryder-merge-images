"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { JSX } from "react";
import { CameraView } from "./camera-view";
import { useFaceDetection } from "./hooks/use-face-detection";
import {
  getInteractionSnapshot,
  subscribeInteraction,
} from "./hooks/interaction-store";
import { OptionCard } from "./option-card";
import { QuestionCard } from "./question-card";
import { FACE_PICK_GAME_DATA } from "@/lib/face-pick/game-data";
import type { FacePickGameState, GameAction } from "@/lib/face-pick/game-state";
import type { Point2D } from "@/lib/face-pick/smoothing";

interface GameScreenProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setVideoElement: (node: HTMLVideoElement | null) => void;
  gameState: FacePickGameState;
  dispatch: React.Dispatch<GameAction>;
  showDebug: boolean;
}

export function GameScreen({
  videoRef,
  setVideoElement,
  gameState,
  dispatch,
  showDebug,
}: GameScreenProps): JSX.Element {
  const leftBoxRef = useRef<HTMLDivElement>(null);
  const rightBoxRef = useRef<HTMLDivElement>(null);
  const prevLeftRef = useRef(gameState.currentLeftOption);
  const prevRightRef = useRef(gameState.currentRightOption);

  const [enteringLeft, setEnteringLeft] = useState(false);
  const [enteringRight, setEnteringRight] = useState(false);
  const [exitingLeft, setExitingLeft] = useState(false);
  const [exitingRight, setExitingRight] = useState(false);

  const interaction = useSyncExternalStore(
    subscribeInteraction,
    getInteractionSnapshot,
    getInteractionSnapshot,
  );

  const { loading, loadError } = useFaceDetection({
    videoRef,
    active: gameState.phase === "playing",
    leftBoxRef,
    rightBoxRef,
    dispatch,
    showDebugDot: showDebug,
  });

  useEffect(() => {
    if (gameState.currentLeftOption !== prevLeftRef.current) {
      if (gameState.selectedOption !== gameState.currentLeftOption) {
        setEnteringLeft(true);
        setTimeout(() => setEnteringLeft(false), 300);
      }
      prevLeftRef.current = gameState.currentLeftOption;
    }
    if (gameState.currentRightOption !== prevRightRef.current) {
      if (gameState.selectedOption !== gameState.currentRightOption) {
        setEnteringRight(true);
        setTimeout(() => setEnteringRight(false), 300);
      }
      prevRightRef.current = gameState.currentRightOption;
    }
  }, [gameState.currentLeftOption, gameState.currentRightOption, gameState.selectedOption]);

  useEffect(() => {
    if (!gameState.selectedOption) return;
    const t = setTimeout(() => {
      setExitingLeft(false);
      setExitingRight(false);
    }, 200);
    return () => clearTimeout(t);
  }, [gameState.selectedOption]);

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-black px-6 text-center">
        <p className="text-[15px] leading-relaxed text-white/90">{loadError}</p>
      </div>
    );
  }

  const showDebugDot = showDebug && interaction.facePoint;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <CameraView videoRef={videoRef} setVideoElement={setVideoElement} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/30" />

      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : null}

      <div className="relative z-10 flex h-full flex-col">
        <QuestionCard text={FACE_PICK_GAME_DATA.question} />

        <div className="absolute left-0 right-0 top-[22%] z-10 flex justify-between gap-3 px-4">
          <OptionCard
            boxRef={leftBoxRef}
            label={gameState.currentLeftOption}
            active={interaction.hoveringSide === "left"}
            holdProgress={interaction.hoveringSide === "left" ? interaction.holdProgress : 0}
            exiting={exitingLeft}
            entering={enteringLeft}
          />
          <OptionCard
            boxRef={rightBoxRef}
            label={gameState.currentRightOption}
            active={interaction.hoveringSide === "right"}
            holdProgress={interaction.hoveringSide === "right" ? interaction.holdProgress : 0}
            exiting={exitingRight}
            entering={enteringRight}
          />
        </div>

        {interaction.showFaceHint ? (
          <p className="pointer-events-none absolute bottom-[max(env(safe-area-inset-bottom,0px),32px)] left-0 right-0 text-center text-[13px] font-medium text-white/75">
            請把臉對準鏡頭
          </p>
        ) : null}

        {showDebugDot ? <DebugDot point={interaction.facePoint!} /> : null}
      </div>
    </div>
  );
}

function DebugDot({ point }: { point: Point2D }): JSX.Element {
  return (
    <div
      className="pointer-events-none fixed z-[60] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 ring-2 ring-white/90"
      style={{ left: point.x, top: point.y }}
    />
  );
}
