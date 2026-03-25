import { useCallback, useEffect, useRef } from "react";

type FbPixelEventName = "ViewContent" | "AddToCart" | "Purchase" | "Lead";
type Ga4EventName =
  | "view_promotion"
  | "select_promotion"
  | "purchase"
  | "add_to_cart";

type ConsentCategory = "analytics" | "marketing";

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

interface PixelEventParams {
  campaignId: string;
  campaignName?: string;
  discountType?: string;
  discountValue?: number;
  productIds?: string[];
  value?: number;
  currency?: string;
  eventId?: string;
  coupon?: string;
  quantity?: number;
  productId?: string;
  orderId?: string;
  orderValue?: number;
  discountAmount?: number;
  marketingConsent?: boolean;
  analyticsConsent?: boolean;
  debounceMs?: number;
  eventSourceUrl?: string;
  testEventCode?: string;
}

interface AddToCartEventParams extends PixelEventParams {
  productId: string;
  quantity?: number;
}

interface PurchaseEventParams extends PixelEventParams {
  orderId: string;
  orderValue: number;
  discountAmount?: number;
}

interface ServerSideConversionParams extends PixelEventParams {
  userEmail?: string;
  userPhone?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  consentGranted?: boolean;
}

type Fbq = (...args: any[]) => void;
type Gtag = (...args: any[]) => void;

const CONSENT_STORAGE_KEY = "cookie_consent";
const DEFAULT_CURRENCY = "THB";
const DEFAULT_CREATIVE_SLOT = "promotion_banner";
const DEFAULT_EVENT_DEBOUNCE_MS = 500;
const VIEW_HOOK_DEBOUNCE_MS = 2000;
const MAX_RECENT_EVENTS = 200;

const recentEvents = new Map<string, number>();

const normalizeCurrency = (currency?: string) => currency || DEFAULT_CURRENCY;

const resolveDebounceMs = (eventName: string, override?: number) => {
  if (typeof override === "number" && !Number.isNaN(override)) {
    return Math.max(0, override);
  }
  return eventName.toLowerCase().includes("purchase")
    ? 0
    : DEFAULT_EVENT_DEBOUNCE_MS;
};

const dispatchWithDebounce = (
  eventKey: string,
  fn: () => void,
  debounceMs: number,
) => {
  if (debounceMs <= 0) {
    fn();
    return;
  }

  const now = Date.now();
  const last = recentEvents.get(eventKey);
  if (last && now - last < debounceMs) {
    return;
  }

  recentEvents.set(eventKey, now);
  if (recentEvents.size > MAX_RECENT_EVENTS) {
    const firstKey = recentEvents.keys().next().value;
    if (firstKey) {
      recentEvents.delete(firstKey);
    }
  }

  fn();
};

