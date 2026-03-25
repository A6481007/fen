// Centralized analytics service for Firebase event tracking

import { analytics } from "@/lib/firebase";
import { logEvent, Analytics } from "firebase/analytics";

// Types for event parameters
type AddToCartParams = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  userId?: string;
};

type RemoveFromCartParams = AddToCartParams;

type OrderPlacedParams = {
  orderId: string;
  amount: number;
  status: string;
  userId?: string;
};

type OrderStatusUpdateParams = {
  orderId: string;
  status: string;
  userId?: string;
};

type UserRegistrationParams = {
  userId: string;
  email: string;
};

type UserLoginParams = UserRegistrationParams;

type ProductViewParams = {
  productId: string;
  name: string;
  userId?: string;
};

// Segment-related analytics events
export interface SegmentEvent {
  event: "segment_resolved" | "segment_changed";
  userId?: string;
  sessionId: string;
  properties: {
    segment: string;
    previousSegment?: string;
    allSegments?: string[];
    segmentPriority: number;
    ordersCount: number;
    ltv: number;
    daysSinceLastPurchase?: number;
    trigger:
      | "page_load"
      | "login"
      | "purchase"
      | "cart_update"
      | "manual_refresh";
  };
}

// Helper to safely log events (no-op if analytics is not initialized)
export function trackEvent(
  eventName: string,
  eventParams: Record<
    string,
    string | number | boolean | undefined | unknown[]
  > = {}
) {
  if (typeof window !== "undefined" && analytics) {
    logEvent(analytics as Analytics, eventName, eventParams);
  } else {
    // Optionally, queue events or log to console in dev
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] ${eventName}`, eventParams);
    }
  }
}

type InsightKind = "knowledge" | "solutions";

const getAnalyticsBaseUrl = () =>
  (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

const sendServerAnalyticsEvent = (
  eventName: string,
  eventParams: Record<string, unknown>
) => {
  const payload = {
    eventName,
    eventParams,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      if (navigator?.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/analytics/track", blob);
        return;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Analytics] Failed to send beacon", error);
      }
    }

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
    return;
  }

  const baseUrl = getAnalyticsBaseUrl();
  if (!baseUrl) return;
  fetch(`${baseUrl}/api/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

export function trackInsightView(params: {
  insightId: string;
  kind: InsightKind;
  locale: string;
  title?: string;
}) {
  trackEvent("insight_view", params);
  sendServerAnalyticsEvent("insight_view", params);
}

export function trackInsightScrollDepth(params: {
  insightId: string;
  kind: InsightKind;
  locale: string;
  depth: number;
}) {
  trackEvent("scroll_depth", params);
  sendServerAnalyticsEvent("scroll_depth", params);
}

export function trackInsightReadComplete(params: {
  insightId: string;
  kind: InsightKind;
  locale: string;
  readTimeSeconds?: number;
}) {
  trackEvent("read_complete", params);
  sendServerAnalyticsEvent("read_complete", params);
}

export function trackInsightCtaClick(params: {
  insightId?: string;
  kind?: InsightKind;
  locale?: string;
  ctaType?: string;
  label?: string;
  href?: string;
  action?: string;
  [key: string]: unknown;
}) {
  trackEvent("cta_click", params);
  sendServerAnalyticsEvent("cta_click", params);
}

export function trackInsightSearchQuery(params: {
  query: string;
  kind?: InsightKind;
  locale?: string;
  resultCount?: number;
}) {
  trackEvent("search_query", params);
  sendServerAnalyticsEvent("search_query", params);
}

// E-commerce specific events
export function trackAddToCart(params: AddToCartParams) {
  trackEvent("add_to_cart", params);
}

export function trackRemoveFromCart(params: RemoveFromCartParams) {
  trackEvent("remove_from_cart", params);
}

export function trackOrderPlaced(params: OrderPlacedParams) {
  trackEvent("order_placed", params);
}

export function trackOrderStatusUpdate(params: OrderStatusUpdateParams) {
  trackEvent("order_status_update", params);
}

export function trackUserRegistration(params: UserRegistrationParams) {
  trackEvent("user_registration", params);
}

export function trackUserLogin(params: UserLoginParams) {
  trackEvent("user_login", params);
}

export function trackProductView(params: ProductViewParams) {
  trackEvent("view_product", params);
}

export function trackSegmentResolved(
  segment: string,
  metadata: {
    userId?: string;
    sessionId: string;
    allSegments?: string[];
    priority: number;
    ordersCount: number;
    ltv: number;
    daysSinceLastPurchase?: number;
    trigger: SegmentEvent["properties"]["trigger"];
  }
): void {
  const event: SegmentEvent = {
    event: "segment_resolved",
    userId: metadata.userId,
    sessionId: metadata.sessionId,
    properties: {
      segment,
      allSegments: metadata.allSegments,
      segmentPriority: metadata.priority,
      ordersCount: metadata.ordersCount,
      ltv: metadata.ltv,
      daysSinceLastPurchase: metadata.daysSinceLastPurchase,
      trigger: metadata.trigger,
    },
  };

  trackEvent("segment_resolved", event.properties);

  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(console.error);

  if (typeof window !== "undefined" && (window as any).mixpanel) {
    (window as any).mixpanel.track("Segment Resolved", event.properties);
  }

  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "segment_resolved", event.properties);
  }
}

