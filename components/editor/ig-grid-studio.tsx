"use client";

import JSZip from "jszip";
import {
  AlertCircle,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Smartphone,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { JSX } from "react";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { DashboardCard } from "@/components/ui/dashboard-card";
import {
  GRID_CELL_NAMES,
  POST_STEP_LABELS,
  POSTING_VISUAL_ORDER,
  buildPostingOrderLines,
  zipEntryBaseName,
} from "@/lib/ig-grid-post-order";
import { IG_FULL_H, IG_FULL_W, IG_TILE_H, IG_TILE_W, type IgGridFitMode, splitFileToTileBlobs } from "@/lib/ig-grid-split";
import { sendGa4Event } from "@/lib/gtag";

const IOS_PANEL =
  "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-[28px]";
const SOFT_BUTTON =
  "inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition active:opacity-95 disabled:opacity-40 disabled:pointer-events-none";

interface IgGridStudioProps {
  hidePageHeading?: boolean;
}

function formatStat(raw: string): string {
  const t = raw.trim();
  if (!t) return "—";
  const n = Number.parseInt(t.replace(/,/g, ""), 10);
  if (Number.isFinite(n)) return n.toLocaleString("en-US");
  return t;
}

function handleDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return "@your_brand";
  return t.startsWith("@") ? t : `@${t}`;
}

interface IgProfilePreviewProps {
  /** null 時九宮格顯示佔位 */
  tileUrls: string[] | null;
  handle: string;
  displayName: string;
  bio: string;
  posts: string;
  followers: string;
  following: string;
  avatarUrl: string | null;
}

