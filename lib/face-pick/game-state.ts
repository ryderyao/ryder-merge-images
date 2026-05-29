import { FACE_PICK_GAME_DATA } from "./game-data";

export type GamePhase = "idle" | "requestingCamera" | "playing" | "result" | "error";

export type HoverSide = "left" | "right" | null;

export interface FacePickGameState {
  phase: GamePhase;
  cameraReady: boolean;
  faceDetected: boolean;
  currentLeftOption: string;
  currentRightOption: string;
  remainingOptions: string[];
  selectedOption: string | null;
  hoveringSide: HoverSide;
  holdProgress: number;
  isCooldown: boolean;
  finalResult: string | null;
  errorMessage: string | null;
  showFaceHint: boolean;
}

export function createInitialGameState(): FacePickGameState {
  const [left, right, ...rest] = FACE_PICK_GAME_DATA.options;
  return {
    phase: "idle",
    cameraReady: false,
    faceDetected: false,
    currentLeftOption: left ?? "",
    currentRightOption: right ?? "",
    remainingOptions: rest,
    selectedOption: null,
    hoveringSide: null,
    holdProgress: 0,
    isCooldown: false,
    finalResult: null,
    errorMessage: null,
    showFaceHint: false,
  };
}

export type GameAction =
  | { type: "START_CAMERA" }
  | { type: "CAMERA_READY" }
  | { type: "CAMERA_ERROR"; message: string }
  | { type: "FACE_DETECTED"; detected: boolean }
  | { type: "SHOW_FACE_HINT"; show: boolean }
  | { type: "HOVER"; side: HoverSide; progress: number }
  | { type: "COOLDOWN_START" }
  | { type: "COOLDOWN_END" }
  | { type: "SELECT"; side: "left" | "right" }
  | { type: "RESET" };

export function gameReducer(state: FacePickGameState, action: GameAction): FacePickGameState {
  switch (action.type) {
    case "START_CAMERA":
      return {
        ...createInitialGameState(),
        phase: "requestingCamera",
        errorMessage: null,
      };
    case "CAMERA_READY":
      return { ...state, phase: "playing", cameraReady: true, errorMessage: null };
    case "CAMERA_ERROR":
      return { ...state, phase: "error", errorMessage: action.message, cameraReady: false };
    case "FACE_DETECTED":
      return { ...state, faceDetected: action.detected };
    case "SHOW_FACE_HINT":
      return { ...state, showFaceHint: action.show };
    case "HOVER":
      return { ...state, hoveringSide: action.side, holdProgress: action.progress };
    case "COOLDOWN_START":
      return { ...state, isCooldown: true, holdProgress: 0, hoveringSide: null };
    case "COOLDOWN_END":
      return { ...state, isCooldown: false };
    case "SELECT": {
      const chosen =
        action.side === "left" ? state.currentLeftOption : state.currentRightOption;
      const other = action.side === "left" ? state.currentRightOption : state.currentLeftOption;
      const [next, ...rest] = state.remainingOptions;

      if (next === undefined) {
        return {
          ...state,
          phase: "result",
          finalResult: chosen,
          selectedOption: chosen,
          holdProgress: 0,
          hoveringSide: null,
          isCooldown: false,
        };
      }

      if (action.side === "left") {
        return {
          ...state,
          currentLeftOption: chosen,
          currentRightOption: next,
          remainingOptions: rest,
          selectedOption: chosen,
          holdProgress: 0,
          hoveringSide: null,
        };
      }
      return {
        ...state,
        currentLeftOption: next,
        currentRightOption: chosen,
        remainingOptions: rest,
        selectedOption: chosen,
        holdProgress: 0,
        hoveringSide: null,
      };
    }
    case "RESET":
      return createInitialGameState();
    default:
      return state;
  }
}
