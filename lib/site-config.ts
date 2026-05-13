/** 站台名稱、canonical／OG 基底網址、Threads 等（皆為可公開的前綴變數） */

const DEFAULT_SITE_NAME = "大家的工具庫";
const DEFAULT_THREADS_URL = "https://www.threads.com/@ryderyao";

function trimEnv(key: string): string {
  if (typeof process === "undefined") return "";
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

export function getSiteName(): string {
  return trimEnv("NEXT_PUBLIC_SITE_NAME") || DEFAULT_SITE_NAME;
}

/** 用於 metadataBase、完整分享連結；本機預設 http://localhost:3000 */
export function getMetadataBase(): URL {
  const raw = trimEnv("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function getThreadsProfileUrl(): string {
  return trimEnv("NEXT_PUBLIC_THREADS_URL") || DEFAULT_THREADS_URL;
}

export function hasThreadsLink(): boolean {
  const u = getThreadsProfileUrl();
  return u.startsWith("http://") || u.startsWith("https://");
}
