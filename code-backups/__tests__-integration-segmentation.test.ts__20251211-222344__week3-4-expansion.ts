import React, { useEffect } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { PromotionEngine } from "@/lib/promotions/promotionEngine";
import { mockPromotion, mockContext } from "@/__mocks__/promotionsMock";
import useCartStore from "@/store";
import { useSegment } from "@/hooks/useSegment";
import { useSegmentTracking } from "@/hooks/useSegmentTracking";
import type { UserSegmentData } from "@/lib/segmentation/rules";

const analyticsSpies = vi.hoisted(() => ({
  trackSegmentResolved: vi.fn(),
  trackSegmentChanged: vi.fn(),
}));

vi.mock("@/lib/analytics", () => analyticsSpies);
vi.mock("@/sanity/queries", () => ({
  getActivePromotions: vi.fn().mockResolvedValue([]),
}));

const { trackSegmentResolved, trackSegmentChanged } = analyticsSpies;

type FetchMock = ReturnType<typeof vi.fn>;

const randomUUIDMock = vi.fn(() => "session-123");

const resetStore = () => {
  useCartStore.setState({
    items: [],
    lastCartUpdatedAt: null,
    hasCheckoutStarted: false,
    checkoutStartedAt: null,
    isAbandoned: false,
    abandonmentStatus: "none",
    user: null,
    segment: null,
    segmentData: null,
    segmentLastCalculated: null,
    favoriteProduct: [],
    isPlacingOrder: false,
    orderStep: "validating",
  });

  useCartStore.persist?.clearStorage?.();
};

const buildSegmentPayload = (overrides: Partial<UserSegmentData> = {}): UserSegmentData => ({
  ordersCount: 0,
  ltv: 0,
  lastPurchaseAt: null,
  abandonedCarts: 0,
  lastCartAbandonedAt: null,
  lastCartValue: null,
  accountCreatedAt: new Date(),
  emailVerified: false,
  isSubscriber: false,
  ...overrides,
});

beforeAll(() => {
  const globalCrypto = globalThis.crypto as Crypto | undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    vi.spyOn(globalCrypto, "randomUUID").mockImplementation(randomUUIDMock);
  } else {
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: randomUUIDMock },
      configurable: true,
    });
  }
});

