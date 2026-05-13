"use client";

import { Link2, Loader2, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { JSX } from "react";

const BTN =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition active:opacity-95 disabled:pointer-events-none disabled:opacity-40";

interface ToolShareButtonProps {
  toolSlug: string;
  toolTitle: string;
}

export function ToolShareButton({ toolSlug, toolTitle }: ToolShareButtonProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const resolvedUrl = useCallback((): string => {
    if (typeof window === "undefined") return "";
    const path = `/tools/${toolSlug}`;
    return `${window.location.origin}${path}`;
  }, [toolSlug]);

  const copyLink = useCallback(async (): Promise<void> => {
    const url = resolvedUrl();
    if (!url || !navigator.clipboard?.writeText) {
      setHint("無法複製，請手動複製網址列。");
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      await navigator.clipboard.writeText(url);
      setHint("已複製連結");
      window.setTimeout(() => setHint(null), 2200);
    } catch {
      setHint("複製失敗，請長按網址列自行複製。");
    } finally {
      setBusy(false);
    }
  }, [resolvedUrl]);

  const shareOrCopy = useCallback(async (): Promise<void> => {
    const url = resolvedUrl();
    if (!url) return;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setBusy(true);
      setHint(null);
      try {
        await navigator.share({
          title: toolTitle,
          text: `${toolTitle} — ${url}`,
          url,
        });
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === "AbortError") return;
        await copyLink();
      } finally {
        setBusy(false);
      }
      return;
    }

    await copyLink();
  }, [copyLink, resolvedUrl, toolTitle]);

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button type="button" disabled={busy} className={`${BTN} bg-[#0A84FF]/90 text-white shadow-md`} onClick={() => void shareOrCopy()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
          分享此工具
        </button>
        <button type="button" disabled={busy} className={`${BTN} border border-white/50 bg-white/75 text-[#1C1C1E]`} onClick={() => void copyLink()}>
          <Link2 className="h-4 w-4" aria-hidden />
          複製連結
        </button>
      </div>
      {hint ? <p className="text-xs font-medium text-[#34C759] sm:text-right">{hint}</p> : null}
    </div>
  );
}
