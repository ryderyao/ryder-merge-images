import Link from "next/link";
import type { JSX } from "react";

export default function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-semibold text-[#1C1C1E]">找不到頁面</p>
      <p className="max-w-sm text-sm text-[#636366]">連結可能已變更，請從工具列表重新進入。</p>
      <Link href="/" className="font-semibold text-[#0A84FF] underline-offset-4 hover:underline">
        回到工具列表
      </Link>
    </div>
  );
}
