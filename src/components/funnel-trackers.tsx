"use client";

import { useEffect, useRef } from "react";
import { trackViewItem, trackBeginCheckout, type AnalyticsItem } from "@/lib/analytics";

export function ViewItemTracker({
  itemId,
  itemName,
  price,
  itemCategory,
}: {
  itemId: string;
  itemName: string;
  price?: number | null;
  itemCategory?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackViewItem({
      item_id: itemId,
      item_name: itemName,
      price,
      item_category: itemCategory,
    });
  }, [itemId, itemName, price, itemCategory]);

  return null;
}

export function BeginCheckoutTracker({
  value,
  items,
}: {
  value: number;
  items: AnalyticsItem[];
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackBeginCheckout({ value, items });
  }, [value, items]);

  return null;
}
