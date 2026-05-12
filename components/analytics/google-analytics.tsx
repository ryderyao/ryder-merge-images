import Script from "next/script";
import type { ReactElement } from "react";
import { GA_MEASUREMENT_ID, isValidGaMeasurementId } from "@/lib/gtag";

/** 載入 GA4（gtag.js）。僅當環境變數為合法 `G-xxxx` 時輸出。 */
export default function GoogleAnalyticsScripts(): ReactElement | null {
  if (!isValidGaMeasurementId(GA_MEASUREMENT_ID)) return null;

  const id = GA_MEASUREMENT_ID;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">{`
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('js',new Date());
gtag('config','${id}',{send_page_view:true});
      `}</Script>
    </>
  );
}
