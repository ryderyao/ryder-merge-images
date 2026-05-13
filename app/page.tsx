import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { JSX } from "react";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { cn } from "@/lib/utils";
import { getSiteName, getThreadsProfileUrl } from "@/lib/site-config";
import { TOOLS } from "@/lib/tools-registry";

const introCopy =
  "本網站小工具由Ryder開發，想到什麼就開發什麼，本網站不需登入帳號，你們上傳的檔案也不會到我這邊，請安心使用";

function threadsLinkLabel(url: string): string {
  try {
    const seg = new URL(url).pathname.replace(/^\//, "").replace(/\/$/, "");
    if (!seg) return "Threads";
    const handle = seg.startsWith("@") ? seg : `@${seg}`;
    return `Threads ${handle}`;
  } catch {
    return "Threads";
  }
}

export const metadata: Metadata = {
  title: { absolute: getSiteName() },
  description: introCopy,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: getSiteName(),
    description: introCopy,
    url: "/",
    type: "website",
    locale: "zh_TW",
    siteName: getSiteName(),
  },
};

const glassPanel =
  "rounded-[28px] border border-white/55 bg-white/[0.72] shadow-[0_1px_2px_rgba(28,28,30,0.04),0_12px_40px_rgba(28,28,30,0.06)] backdrop-blur-xl";

export default function HomePage(): JSX.Element {
  const siteName = getSiteName();
  const threadsUrl = getThreadsProfileUrl();

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
      <header className="mb-12 space-y-8 sm:mb-14">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8E8E93]">Tools</p>
          <h1 className="max-w-[14ch] text-[clamp(2rem,4.8vw,3.35rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#1C1C1E]">
            {siteName}
          </h1>
        </div>

        <section aria-label="網站說明" className={cn(glassPanel, "max-w-2xl px-6 py-7 sm:px-9 sm:py-9")}>
          <p className="text-[0.9375rem] leading-[1.75] text-[#48484A] sm:text-[1rem] sm:leading-[1.78]">
            {introCopy}
          </p>
          <div className="mt-8 flex flex-col gap-4 border-t border-[#1C1C1E]/[0.06] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-[#8E8E93] sm:text-sm">更新與閒聊｜Ryder</p>
            <Link
              href={threadsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-fit items-center gap-2 rounded-full border border-[#1C1C1E]/[0.08] bg-white/80 px-4 py-2.5 text-[13px] font-semibold text-[#1C1C1E] shadow-sm transition hover:border-[#0A84FF]/25 hover:bg-white hover:text-[#0A84FF]"
            >
              {threadsLinkLabel(threadsUrl)}
              <ExternalLink className="h-3.5 w-3.5 opacity-50 transition group-hover:opacity-90" aria-hidden />
            </Link>
          </div>
        </section>

        <div className="flex items-baseline justify-between gap-4 border-b border-[#1C1C1E]/[0.06] pb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">可用工具</h2>
          <span className="text-[12px] font-medium tabular-nums text-[#AEAEB2] sm:text-[13px]">{TOOLS.length} 項</span>
        </div>
      </header>

      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {TOOLS.map((tool) => (
          <li key={tool.slug}>
            <DashboardCard className="flex h-full flex-col gap-5 p-6 transition-[box-shadow] duration-300 hover:shadow-[0_8px_30px_rgba(28,28,30,0.08)] sm:p-8">
              <div className="space-y-2.5">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#1C1C1E] sm:text-[1.375rem]">{tool.title}</h3>
                <p className="text-[15px] leading-[1.65] text-[#636366]">{tool.summary}</p>
              </div>
              <Link
                href={`/tools/${tool.slug}`}
                className="mt-auto inline-flex items-center gap-2 self-start rounded-full bg-[#1C1C1E] px-5 py-2.5 text-[13px] font-semibold tracking-wide text-white shadow-sm transition hover:bg-[#2C2C2E] active:scale-[0.99]"
              >
                開始使用
                <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
              </Link>
            </DashboardCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
