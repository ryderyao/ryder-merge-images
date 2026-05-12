/** GA4 Measurement ID（NEXT_PUBLIC_* 會進入前端 bundle，勿放密鑰） */
export const GA_MEASUREMENT_ID =
  typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim() : "";

export function isValidGaMeasurementId(id: string): boolean {
  return /^G-[A-Z0-9]{4,12}$/i.test(id);
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** 自訂事件（若未設定合法 gaId 會靜默略過） */
export function sendGa4Event(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined" || !isValidGaMeasurementId(GA_MEASUREMENT_ID)) return;
  window.gtag?.("event", name, params ?? {});
}
