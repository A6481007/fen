"use client";

import { useCallback } from "react";

import DealGrid, { type Deal } from "./DealGrid";
import { trackEvent } from "@/lib/analytics";

interface FeaturedDealsClientProps {
  deals: Deal[];
}

const sendDealImpression = (payload: Record<string, unknown>) => {
  try {
    const body = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[deal-impression] Failed to send beacon", error);
    }
  }
};

export function FeaturedDealsClient({ deals }: FeaturedDealsClientProps) {
  const handleImpression = useCallback((deal: Deal) => {
    const productId = (deal.product as { _id?: string | null })?._id ?? null;
    const dealId = deal.dealId || productId;

    if (!dealId) return;

    const payload = {
      event: "deal_impression",
      dealId,
      dealType: deal.dealType ?? undefined,
      title: deal.title ?? deal.product?.name ?? undefined,
      productId: productId ?? undefined,
      source: "deal-page",
    };

    trackEvent("deal_impression", payload);
    sendDealImpression(payload);
  }, []);

  return (
    <DealGrid
      deals={deals}
      columns={4}
      showAddToCart
      onDealImpression={handleImpression}
      emptyMessage="No featured deals live right now."
    />
  );
}

export default FeaturedDealsClient;
