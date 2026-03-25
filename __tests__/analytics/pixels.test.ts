import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fireFBPixel,
  fireGA4Event,
  serverSideConversion,
  trackPromotionView,
  trackPromoAddToCart,
  trackPromoPurchase,
  usePixelTracking,
} from "@/lib/analytics/pixels";

const setConsent = (consent: { analytics?: boolean; marketing?: boolean }) => {
  localStorage.setItem(
    "cookie_consent",
    JSON.stringify({ analytics: false, marketing: false, ...consent }),
  );
};

describe("analytics/pixels", () => {
  beforeEach(() => {
    localStorage.clear();
    (window as any).fbq = vi.fn();
    (window as any).gtag = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("skips Facebook pixel when marketing consent is denied", () => {
    setConsent({ analytics: true, marketing: false });

    fireFBPixel("ViewContent", { campaignId: "camp-1" });

    expect((window as any).fbq).not.toHaveBeenCalled();
  });

  it("respects analytics consent for GA4 events", () => {
    setConsent({ analytics: false, marketing: true });

    fireGA4Event("view_promotion", { campaignId: "camp-ga" });

    expect((window as any).gtag).not.toHaveBeenCalled();
  });

  it("fires FB and GA events when consent is granted", () => {
    setConsent({ analytics: true, marketing: true });

    trackPromotionView({
      campaignId: "camp-2",
      campaignName: "Winter Sale",
      productIds: ["sku-1", "sku-2"],
      discountType: "percentage",
      discountValue: 10,
      value: 25,
      currency: "USD",
    });

    expect((window as any).fbq).toHaveBeenCalledWith(
      "track",
      "ViewContent",
      expect.objectContaining({
        content_ids: ["sku-1", "sku-2"],
        promotion_id: "camp-2",
        discount_value: 10,
      }),
    );

    expect((window as any).gtag).toHaveBeenCalledWith(
      "event",
      "view_promotion",
      expect.objectContaining({
        promotion_id: "camp-2",
        promotion_name: "Winter Sale",
        items: expect.arrayContaining([
          expect.objectContaining({ item_id: "sku-1" }),
          expect.objectContaining({ item_id: "sku-2" }),
        ]),
      }),
    );
  });

  it("debounces rapid duplicate view events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    setConsent({ analytics: true, marketing: true });

    trackPromotionView({ campaignId: "camp-3" });
    trackPromotionView({ campaignId: "camp-3" });

    expect((window as any).fbq).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2025-01-01T00:00:01Z"));
    trackPromotionView({ campaignId: "camp-3" });

    expect((window as any).fbq).toHaveBeenCalledTimes(2);
  });

  it("sends add to cart payloads with product context", () => {
    setConsent({ analytics: true, marketing: true });

    trackPromoAddToCart({
      campaignId: "camp-6",
      productId: "sku-add",
      value: 12,
      currency: "USD",
    });

    expect((window as any).gtag).toHaveBeenCalledWith(
      "event",
      "add_to_cart",
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ item_id: "sku-add" }),
        ]),
      }),
    );
  });

  it("sends purchase payloads with order identifiers", () => {
    setConsent({ analytics: true, marketing: true });

    trackPromoPurchase({
      campaignId: "camp-7",
      orderId: "order-1",
      orderValue: 42,
      discountAmount: 5,
      productIds: ["sku-7"],
    });

    expect((window as any).gtag).toHaveBeenCalledWith(
      "event",
      "purchase",
      expect.objectContaining({
        transaction_id: "order-1",
        value: 42,
        coupon: "camp-7",
      }),
    );
  });

  it("tracks promotion view via hook after debounce and exposes click tracker", () => {
    vi.useFakeTimers();
    setConsent({ analytics: true, marketing: true });

    const params = { campaignId: "camp-4", campaignName: "Hook Promo" };
    const { result } = renderHook(({ data }) => usePixelTracking(data, 300), {
      initialProps: { data: params },
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect((window as any).fbq).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect((window as any).fbq).toHaveBeenCalledWith(
      "track",
      "ViewContent",
      expect.objectContaining({ promotion_id: "camp-4" }),
    );

    act(() => {
      result.current.trackClick();
    });

    expect((window as any).fbq).toHaveBeenCalledWith(
      "track",
      "Lead",
      expect.objectContaining({ promotion_id: "camp-4" }),
    );
  });

  it("sends server-side conversion payloads with hashed identifiers", async () => {
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = undefined;
    process.env.NEXT_PUBLIC_FB_PIXEL_ID = "pixel-123";
    process.env.FB_CONVERSIONS_API_TOKEN = "token-abc";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, text: async () => "" } as any);

    try {
      await serverSideConversion("Purchase", {
        campaignId: "camp-5",
        productIds: ["prod-1"],
        value: 100,
        currency: "USD",
        userEmail: "Example@Test.com",
        consentGranted: true,
        eventId: "evt-1",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, requestInit] = fetchMock.mock.calls[0];
      const body = JSON.parse((requestInit as any).body as string);
      const event = body.data[0];

      expect(event.event_name).toBe("Purchase");
      expect(event.user_data.em).toHaveLength(64);
      expect(event.custom_data.content_ids).toEqual(["prod-1"]);
      expect(event.event_id).toBe("evt-1");
    } finally {
      (globalThis as any).window = originalWindow;
      fetchMock.mockRestore();
    }
  });
});
