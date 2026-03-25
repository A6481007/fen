"use client";

import { useCallback, useEffect, useRef } from "react";

// Types
interface PixelEventParams {
  campaignId: string;
  campaignName?: string;
  discountType?: string;
  discountValue?: number;
  productIds?: string[];
  value?: number;
  currency?: string;
}

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

// Consent check (implement based on your consent management)
function getConsentState(): ConsentState {
  if (typeof window === "undefined") {
    return { analytics: false, marketing: false };
  }

  // Example: Read from cookie or consent management platform
  const consent = localStorage.getItem("cookie_consent");
  if (!consent) {
    return { analytics: false, marketing: false };
  }

  try {
    return JSON.parse(consent);
  } catch {
    return { analytics: false, marketing: false };
  }
}

/**
 * Fire Facebook Pixel event
 */
export function fireFBPixel(
  eventName: "ViewContent" | "AddToCart" | "Purchase" | "Lead",
  params: PixelEventParams,
): void {
  const consent = getConsentState();
  if (!consent.marketing) return;

  if (typeof window === "undefined" || !(window as any).fbq) {
    console.warn("Facebook Pixel not loaded");
    return;
  }

  const fbParams: Record<string, any> = {
    content_ids: params.productIds || [params.campaignId],
    content_type: "product",
    content_name: params.campaignName,
  };

  if (params.value) {
    fbParams.value = params.value;
    fbParams.currency = params.currency || "USD";
  }

  // Add custom data
  fbParams.promotion_id = params.campaignId;
  fbParams.discount_type = params.discountType;
  fbParams.discount_value = params.discountValue;

  (window as any).fbq("track", eventName, fbParams);
}

/**
 * Fire Google Analytics 4 event
 */
export function fireGA4Event(
  eventName: "view_promotion" | "select_promotion" | "purchase",
  params: PixelEventParams,
): void {
  const consent = getConsentState();
  if (!consent.analytics) return;

  if (typeof window === "undefined" || !(window as any).gtag) {
    console.warn("Google Analytics not loaded");
    return;
  }

  const gaParams: Record<string, any> = {
    promotion_id: params.campaignId,
    promotion_name: params.campaignName,
    creative_name: params.discountType,
    creative_slot: "promotion_banner",
  };

  if (params.productIds) {
    gaParams.items = params.productIds.map((id) => ({
      item_id: id,
      promotion_id: params.campaignId,
      promotion_name: params.campaignName,
    }));
  }

  if (params.value) {
    gaParams.value = params.value;
    gaParams.currency = params.currency || "USD";
  }

  (window as any).gtag("event", eventName, gaParams);
}

/**
 * Fire promotion view event to all pixels
 */
export function trackPromotionView(params: PixelEventParams): void {
  fireFBPixel("ViewContent", params);
  fireGA4Event("view_promotion", params);
}

/**
 * Fire promotion click/select event to all pixels
 */
export function trackPromotionClick(params: PixelEventParams): void {
  fireFBPixel("Lead", params);
  fireGA4Event("select_promotion", params);
}

/**
 * Fire add to cart with promotion context
 */
export function trackPromoAddToCart(
  params: PixelEventParams & { productId: string },
): void {
  fireFBPixel("AddToCart", {
    ...params,
    productIds: [params.productId],
  });

  // GA4 add_to_cart event
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "add_to_cart", {
      currency: params.currency || "USD",
      value: params.value,
      items: [
        {
          item_id: params.productId,
          promotion_id: params.campaignId,
          promotion_name: params.campaignName,
          discount: params.discountValue,
        },
      ],
    });
  }
}

/**
 * Fire purchase event with promotion attribution
 */
export function trackPromoPurchase(
  params: PixelEventParams & {
    orderId: string;
    orderValue: number;
    discountAmount: number;
  },
): void {
  fireFBPixel("Purchase", {
    ...params,
    value: params.orderValue,
  });

  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "purchase", {
      transaction_id: params.orderId,
      value: params.orderValue,
      currency: params.currency || "USD",
      coupon: params.campaignId,
      items: params.productIds?.map((id) => ({
        item_id: id,
        promotion_id: params.campaignId,
        promotion_name: params.campaignName,
        discount: params.discountAmount,
      })),
    });
  }
}

/**
 * Hook for automatic promotion view tracking with debounce
 */
export function usePixelTracking(
  params: PixelEventParams | null,
  debounceMs: number = 2000,
) {
  const hasTracked = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!params || hasTracked.current) return;

    timeoutRef.current = setTimeout(() => {
      trackPromotionView(params);
      hasTracked.current = true;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [params?.campaignId, debounceMs]);

  const trackClick = useCallback(() => {
    if (params) {
      trackPromotionClick(params);
    }
  }, [params]);

  return { trackClick };
}

/**
 * Server-side conversion tracking (for Facebook Conversions API)
 */
export async function serverSideConversion(
  eventName: string,
  params: PixelEventParams & {
    userEmail?: string;
    userPhone?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbc?: string; // Facebook click ID
    fbp?: string; // Facebook browser ID
  },
): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const accessToken = process.env.FB_CONVERSIONS_API_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn("Facebook Conversions API not configured");
    return;
  }

  // Hash PII for privacy
  const hashData = async (data: string) => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const userData: Record<string, string> = {};
  if (params.userEmail) userData.em = await hashData(params.userEmail);
  if (params.userPhone) userData.ph = await hashData(params.userPhone);
  if (params.clientIpAddress)
    userData.client_ip_address = params.clientIpAddress;
  if (params.clientUserAgent)
    userData.client_user_agent = params.clientUserAgent;
  if (params.fbc) userData.fbc = params.fbc;
  if (params.fbp) userData.fbp = params.fbp;

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: process.env.NEXT_PUBLIC_APP_URL,
    user_data: userData,
    custom_data: {
      content_ids: params.productIds || [params.campaignId],
      content_type: "product",
      value: params.value,
      currency: params.currency || "USD",
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [eventData] }),
      },
    );

    if (!response.ok) {
      console.error("FB Conversions API error:", await response.text());
    }
  } catch (error) {
    console.error("FB Conversions API failed:", error);
  }
}
