"use client";

import { useEffect, useRef } from "react";
import { trackPurchase, type AnalyticsItem } from "@/lib/analytics";

const storageKey = (idVenta: number) => `oc_purchase_${idVenta}`;

export function PurchaseTracker({
  idVenta,
  total,
  items,
  pagoAprobado,
}: {
  idVenta: number;
  total: number;
  items: AnalyticsItem[];
  pagoAprobado: boolean;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (!pagoAprobado || !idVenta || sent.current) return;

    try {
      if (sessionStorage.getItem(storageKey(idVenta))) {
        sent.current = true;
        return;
      }
    } catch {
      // ignore
    }

    sent.current = true;
    trackPurchase({
      transaction_id: String(idVenta),
      value: total,
      items,
    });

    try {
      sessionStorage.setItem(storageKey(idVenta), "1");
    } catch {
      // ignore
    }
  }, [idVenta, total, items, pagoAprobado]);

  return null;
}
