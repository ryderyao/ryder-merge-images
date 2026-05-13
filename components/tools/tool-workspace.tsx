"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { JSX } from "react";
import ImageStripStudio from "@/components/editor/image-strip-studio";
import MainProductImageBatch from "@/components/editor/main-product-image-batch";
import type { ToolDefinition } from "@/lib/tools-registry";
import { ToolShareButton } from "@/components/tools/tool-share-button";
import { hasThreadsLink, getThreadsProfileUrl } from "@/lib/site-config";

interface ToolWorkspaceProps {
  tool: ToolDefinition;
}

export function ToolWorkspace({ tool }: ToolWorkspaceProps): JSX.Element {
  const threads = hasThreadsLink() ? getThreadsProfileUrl() : "";

  let body: JSX.Element | null = null;
  if (tool.slug === "merge-strip") {
    body = <ImageStripStudio hidePageHeading />;
  }
  if (tool.slug === "main-product-1000") {
    body = <MainProductImageBatch />;
  }

  if (!body) {
    body = (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-[#8E8E93] sm:px-6 lg:px-8">
        此工具尚未接上介面。
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F2F2F7]">
      <div className="mx-auto max-w-6xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
        <nav className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0A84FF] underline-offset-4 hover:underline"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            返回工具列表
          </Link>
        </nav>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#636366]">工具</p>
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tighter text-[#1C1C1E]">
              {tool.title}
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[#636366]">{tool.scenario}</p>
            {tool.ioHint ? <p className="text-sm text-[#8E8E93]">{tool.ioHint}</p> : null}
            {threads ? (
              <p className="text-sm text-[#8E8E93]">
                使用者資訊與更新請見作者{" "}
                <Link href={threads} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0A84FF] hover:underline">
                  Threads
                </Link>
                。
              </p>
            ) : null}
          </div>
          <ToolShareButton toolSlug={tool.slug} toolTitle={tool.title} />
        </div>
      </div>

      {body}
    </div>
  );
}
