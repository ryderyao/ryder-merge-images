import type { Point2D } from "@/lib/face-pick/smoothing";
import type { HoverSide } from "@/lib/face-pick/collision";

export interface InteractionSnapshot {
  hoveringSide: HoverSide;
  holdProgress: number;
  facePoint: Point2D | null;
  faceDetected: boolean;
  showFaceHint: boolean;
}

const defaultSnapshot: InteractionSnapshot = {
  hoveringSide: null,
  holdProgress: 0,
  facePoint: null,
  faceDetected: false,
  showFaceHint: false,
};

let snapshot: InteractionSnapshot = { ...defaultSnapshot };
const listeners = new Set<() => void>();

export function getInteractionSnapshot(): InteractionSnapshot {
  return snapshot;
}

export function setInteractionSnapshot(next: Partial<InteractionSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

export function resetInteractionSnapshot(): void {
  snapshot = { ...defaultSnapshot };
  listeners.forEach((l) => l());
}

export function subscribeInteraction(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