function IgProfilePreview({
  tileUrls,
  handle,
  displayName,
  bio,
  posts,
  followers,
  following,
  avatarUrl,
}: IgProfilePreviewProps): JSX.Element {
  const cells = tileUrls ?? Array.from({ length: 9 }, () => null as string | null);
  return (
    <div className="overflow-hidden rounded-[28px] bg-white">
      <div className="border-b border-[#EFEFEF] px-3 py-2.5 text-center">
        <span className="text-[13px] font-semibold text-[#1C1C1E]">個人檔案</span>
      </div>

      <div className="px-4 pb-1 pt-4">
        <header className="flex items-start gap-3">
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border border-[#DBDBDB] bg-[#F2F2F7]">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#AEAEB2]">頭像</div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[15px] font-semibold leading-tight text-[#1C1C1E]">{handleDisplay(handle)}</p>
            <p className="mt-0.5 truncate text-[14px] font-semibold text-[#1C1C1E]">
              {displayName.trim() || "品牌／顯示名稱"}
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center text-[11px] leading-tight text-[#1C1C1E]">
              <div>
                <p className="font-bold tabular-nums">{formatStat(posts)}</p>
                <p className="text-[9px] font-medium text-[#8E8E93]">貼文</p>
              </div>
              <div>
                <p className="font-bold tabular-nums">{formatStat(followers)}</p>
                <p className="text-[9px] font-medium text-[#8E8E93]">粉絲</p>
              </div>
              <div>
                <p className="font-bold tabular-nums">{formatStat(following)}</p>
                <p className="text-[9px] font-medium text-[#8E8E93]">追蹤中</p>
              </div>
            </div>
          </div>
        </header>

        <p className="mt-3 whitespace-pre-line text-[12px] leading-snug text-[#1C1C1E]">
          {bio.trim() || "簡介文字（選填）可放品牌標語或活動說明。"}
        </p>

        <div className="mt-3 flex gap-2">
          <span className="flex-1 rounded-md bg-[#0095F6] py-1.5 text-center text-[12px] font-semibold text-white">
            追蹤
          </span>
          <span className="flex-1 rounded-md border border-[#DBDBDB] bg-white py-1.5 text-center text-[12px] font-semibold text-[#1C1C1E]">
            訊息
          </span>
        </div>

        <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
          {(["精選 1", "精選 2", "精選 3"] as const).map((label, i) => {
            const thumb = cells[i];
            return (
              <div key={label} className="flex w-[54px] shrink-0 flex-col items-center gap-1.5 text-center">
                <div className="h-[54px] w-[54px] overflow-hidden rounded-full border-2 border-[#1C1C1E]/8 bg-[#F2F2F7]">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] text-[#C7C7CC]">—</div>
                  )}
                </div>
                <span className="w-full truncate text-[9px] font-medium text-[#636366]">{label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-[2px] bg-[#1C1C1E]/15">
          {cells.map((url, idx) => (
            <div key={idx} className="aspect-[4/5] bg-[#EFEFF4]">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={`格 ${GRID_CELL_NAMES[idx]}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[#FAFAFA] px-1 text-center">
                  <span className="text-[8px] font-semibold text-[#C7C7CC]">九宮格</span>
                  <span className="text-[8px] text-[#D1D1D6]">{GRID_CELL_NAMES[idx]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="px-3 py-3 text-center text-[9px] leading-relaxed text-[#AEAEB2]">
        此為 IG「風格」版面預覽，非官方介面；實際畫面以 Instagram App 為準。
      </p>
    </div>
  );
}

export default function IgGridStudio({ hidePageHeading = false }: IgGridStudioProps): JSX.Element {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fitMode, setFitMode] = useState<IgGridFitMode>("cover");
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [tileUrls, setTileUrls] = useState<string[] | null>(null);
  const [fullBlob, setFullBlob] = useState<Blob | null>(null);
  const [tileBlobs, setTileBlobs] = useState<Blob[] | null>(null);

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [posts, setPosts] = useState("");
  const [followers, setFollowers] = useState("");
  const [following, setFollowing] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewUrlsRef = useRef<string[]>([]);
  const avatarUrlUnmountRef = useRef<string | null>(null);

  const revokePreviewUrls = useCallback((): void => {
    previewUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    previewUrlsRef.current = [];
  }, []);

  const clearAll = useCallback((): void => {
    revokePreviewUrls();
    setSourceFile(null);
    setFullUrl(null);
    setTileUrls(null);
    setFullBlob(null);
    setTileBlobs(null);
    setErrorMessage(null);
    setHandle("");
    setDisplayName("");
    setBio("");
    setPosts("");
    setFollowers("");
    setFollowing("");
    setAvatarUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [revokePreviewUrls]);

  useEffect(() => {
    if (!sourceFile) {
      revokePreviewUrls();
      setFullUrl(null);
      setTileUrls(null);
      setFullBlob(null);
      setTileBlobs(null);
      return;
    }

    let cancelled = false;
    setBusy(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const { fullBlob: nextFull, tileBlobs: nextTiles } = await splitFileToTileBlobs(sourceFile, fitMode);
        if (cancelled) return;

        revokePreviewUrls();
        const fu = URL.createObjectURL(nextFull);
        const tu = nextTiles.map((b) => URL.createObjectURL(b));
        previewUrlsRef.current = [fu, ...tu];

        setFullBlob(nextFull);
        setTileBlobs(nextTiles);
        setFullUrl(fu);
        setTileUrls(tu);
        sendGa4Event("ig_grid_split", { fit: fitMode });
      } catch {
        if (!cancelled) {
          setErrorMessage("圖片處理失敗：請確認檔案為常見圖檔格式。");
          revokePreviewUrls();
          setFullUrl(null);
          setTileUrls(null);
          setFullBlob(null);
          setTileBlobs(null);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceFile, fitMode, revokePreviewUrls]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      if (avatarUrlUnmountRef.current) URL.revokeObjectURL(avatarUrlUnmountRef.current);
    },
    [],
  );

  useEffect(() => {
    avatarUrlUnmountRef.current = avatarUrl;
  }, [avatarUrl]);

  const postingLines = buildPostingOrderLines([...GRID_CELL_NAMES]);
  const ready = Boolean(fullBlob && tileBlobs && tileUrls?.length === 9 && fullUrl);

  const copyPostingText = async (): Promise<void> => {
    const text = postingLines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const downloadFullPng = (): void => {
    if (!fullBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(fullBlob);
    a.download = `IG九宮格完整拼圖-${Date.now()}.png`;
    a.rel = "noopener";
    a.click();
    queueMicrotask(() => URL.revokeObjectURL(a.href));
    sendGa4Event("ig_grid_download_full", {});
  };

  const downloadZip = async (): Promise<void> => {
    if (!fullBlob || !tileBlobs || tileBlobs.length !== 9) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("發文順序");
      if (!folder) throw new Error("ZIP 初始化失敗");

      for (let step = 1; step <= 9; step++) {
        const visualIdx = POSTING_VISUAL_ORDER[step - 1];
        const blob = tileBlobs[visualIdx];
        folder.file(`${zipEntryBaseName(step)}.png`, blob);
      }

      const prevFolder = zip.folder("預覽圖");
      prevFolder?.file("IG九宮格完整拼圖.png", fullBlob);
      zip.file("發文順序說明.txt", postingLines.join("\n"));

      const zipped = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      const hook = document.createElement("a");
      hook.href = URL.createObjectURL(zipped);
      hook.download = `IG九宮格發文包-${Date.now()}.zip`;
      hook.rel = "noopener";
      hook.click();
      queueMicrotask(() => URL.revokeObjectURL(hook.href));
      sendGa4Event("ig_grid_zip", { fit: fitMode });
    } catch {
      setErrorMessage("ZIP 產生失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (list: FileList | null): void => {
    const f = list?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setSourceFile(f);
    setErrorMessage(null);
  };

  const onPickAvatar = (list: FileList | null): void => {
    const f = list?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setAvatarUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  return (
    <div
      className={`mx-auto flex min-h-[100dvh] max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8 ${
        hidePageHeading ? "pb-12 pt-4 sm:pt-6" : "py-12"
      }`}
    >
      {!hidePageHeading ? (
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#636366]">社群裁切</p>
          <h1 className="text-[clamp(2.2rem,4vw,3.5rem)] font-semibold leading-none tracking-tighter text-[#1C1C1E]">
            IG 九宮格裁切
          </h1>
          <p className="max-w-2xl text-base text-[#8E8E93] md:text-[17px]">
            單張 4:5 大圖自動切成 9 張 1080×1350，並附發文順序檔名打包下載。
          </p>
        </header>
      ) : null}

      <input
        ref={inputRef}
        id={`ig-one-upload-${uid}`}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          onPickFile(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={avatarInputRef}
        id={`ig-avatar-${uid}`}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          onPickAvatar(e.target.files);
          e.target.value = "";
        }}
      />

      <BentoGrid>
        <BentoItem span={4}>
          <DashboardCard className="space-y-6 p-5 sm:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">說明</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1C1C1E] sm:text-2xl">建議流程</h2>
              <ul className="mt-4 list-inside list-disc space-y-2 text-[15px] leading-relaxed text-[#636366]">
                <li>
                  請 AI 生成<strong className="text-[#1C1C1E]">一張</strong>構圖，比例{" "}
                  <strong className="text-[#1C1C1E]">4:5</strong>，像素建議{" "}
                  <strong className="text-[#1C1C1E]">
                    {IG_FULL_W}×{IG_FULL_H}
                  </strong>{" "}
                 （亦可上傳任意尺寸，由下列「套入方式」處理）。
                </li>
                <li>
                  此工具會將畫布均分為 3×3，每格輸出 <strong className="text-[#1C1C1E]">{IG_TILE_W}×{IG_TILE_H}</strong>{" "}
                  PNG。
                </li>
                <li>下載 ZIP 內檔名已對應正確發文順序；實際 App 顯示仍以 Instagram 為準。</li>
              </ul>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`${SOFT_BUTTON} bg-[#0A84FF]/90 text-white shadow-lg shadow-[#1C252E29]`}
              >
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" aria-hidden />
                  選擇一張圖片
                </span>
              </button>
              <button
                type="button"
                disabled={!sourceFile}
                onClick={clearAll}
                className={`${SOFT_BUTTON} border border-transparent text-[#8E8E93]`}
              >
                清除
              </button>
              {busy && sourceFile ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[#8E8E93]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  處理中…
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#636366]">套入 {IG_FULL_W}×{IG_FULL_H} 的方式</p>
              <label className="mr-6 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#3A3A3C]">
                <input
                  type="radio"
                  name={`fit-${uid}`}
                  checked={fitMode === "cover"}
                  onChange={() => setFitMode("cover")}
                  className="accent-[#0A84FF]"
                />
                填滿裁切（cover，建議）
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#3A3A3C]">
                <input
                  type="radio"
                  name={`fit-${uid}`}
                  checked={fitMode === "contain"}
                  onChange={() => setFitMode("contain")}
                  className="accent-[#0A84FF]"
                />
                完整留白（contain）
              </label>
            </div>

            <div
              className={`${IOS_PANEL} p-6`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const f = e.dataTransfer.files?.[0];
                if (f?.type.startsWith("image/")) setSourceFile(f);
              }}
            >
              <div className="text-center text-sm text-[#636366]">
                <ImagePlus className="mx-auto mb-3 h-10 w-10 text-[#C7C7CC]" aria-hidden />
                <p className="font-semibold text-[#1C1C1E]">拖曳一張圖片至此</p>
                <p className="mt-2 text-[13px] text-[#8E8E93]">僅支援單檔；換圖會重新裁切。</p>
              </div>
              {sourceFile ? (
                <p className="mt-4 truncate text-center text-xs text-[#8E8E93]">目前：{sourceFile.name}</p>
              ) : null}
            </div>

            <div className="space-y-4 border-t border-[#1C1C1E]/[0.06] pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#636366]">預覽用個人檔案（選填）</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm font-medium text-[#3A3A3C]">
                  帳號（@）
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="brand_account"
                    className="w-full rounded-2xl border border-[#1C1C1E]/10 bg-white/90 px-4 py-2.5 text-sm text-[#1C1C1E] outline-none focus:border-[#0A84FF]/40"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-[#3A3A3C]">
                  顯示名稱
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="品牌名稱"
                    className="w-full rounded-2xl border border-[#1C1C1E]/10 bg-white/90 px-4 py-2.5 text-sm text-[#1C1C1E] outline-none focus:border-[#0A84FF]/40"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-[#3A3A3C] sm:col-span-2">
                  簡介
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="一行標語或介紹"
                    rows={2}
                    className="w-full resize-y rounded-2xl border border-[#1C1C1E]/10 bg-white/90 px-4 py-2.5 text-sm text-[#1C1C1E] outline-none focus:border-[#0A84FF]/40"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-[#3A3A3C]">
                  貼文數
                  <input
                    value={posts}
                    onChange={(e) => setPosts(e.target.value)}
                    placeholder="36"
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-[#1C1C1E]/10 bg-white/90 px-4 py-2.5 text-sm text-[#1C1C1E] outline-none focus:border-[#0A84FF]/40"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-[#3A3A3C]">
                  粉絲
                  <input
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value)}
                    placeholder="1280"
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-[#1C1C1E]/10 bg-white/90 px-4 py-2.5 text-sm text-[#1C1C1E] outline-none focus:border-[#0A84FF]/40"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-[#3A3A3C]">
                  追蹤中
                  <input
                    value={following}
                    onChange={(e) => setFollowing(e.target.value)}
                    placeholder="120"
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-[#1C1C1E]/10 bg-white/90 px-4 py-2.5 text-sm text-[#1C1C1E] outline-none focus:border-[#0A84FF]/40"
                  />
                </label>
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-[#3A3A3C]">頭像</p>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className={`${SOFT_BUTTON} mt-2 border border-[#1C1C1E]/10 bg-white/90 text-[#1C1C1E]`}
                  >
                    選擇頭像圖片
                  </button>
                </div>
              </div>
            </div>
          </DashboardCard>
        </BentoItem>

        <BentoItem span={4}>
          <DashboardCard className="p-5 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">預覽</p>
                <div className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
                  <Smartphone className="h-5 w-5 text-[#8E8E93]" aria-hidden />
                  IG 風格首頁
                </div>
                <p className="mt-1 text-xs text-[#8E8E93]">右側為版型示意，精選動態會帶入九宮格前三格預覽。</p>
              </div>
              {!ready ? (
                <span className="rounded-full bg-[#FFF3CD] px-3 py-1 text-[11px] font-semibold text-[#946200]">
                  請先上傳圖片
                </span>
              ) : null}
            </div>

            <div className="mx-auto max-w-[360px] rounded-[40px] border border-[#1C1C1E]/10 bg-white p-3 shadow-[0_24px_80px_rgba(28,28,30,0.1)]">
              <IgProfilePreview
                tileUrls={ready ? tileUrls : null}
                handle={handle}
                displayName={displayName}
                bio={bio}
                posts={posts}
                followers={followers}
                following={following}
                avatarUrl={avatarUrl}
              />
            </div>
            {fullUrl && ready ? (
              <p className="mx-auto mt-4 max-w-[360px] text-center text-[11px] text-[#8E8E93]">
                完整無縫大圖請使用「下載完整拼圖 PNG」或 ZIP 內預覽圖。
              </p>
            ) : null}
          </DashboardCard>
        </BentoItem>

        <BentoItem span={2}>
          <DashboardCard className="space-y-5 p-5 sm:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">發文順序</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1C1C1E] sm:text-xl">實際上傳順序</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#8E8E93]">若未照序貼文，版面上看到的拼圖會錯位。</p>
            </div>
            <ul className="max-h-[min(52vh,420px)] space-y-2.5 overflow-y-auto text-[13px] leading-snug text-[#48484A] pr-1">
              {POST_STEP_LABELS.map((label, i) => {
                const step = i + 1;
                const visualIdx = POSTING_VISUAL_ORDER[i];
                return (
                  <li key={label} className="flex gap-2">
                    <span className="w-7 shrink-0 tabular-nums font-semibold text-[#0A84FF]">
                      {String(step).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="font-semibold text-[#1C1C1E]">{label}</span>
                      <span className="text-[#8E8E93]"> · </span>
                      <span>預覽「{GRID_CELL_NAMES[visualIdx]}」格</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => void copyPostingText()}
              className={`${SOFT_BUTTON} w-full justify-center rounded-[22px] border border-[#1C1C1E]/10 bg-white text-[#1C1C1E]`}
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden />
              複製說明文字
            </button>
          </DashboardCard>
        </BentoItem>

        <BentoItem span={2}>
          <DashboardCard className="space-y-4 p-5 sm:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#636366]">下載</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1C1C1E] sm:text-xl">匯出</h2>
            </div>
            <button
              type="button"
              disabled={!ready || busy}
              onClick={downloadFullPng}
              className={`${SOFT_BUTTON} w-full justify-center rounded-[22px] bg-[#34C759] text-[#F6FFF7]`}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden />
              下載完整拼圖 PNG
            </button>
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() => void downloadZip()}
              className={`${SOFT_BUTTON} w-full justify-center rounded-[22px] border border-[#1C1C1E]/12 bg-white text-[#1C1C1E]`}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden />
              )}
              下載發文包 ZIP
            </button>
            <p className="text-xs leading-relaxed text-[#8E8E93]">
              ZIP 含：`發文順序/` 九張 PNG（已依序命名）、`預覽圖/IG九宮格完整拼圖.png`、`發文順序說明.txt`。
            </p>
          </DashboardCard>
        </BentoItem>
      </BentoGrid>

      <AnimatePresence>
        {errorMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <div role="alert">
              <DashboardCard className="flex gap-4 border-[#FF6961]/70 p-6 text-[#D70015]">
                <AlertCircle className="h-6 w-6 shrink-0" aria-hidden />
                <span className="text-sm font-semibold leading-relaxed">{errorMessage}</span>
              </DashboardCard>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
