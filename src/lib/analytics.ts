export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  quantity?: number;
  price?: number;
  item_category?: string;
};

export type AnalyticsConfig = {
  ga4Id: string | null;
  metaPixelId: string | null;
  googleAdsId: string | null;
  googleAdsLabel: string | null;
  hasAny: boolean;
  hasGoogle: boolean;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const CURRENCY = "ARS";

function trimEnv(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** Lee IDs públicos de env. Seguro en server y client. */
export function getAnalyticsConfig(): AnalyticsConfig {
  const ga4Id = trimEnv(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID);
  const metaPixelId = trimEnv(process.env.NEXT_PUBLIC_META_PIXEL_ID);
  const googleAdsId = trimEnv(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID)?.replace(
    /^AW-/i,
    "",
  ) ?? null;
  const googleAdsLabel = trimEnv(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL);
  return {
    ga4Id,
    metaPixelId,
    googleAdsId,
    googleAdsLabel,
    hasAny: !!(ga4Id || metaPixelId || googleAdsId),
    hasGoogle: !!(ga4Id || googleAdsId),
  };
}

export function googleAdsSendTo(
  adsId: string,
  label: string,
): string {
  return `AW-${adsId}/${label}`;
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
}

function fbq(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(...args);
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function gaItems(items: AnalyticsItem[]) {
  return items.map((i) => ({
    item_id: i.item_id,
    item_name: i.item_name,
    quantity: i.quantity ?? 1,
    ...(i.price != null ? { price: i.price } : {}),
    ...(i.item_category ? { item_category: i.item_category } : {}),
  }));
}

function metaContents(items: AnalyticsItem[]) {
  return items.map((i) => ({
    id: i.item_id,
    quantity: i.quantity ?? 1,
    ...(i.price != null ? { item_price: i.price } : {}),
  }));
}

export function trackPageView(url: string) {
  const { ga4Id, metaPixelId } = getAnalyticsConfig();
  if (ga4Id) {
    gtag("event", "page_view", {
      page_path: url,
      page_location: typeof window !== "undefined" ? window.location.href : url,
    });
  }
  if (metaPixelId) {
    fbq("track", "PageView");
  }
}

export function trackViewItem(input: {
  item_id: string;
  item_name: string;
  price?: number | null;
  item_category?: string;
}) {
  const price = toNumber(input.price);
  const items: AnalyticsItem[] = [
    {
      item_id: input.item_id,
      item_name: input.item_name,
      quantity: 1,
      price,
      item_category: input.item_category,
    },
  ];

  gtag("event", "view_item", {
    currency: CURRENCY,
    value: price,
    items: gaItems(items),
  });

  fbq("track", "ViewContent", {
    content_ids: [input.item_id],
    content_name: input.item_name,
    content_type: "product",
    contents: metaContents(items),
    ...(price != null ? { value: price, currency: CURRENCY } : {}),
  });
}

export function trackAddToCart(input: {
  item_id: string;
  item_name: string;
  quantity: number;
  price?: number | null;
}) {
  const price = toNumber(input.price);
  const qty = Math.max(1, Math.floor(input.quantity || 1));
  const value = price != null ? price * qty : undefined;
  const items: AnalyticsItem[] = [
    {
      item_id: input.item_id,
      item_name: input.item_name,
      quantity: qty,
      price,
    },
  ];

  gtag("event", "add_to_cart", {
    currency: CURRENCY,
    value,
    items: gaItems(items),
  });

  fbq("track", "AddToCart", {
    content_ids: [input.item_id],
    content_name: input.item_name,
    content_type: "product",
    contents: metaContents(items),
    ...(value != null ? { value, currency: CURRENCY } : {}),
  });
}

export function trackBeginCheckout(input: {
  value: number;
  items: AnalyticsItem[];
}) {
  const value = toNumber(input.value) ?? 0;

  gtag("event", "begin_checkout", {
    currency: CURRENCY,
    value,
    items: gaItems(input.items),
  });

  fbq("track", "InitiateCheckout", {
    content_ids: input.items.map((i) => i.item_id),
    contents: metaContents(input.items),
    num_items: input.items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    value,
    currency: CURRENCY,
  });
}

export function trackPurchase(input: {
  transaction_id: string;
  value: number;
  items: AnalyticsItem[];
}) {
  const { googleAdsId, googleAdsLabel } = getAnalyticsConfig();
  const value = toNumber(input.value) ?? 0;

  gtag("event", "purchase", {
    transaction_id: input.transaction_id,
    currency: CURRENCY,
    value,
    items: gaItems(input.items),
  });

  if (googleAdsId && googleAdsLabel) {
    gtag("event", "conversion", {
      send_to: googleAdsSendTo(googleAdsId, googleAdsLabel),
      value,
      currency: CURRENCY,
      transaction_id: input.transaction_id,
    });
  }

  fbq("track", "Purchase", {
    content_ids: input.items.map((i) => i.item_id),
    contents: metaContents(input.items),
    content_type: "product",
    value,
    currency: CURRENCY,
  });
}
