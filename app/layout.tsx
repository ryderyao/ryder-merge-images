import type { Metadata } from "next";
import GoogleAnalyticsScripts from "@/components/analytics/google-analytics";
import SiteFooter from "@/components/site/site-footer";
import { getMetadataBase, getSiteName } from "@/lib/site-config";
import "./globals.css";

const siteName = getSiteName();

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description:
    "本網站小工具由Ryder開發，想到什麼就開發什麼；不需登入，檔案不上傳至伺服器。",
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: siteName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="bg-[#F2F2F7] text-[#1C1C1E] antialiased">
        {children}
        <SiteFooter />
        <GoogleAnalyticsScripts />
      </body>
    </html>
  );
}