function getConsentState(): ConsentState {
  if (typeof window === "undefined") {
    return { analytics: false, marketing: false };
  }

  const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (!consent) {
    return { analytics: false, marketing: false };
  }

  try {
    const parsed = JSON.parse(consent);
    return {
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return { analytics: false, marketing: false };
  }
}

function hasConsent(category: ConsentCategory, override?: boolean): boolean {
  if (typeof override === "boolean") {
    return override;
  }

  const consent = getConsentState();
  return Boolean(consent[category]);
}

const getFbq = (): Fbq | null => {
  if (typeof window === "undefined") return null;
  const fbq = (window as any).fbq;
  return typeof fbq === "function" ? fbq : null;
};

const getGtag = (): Gtag | null => {
  if (typeof window === "undefined") return null;
  const gtag = (window as any).gtag;
  return typeof gtag === "function" ? gtag : null;
};

const buildGaItems = (params: PixelEventParams, ids?: string[]) => {
  const productIds =
    ids && ids.length > 0
      ? ids
      : params.productIds && params.productIds.length > 0
        ? params.productIds
        : [params.campaignId];

  return productIds.map((id) => ({
    item_id: id,
    promotion_id: params.campaignId,
    promotion_name: params.campaignName,
    creative_name: params.discountType,
    coupon: params.coupon ?? params.campaignId,
    discount: params.discountValue,
    quantity: params.quantity ?? 1,
  }));
};

/**
 * Fire Facebook Pixel event with consent and debounce protections.
 */
export function fireFBPixel(
  eventName: FbPixelEventName,
  params: PixelEventParams,
): void {
  if (!hasConsent("marketing", params.marketingConsent)) return;

  const fbq = getFbq();
  if (!fbq) {
    if (typeof window !== "undefined") {
      console.warn("Facebook Pixel not loaded");
    }
    return;
  }

  const productIds =
    params.productIds && params.productIds.length > 0
      ? params.productIds
      : [params.campaignId];
  const currency = normalizeCurrency(params.currency);

  const fbParams: Record<string, any> = {
    content_ids: productIds,
    content_type: "product",
    content_name: params.campaignName ?? params.campaignId,
    contents: productIds.map((id) => ({
      id,
      quantity: params.quantity ?? 1,
      item_price: params.value,
    })),
    value: params.value,
    currency,
    event_id: params.eventId,
    promotion_id: params.campaignId,
    promotion_name: params.campaignName,
    discount_type: params.discountType,
    discount_value: params.discountValue,
  };

  const debounceMs = resolveDebounceMs(eventName, params.debounceMs);
  dispatchWithDebounce(
    `fb:${eventName}:${params.campaignId}:${productIds.join(",")}`,
    () => fbq("track", eventName, fbParams),
    debounceMs,
  );
}

/**
 * Fire Google Analytics 4 event with consent and debounce protections.
 */
export function fireGA4Event(
  eventName: Ga4EventName,
  params: PixelEventParams,
): void {
  if (!hasConsent("analytics", params.analyticsConsent)) return;

  const gtag = getGtag();
  if (!gtag) {
    if (typeof window !== "undefined") {
      console.warn("Google Analytics not loaded");
    }
    return;
  }

  const currency = normalizeCurrency(params.currency);
  const payload: Record<string, any> = {
    promotion_id: params.campaignId,
    promotion_name: params.campaignName,
    creative_name: params.discountType,
    creative_slot: DEFAULT_CREATIVE_SLOT,
    value: params.value,
    currency,
    items: buildGaItems(params),
  };

  if (eventName === "purchase" && "orderId" in params) {
    const purchaseParams = params as PurchaseEventParams;
    payload.transaction_id = purchaseParams.orderId;
    payload.coupon = params.coupon ?? params.campaignId;
  }

  const debounceMs = resolveDebounceMs(eventName, params.debounceMs);
  dispatchWithDebounce(
    `ga:${eventName}:${params.campaignId}`,
    () => gtag("event", eventName, payload),
    debounceMs,
  );
}

export function trackPromotionView(params: PixelEventParams): void {
  fireFBPixel("ViewContent", params);
  fireGA4Event("view_promotion", params);
}

export function trackPromotionClick(params: PixelEventParams): void {
  fireFBPixel("Lead", params);
  fireGA4Event("select_promotion", params);
}

export function trackPromoAddToCart(
  params: AddToCartEventParams,
): void {
  const eventParams: PixelEventParams = {
    ...params,
    productIds: [params.productId],
  };

  fireFBPixel("AddToCart", eventParams);
  fireGA4Event("add_to_cart", {
    ...eventParams,
    value: params.value,
    quantity: params.quantity,
  });
}

export function trackPromoPurchase(
  params: PurchaseEventParams,
): void {
  const purchaseParams: PixelEventParams = {
    ...params,
    value: params.orderValue,
    productIds:
      params.productIds && params.productIds.length > 0
        ? params.productIds
        : [params.campaignId],
    currency: params.currency ?? DEFAULT_CURRENCY,
    coupon: params.coupon ?? params.campaignId,
    discountValue: params.discountAmount ?? params.discountValue,
  };

  fireFBPixel("Purchase", purchaseParams);
  fireGA4Event("purchase", purchaseParams);
}

export async function serverSideConversion(
  eventName: string,
  params: ServerSideConversionParams,
): Promise<void> {
  const marketingConsent =
    typeof params.consentGranted === "boolean"
      ? params.consentGranted
      : params.marketingConsent;

  if (!hasConsent("marketing", marketingConsent)) return;

  if (typeof window !== "undefined") {
    console.warn("serverSideConversion is intended for server-side use only");
    return;
  }

  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const accessToken = process.env.FB_CONVERSIONS_API_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn("Facebook Conversions API not configured");
    return;
  }

  if (!globalThis.crypto?.subtle) {
    console.warn("crypto.subtle is not available; cannot hash user data");
    return;
  }

  const hashData = async (data: string) => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data.toLowerCase().trim());
    const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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

  const productIds =
    params.productIds && params.productIds.length > 0
      ? params.productIds
      : [params.campaignId];

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: params.eventSourceUrl ?? process.env.NEXT_PUBLIC_APP_URL,
    event_id: params.eventId,
    user_data: userData,
    custom_data: {
      content_ids: productIds,
      content_type: "product",
      value: params.value,
      currency: normalizeCurrency(params.currency),
      promotion_id: params.campaignId,
      promotion_name: params.campaignName,
      discount_type: params.discountType,
      discount_value: params.discountValue,
    },
  };

  const payload = {
    data: [eventData],
    ...(params.testEventCode ? { test_event_code: params.testEventCode } : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      console.error("FB Conversions API error:", await response.text());
    }
  } catch (error) {
    console.error("FB Conversions API failed:", error);
  }
}

export function usePixelTracking(
  params: PixelEventParams | null,
  debounceMs: number = VIEW_HOOK_DEBOUNCE_MS,
) {
  const hasTracked = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hasTracked.current = false;
  }, [params?.campaignId]);

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
  }, [params, debounceMs]);

  const trackClick = useCallback(() => {
    if (params) {
      trackPromotionClick(params);
    }
  }, [params]);

  return { trackClick };
}
