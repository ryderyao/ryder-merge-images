import type { Metadata } from "next";
import GoogleAnalyticsScripts from "@/components/analytics/google-analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "長條圖合併",
  description: "電商長條圖合併與拆解",
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
        <GoogleAnalyticsScripts />
      </body>
    </html>
  );
}