export function trackSegmentChanged(
  previousSegment: string,
  newSegment: string,
  metadata: {
    userId?: string;
    sessionId: string;
    trigger: SegmentEvent["properties"]["trigger"];
  }
): void {
  const event: SegmentEvent = {
    event: "segment_changed",
    userId: metadata.userId,
    sessionId: metadata.sessionId,
    properties: {
      segment: newSegment,
      previousSegment,
      segmentPriority: 0,
      ordersCount: 0,
      ltv: 0,
      trigger: metadata.trigger,
    },
  };

  trackEvent("segment_changed", event.properties);

  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(console.error);
}

// Additional e-commerce tracking functions
const CART_VIEW_THROTTLE_KEY = "cart:viewed";

const shouldThrottleCartView = (force?: boolean): boolean => {
  if (force) return false;
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(CART_VIEW_THROTTLE_KEY)) {
      return true;
    }
    window.sessionStorage.setItem(CART_VIEW_THROTTLE_KEY, "1");
    return false;
  } catch {
    return false;
  }
};

export function trackCartView(
  payload?:
    | string
    | {
        userId?: string;
        itemCount?: number;
        cartValue?: number;
        promotionCount?: number;
        force?: boolean;
      }
) {
  if (typeof payload === "string" || payload === undefined) {
    if (shouldThrottleCartView(false)) return;
    trackEvent("view_cart", { userId: payload });
    return;
  }

  const { force, ...eventPayload } = payload;
  if (shouldThrottleCartView(force)) return;
  trackEvent("view_cart", eventPayload);
}

export function trackCheckoutStarted(params: {
  userId?: string;
  cartValue: number;
  itemCount: number;
}) {
  trackEvent("begin_checkout", params);
}

export function trackSearchPerformed(params: {
  searchTerm: string;
  userId?: string;
  resultCount?: number;
}) {
  trackEvent("search", params);
}

export function trackCategoryView(params: {
  categoryId: string;
  categoryName: string;
  userId?: string;
}) {
  trackEvent("view_category", params);
}

export function trackWishlistAdd(params: {
  productId: string;
  name: string;
  userId?: string;
}) {
  trackEvent("add_to_wishlist", params);
}

export function trackWishlistRemove(params: {
  productId: string;
  name: string;
  userId?: string;
}) {
  trackEvent("remove_from_wishlist", params);
}

export function trackPageView(params: {
  pagePath: string;
  pageTitle?: string;
  userId?: string;
}) {
  trackEvent("page_view", params);
}

// Advanced e-commerce tracking
export function trackPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: Array<{
    productId: string;
    name: string;
    category?: string;
    quantity: number;
    price: number;
  }>;
  userId?: string;
}) {
  trackEvent("purchase", params);
}

export function trackBestSellingProducts(params: {
  products: Array<{
    productId: string;
    name: string;
    category?: string;
    salesCount: number;
    revenue: number;
  }>;
  timeframe: string; // e.g., "weekly", "monthly"
}) {
  trackEvent("best_selling_products", params);
}

export function trackOrderDetails(params: {
  orderId: string;
  orderNumber: string;
  status: string;
  value: number;
  itemCount: number;
  paymentMethod: string;
  shippingMethod?: string;
  userId?: string;
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}) {
  trackEvent("order_details", params);
}

export function trackOrderFullfillment(params: {
  orderId: string;
  status: string;
  previousStatus: string;
  value: number;
  fulfillmentTime?: number; // in hours/days
  userId?: string;
}) {
  trackEvent("order_fulfillment", params);
}

export function trackInventoryAction(params: {
  productId: string;
  name: string;
  action: "restock" | "low_stock" | "out_of_stock";
  currentStock: number;
  previousStock?: number;
}) {
  trackEvent("inventory_action", params);
}

/**
 * Track customer lifetime analytics
 */
export function trackCustomerLifetime(
  userId: string,
  totalSpent: number,
  orderCount: number,
  avgOrderValue: number
) {
  if (typeof window !== "undefined" && analytics) {
    logEvent(analytics, "customer_lifetime_value", {
      user_id: userId,
      total_spent: totalSpent,
      order_count: orderCount,
      average_order_value: avgOrderValue,
      ltv_segment:
        totalSpent > 1000
          ? "high_value"
          : totalSpent > 500
          ? "medium_value"
          : "low_value",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track product search events
 */
export function trackProductSearch(
  searchTerm: string,
  resultsCount: number,
  category?: string,
  filters?: Record<string, string | number | boolean>
) {
  if (typeof window !== "undefined" && analytics) {
    logEvent(analytics, "search", {
      search_term: searchTerm,
      results_count: resultsCount,
      category: category || "all",
      filters: JSON.stringify(filters || {}),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track category view events with enhanced data
 */
export function trackCategoryViewEnhanced(
  categoryName: string,
  categoryId: string,
  productCount: number
) {
  if (typeof window !== "undefined" && analytics) {
    logEvent(analytics, "view_item_list", {
      item_list_id: categoryId,
      item_list_name: categoryName,
      items_count: productCount,
      list_type: "category",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track enhanced user registration events
 */
export function trackUserRegistrationEnhanced(
  userId: string,
  registrationMethod: "email" | "google" | "facebook" | "other"
) {
  if (typeof window !== "undefined" && analytics) {
    logEvent(analytics, "sign_up", {
      method: registrationMethod,
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track enhanced user login events
 */
export function trackUserLoginEnhanced(
  userId: string,
  loginMethod: "email" | "google" | "facebook" | "other"
) {
  if (typeof window !== "undefined" && analytics) {
    logEvent(analytics, "login", {
      method: loginMethod,
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Add more as needed for your analytics needs
