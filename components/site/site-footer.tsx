import Link from "next/link";
import type { JSX } from "react";
import { getSiteName, getThreadsProfileUrl, hasThreadsLink } from "@/lib/site-config";

export default function SiteFooter(): JSX.Element {
  const siteName = getSiteName();
  const threadsUrl = getThreadsProfileUrl();

  return (
    <footer className="border-t border-black/[0.06] bg-[#F2F2F7]/90 py-10 text-center text-sm text-[#636366]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 sm:px-6 lg:px-8">
        <p>
          <span className="font-semibold text-[#3A3A3C]">{siteName}</span>
          <span className="mx-2 text-[#C7C7CC]" aria-hidden>
            ·
          </span>
          <span>多半是瀏覽器直接處理，不用特地登入。</span>
        </p>
        {hasThreadsLink() ? (
          <p>
            <Link
              href={threadsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#0A84FF] underline-offset-4 hover:underline"
            >
              在 Threads 找到作者
            </Link>
          </p>
        ) : null}
      </div>
    </footer>
  );
}
