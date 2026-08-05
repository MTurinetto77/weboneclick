"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getAnalyticsConfig,
  trackPageView,
} from "@/lib/analytics";

function AnalyticsRouteListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    // El PageView inicial lo disparan los snippets base (gtag config / fbq init).
    if (first.current) {
      first.current = false;
      return;
    }
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const config = getAnalyticsConfig();

  if (!config.hasAny) {
    return <>{children}</>;
  }

  const awId = config.googleAdsId ? `AW-${config.googleAdsId}` : null;
  const gtagId = config.ga4Id || awId;

  return (
    <>
      {config.hasGoogle && gtagId ? (
        <>
          <Script
            id="gtag-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${config.ga4Id ? `gtag('config', ${JSON.stringify(config.ga4Id)}, { send_page_view: true });` : ""}
${awId ? `gtag('config', ${JSON.stringify(awId)});` : ""}
`}
          </Script>
        </>
      ) : null}

      {config.metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(config.metaPixelId)});
fbq('track', 'PageView');
`}
        </Script>
      ) : null}

      <Suspense fallback={null}>
        <AnalyticsRouteListener />
      </Suspense>

      {children}
    </>
  );
}
