import { NextResponse } from "next/server";
import {
  buildGoogleMerchantRssXml,
  loadGoogleMerchantFeedItems,
} from "@/lib/google-merchant-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Feed RSS 2.0 para Google Merchant Center (Scheduled fetch).
 *
 * URL producción (ejemplo):
 *   https://oneclickstore.com/api/feeds/google-merchant
 *
 * Token opcional: GOOGLE_MERCHANT_FEED_TOKEN → ?token=...
 * En Merchant Center: Productos → Fuentes de datos → Agregar → Scheduled fetch → esta URL.
 */
export async function GET(req: Request) {
  const expected = process.env.GOOGLE_MERCHANT_FEED_TOKEN?.trim();
  if (expected) {
    const token = new URL(req.url).searchParams.get("token")?.trim();
    if (!token || token !== expected) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const { siteUrl, items, skipped } = await loadGoogleMerchantFeedItems();
    const xml = buildGoogleMerchantRssXml({ siteUrl, items });

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Feed-Item-Count": String(items.length),
        "X-Feed-Skipped-No-Price": String(skipped.noPrice),
        "X-Feed-Skipped-No-Image": String(skipped.noImage),
      },
    });
  } catch (err) {
    console.error("[google-merchant-feed]", err);
    return NextResponse.json(
      { error: "No se pudo generar el feed" },
      { status: 500 }
    );
  }
}