beforeEach(() => {
  resetStore();
  trackSegmentResolved.mockClear();
  trackSegmentChanged.mockClear();
  randomUUIDMock.mockClear();
  sessionStorage.clear();
  localStorage.clear();
  (global.fetch as unknown as FetchMock) = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Segmentation Integration", () => {
  describe("Segment Resolution Flow", () => {
    it("resolves segment on page load for authenticated user", async () => {
      const userId = "user-42";
      useCartStore.getState().setUser({ id: userId });

      const payload = buildSegmentPayload({
        ordersCount: 6,
        ltv: 1200,
        lastPurchaseAt: new Date(),
        emailVerified: true,
        isSubscriber: true,
      });

      (global.fetch as unknown as FetchMock).mockResolvedValue({
        ok: true,
        json: async () => payload,
      } as Response);

      const { result } = renderHook(() => {
        useSegmentTracking();
        return useSegment();
      });

      await act(async () => {
        await result.current.refreshSegment();
      });

      await waitFor(() => {
        expect(result.current.segment).toBe("vip");
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/user/segment-data?userId=${userId}`
      );

      await waitFor(() => {
        expect(trackSegmentResolved).toHaveBeenCalledWith(
          "vip",
          expect.objectContaining({
            sessionId: "session-123",
            ordersCount: payload.ordersCount,
            ltv: payload.ltv,
            trigger: "page_load",
          })
        );
      });
    });

    it("resolves segment for anonymous user based on session", async () => {
      const anonymousData = buildSegmentPayload();

      const { result } = renderHook(() => {
        useSegmentTracking();
        useEffect(() => {
          useCartStore.getState().setSegmentData(anonymousData);
        }, []);
        return useSegment();
      });

      await waitFor(() => {
        expect(result.current.segment).toBe("firstTime");
      });

      expect(sessionStorage.getItem("session_id")).toBe("session-123");
      expect(trackSegmentResolved).toHaveBeenCalledWith(
        "firstTime",
        expect.objectContaining({
          sessionId: "session-123",
          trigger: "page_load",
        })
      );
    });

    it("updates segment after purchase", async () => {
      const userId = "shopper-1";
      const firstTimeData = buildSegmentPayload({
        ordersCount: 0,
        lastPurchaseAt: null,
      });
      const returningData = buildSegmentPayload({
        ordersCount: 1,
        lastPurchaseAt: new Date(),
      });

      useCartStore.getState().setUser({ id: userId });
      useCartStore.getState().setSegmentData(firstTimeData);

      (global.fetch as unknown as FetchMock).mockResolvedValue({
        ok: true,
        json: async () => returningData,
      } as Response);

      const { result } = renderHook(() => {
        useSegmentTracking();
        return useSegment();
      });

      await waitFor(() => {
        expect(trackSegmentResolved).toHaveBeenCalledWith(
          "firstTime",
          expect.any(Object)
        );
      });

      await act(async () => {
        useCartStore.getState().markCheckoutCompleted();
      });

      await waitFor(() => {
        expect(result.current.segment).toBe("returning");
      });

      expect(trackSegmentChanged).toHaveBeenCalledWith(
        "firstTime",
        "returning",
        expect.objectContaining({
          sessionId: "session-123",
          trigger: "cart_update",
        })
      );
    });
  });

  describe("Segment-Based Eligibility", () => {
    it("shows VIP promotion only to VIP users", () => {
      const engine = new PromotionEngine();
      const promo = mockPromotion({
        targetAudience: { segmentType: "vip", categories: [], products: [], excludedProducts: [] },
      });

      const vipUser = {
        id: "vip-1",
        ordersCount: 6,
        ltv: 1000,
        lastPurchaseAt: new Date(),
      };
      const returningUser = {
        id: "ret-1",
        ordersCount: 2,
        ltv: 150,
        lastPurchaseAt: new Date(),
      };

      const vipResult = engine.checkEligibility(promo as any, vipUser as any, mockContext());
      const returningResult = engine.checkEligibility(
        promo as any,
        returningUser as any,
        mockContext()
      );

      expect(vipResult.eligible).toBe(true);
      expect(returningResult.eligible).toBe(false);
      expect(returningResult.requirementsMissing).toContain("User segment not eligible");
    });

    it("shows firstTime promotion only to new users", () => {
      const engine = new PromotionEngine();
      const promo = mockPromotion({
        targetAudience: { segmentType: "firstTime", categories: [], products: [], excludedProducts: [] },
      });

      const firstTimer = {
        id: "new-1",
        ordersCount: 0,
        ltv: 0,
        lastPurchaseAt: null,
      };
      const returningUser = {
        id: "ret-2",
        ordersCount: 2,
        ltv: 200,
        lastPurchaseAt: new Date(),
      };

      const firstTimeResult = engine.checkEligibility(
        promo as any,
        firstTimer as any,
        mockContext({ isFirstVisit: true })
      );
      const returningResult = engine.checkEligibility(
        promo as any,
        returningUser as any,
        mockContext()
      );

      expect(firstTimeResult.eligible).toBe(true);
      expect(returningResult.eligible).toBe(false);
    });

    it("shows cartAbandoner promotion when cart abandoned", () => {
      const engine = new PromotionEngine();
      const promo = mockPromotion({
        targetAudience: {
          segmentType: "cartAbandoner",
          cartAbandonmentThreshold: 1,
          categories: [],
          products: [],
          excludedProducts: [],
        },
      });

      const abandonedUser = {
        id: "abandoned-1",
        ordersCount: 1,
        ltv: 120,
        lastPurchaseAt: new Date(),
        lastAbandonedCartAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lastAbandonedCartValue: 180,
      };
      const activeUser = {
        id: "active-1",
        ordersCount: 2,
        ltv: 200,
        lastPurchaseAt: new Date(),
        lastAbandonedCartAt: null,
        lastAbandonedCartValue: 0,
      };

      const abandonedResult = engine.checkEligibility(
        promo as any,
        abandonedUser as any,
        mockContext({ sessionData: { lastAbandonedCartAt: abandonedUser.lastAbandonedCartAt! } })
      );
      const activeResult = engine.checkEligibility(
        promo as any,
        activeUser as any,
        mockContext()
      );

      expect(abandonedResult.eligible).toBe(true);
      expect(activeResult.eligible).toBe(false);
    });
  });

  describe("Segment Persistence", () => {
    it("persists segment in Zustand store", () => {
      const vipData = buildSegmentPayload({
        ordersCount: 7,
        ltv: 900,
        lastPurchaseAt: new Date(),
      });

      useCartStore.getState().setSegmentData(vipData);

      const state = useCartStore.getState();
      expect(state.segment).toBe("vip");

      const persisted = localStorage.getItem("cart-store");
      expect(persisted).toBeTruthy();
      const parsed = persisted ? JSON.parse(persisted) : null;
      expect(parsed?.state?.segment).toBe("vip");
    });

    it("refreshes segment from API when requested", async () => {
      const userId = "refresh-1";
      useCartStore.getState().setUser({ id: userId });

      const payload = buildSegmentPayload({
        ordersCount: 2,
        ltv: 150,
        lastPurchaseAt: new Date(),
      });

      (global.fetch as unknown as FetchMock).mockResolvedValue({
        ok: true,
        json: async () => payload,
      } as Response);

      await act(async () => {
        await useCartStore.getState().refreshSegment();
      });

      const state = useCartStore.getState();
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/user/segment-data?userId=${userId}`
      );
      expect(state.segment).toBe("returning");
      expect(state.segmentData?.ordersCount).toBe(2);
    });
  });
});
