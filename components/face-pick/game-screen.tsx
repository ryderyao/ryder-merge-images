"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { JSX } from "react";
import { CameraView } from "./camera-view";
import { FaceGuide } from "./face-guide";
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
  const faceGuideRef = useRef<HTMLDivElement>(null);
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
    faceGuideRef,
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
      <div className="flex h-full flex-col items-center justify-center bg-[#0f172a] px-6 text-center text-white">
        <p className="text-[15px] leading-relaxed">{loadError}</p>
      </div>
    );
  }

  const showDebugDot = showDebug && interaction.facePoint;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <CameraView videoRef={videoRef} setVideoElement={setVideoElement} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/25" />

      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <p className="rounded-full bg-white/90 px-5 py-2.5 text-[14px] font-semibold text-[#1C1C1E]">
            載入人臉偵測中…
          </p>
        </div>
      ) : null}

      <div className="relative z-10 h-full">
        <QuestionCard text={FACE_PICK_GAME_DATA.question} />

        <div className="absolute left-0 right-0 top-[24%] z-10 -translate-y-1/2 px-5">
          <p className="mb-2 text-center text-[11px] font-medium text-white/70">
            臉對準下方虛線框，再移向左／右，停留約 0.2 秒
          </p>
          <div className="flex items-start justify-between gap-2">
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
        </div>

        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <FaceGuide guideRef={faceGuideRef} />
        </div>

        {interaction.showFaceHint ? (
          <p className="pointer-events-none absolute bottom-[max(env(safe-area-inset-bottom,0px),28px)] left-0 right-0 text-center text-[14px] font-medium text-white/90 drop-shadow">
            請把臉移到畫面中間
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
      className="pointer-events-none fixed z-[60] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22C55E] ring-2 ring-white"
      style={{ left: point.x, top: point.y }}
    />
  );
}
