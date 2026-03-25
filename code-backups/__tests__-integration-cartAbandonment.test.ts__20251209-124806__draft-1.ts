import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCartAbandonmentSync } from "@/hooks/useCartAbandonmentSync";
import useCartStore from "@/store";
import type { Product } from "@/sanity.types";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "user-123" } },
    status: "authenticated",
  })),
}));

type FetchMock = ReturnType<typeof vi.fn>;

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;
const SYNC_DEBOUNCE_MS = 5000;

const buildProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    _id: "prod-1",
    name: "Test Product",
    price: 25,
    images: [],
    ...overrides,
  } as unknown as Product);

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
  sessionStorage.clear();
  localStorage.clear();
};

const createResponse = (data: unknown): Response =>
  ({
    ok: true,
    json: async () => data,
  } as unknown as Response);

describe("Cart Abandonment Integration", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    resetStore();

    fetchMock = vi.fn(async () => createResponse({ abandonmentId: "abandon-123", action: "created" })) as unknown as FetchMock;
    (global.fetch as unknown as FetchMock) = fetchMock;

    (navigator as any).sendBeacon = vi.fn(() => true);
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    resetStore();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  describe("Abandonment Detection", () => {
    it("marks cart as at_risk after 15 minutes of inactivity", async () => {
      const product = buildProduct({ _id: "prod-risk" });

      act(() => {
        useCartStore.getState().addItem(product);
      });

      await act(async () => {
        vi.advanceTimersByTime(FIFTEEN_MINUTES);
      });

      act(() => {
        useCartStore.getState().checkAbandonmentStatus();
      });

      expect(useCartStore.getState().abandonmentStatus).toBe("at_risk");
      expect(useCartStore.getState().isAbandoned).toBe(false);
    });

    it("marks cart as abandoned after 30 minutes of inactivity", async () => {
      const product = buildProduct({ _id: "prod-abandon" });

      act(() => {
        useCartStore.getState().addItem(product);
      });

      await act(async () => {
        vi.advanceTimersByTime(THIRTY_MINUTES);
      });

      act(() => {
        useCartStore.getState().checkAbandonmentStatus();
      });

      expect(useCartStore.getState().abandonmentStatus).toBe("abandoned");
      expect(useCartStore.getState().isAbandoned).toBe(true);
    });

    it("resets abandonment status on cart update", async () => {
      const product = buildProduct({ _id: "prod-reset" });

      act(() => {
        useCartStore.getState().addItem(product);
      });

      await act(async () => {
        vi.advanceTimersByTime(FIFTEEN_MINUTES);
      });

      act(() => {
        useCartStore.getState().checkAbandonmentStatus();
      });

      expect(useCartStore.getState().abandonmentStatus).toBe("at_risk");

      act(() => {
        useCartStore.getState().resetAbandonmentTracking();
        useCartStore.getState().updateCartItem(product._id, { quantity: 2 });
      });

      expect(useCartStore.getState().abandonmentStatus).toBe("none");
      expect(useCartStore.getState().isAbandoned).toBe(false);
    });

    it("marks as recovered on checkout completion", () => {
      const product = buildProduct({ _id: "prod-recover" });

      act(() => {
        useCartStore.getState().addItem(product);
        useCartStore.getState().markCheckoutAbandoned();
      });

      act(() => {
        useCartStore.getState().markCheckoutCompleted();
      });

      expect(useCartStore.getState().abandonmentStatus).toBe("recovered");
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(useCartStore.getState().isAbandoned).toBe(false);
    });
  });

  describe("API Sync", () => {
    it("creates abandonment record in Firestore", async () => {
      const createdPayloads: unknown[] = [];

      fetchMock.mockImplementation(async (_url, options: RequestInit = {}) => {
        const body = options.body ? JSON.parse(options.body as string) : null;
        if (options.method === "POST") {
          createdPayloads.push(body);
        }
        return createResponse({ abandonmentId: "abandon-sync-1", action: "created" });
      });

      const { unmount } = renderHook(() => useCartAbandonmentSync());

      act(() => {
        useCartStore.getState().addItem(buildProduct({ _id: "prod-sync" }));
      });

      await act(async () => {
        vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/cart-abandonment",
          expect.objectContaining({ method: "POST" })
        );
      });

      expect(createdPayloads).toHaveLength(1);
      const payload = createdPayloads[0] as { items?: Array<{ productId: string }> };
      expect(payload?.items?.[0]?.productId).toBe("prod-sync");

      unmount();
    });

    it("updates existing abandonment on cart change", async () => {
      const actions: string[] = [];

      fetchMock.mockImplementation(async (_url, options: RequestInit = {}) => {
        const method = options.method ?? "GET";
        if (method === "POST") {
          const action = actions.length === 0 ? "created" : "updated";
          actions.push(action);
          return createResponse({ abandonmentId: "abandon-sync-2", action });
        }
        return createResponse({});
      });

      const { unmount } = renderHook(() => useCartAbandonmentSync());

      act(() => {
        useCartStore.getState().addItem(buildProduct({ _id: "prod-update" }));
      });

      await act(async () => {
        vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
      });

      act(() => {
        useCartStore.getState().updateCartItem("prod-update", { quantity: 3 });
      });

      await act(async () => {
        vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
      });

      const postCalls = fetchMock.mock.calls.filter(([, opts]) => (opts as RequestInit)?.method === "POST");
      expect(postCalls).toHaveLength(2);
      expect(actions).toEqual(["created", "updated"]);

      const updatedBody = postCalls[1]?.[1] as RequestInit;
      const parsed = updatedBody?.body ? JSON.parse(updatedBody.body as string) : null;
      expect(parsed?.items?.[0]?.quantity).toBe(3);

      unmount();
    });

    it("marks abandonment recovered via API on checkout", async () => {
      const patchPayloads: Array<Record<string, unknown>> = [];

      fetchMock.mockImplementation(async (_url, options: RequestInit = {}) => {
        const method = options.method ?? "GET";
        const body = options.body ? JSON.parse(options.body as string) : null;

        if (method === "POST") {
          return createResponse({ abandonmentId: "abandon-sync-3", action: "created" });
        }

        if (method === "PATCH") {
          patchPayloads.push(body ?? {});
          return createResponse({
            abandonmentId: body?.abandonmentId,
            status: body?.status,
            orderId: body?.orderId,
          });
        }

        return createResponse({});
      });

      const { result, unmount } = renderHook(() => useCartAbandonmentSync());

      act(() => {
        useCartStore.getState().addItem(buildProduct({ _id: "prod-recover-api" }));
      });

      await act(async () => {
        vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/cart-abandonment",
          expect.objectContaining({ method: "POST" })
        );
      });

      await act(async () => {
        await result.current.markRecovered("order-99", "promo-7");
      });

      expect(patchPayloads).toHaveLength(1);
      expect(patchPayloads[0]).toMatchObject({
        abandonmentId: "abandon-sync-3",
        status: "recovered",
        orderId: "order-99",
        recoveryPromotionApplied: "promo-7",
      });

      unmount();
    });

    it("uses sendBeacon on page unload", () => {
      const sendBeaconSpy = navigator.sendBeacon as unknown as FetchMock;
      const { unmount } = renderHook(() => useCartAbandonmentSync());

      act(() => {
        useCartStore.getState().addItem(buildProduct({ _id: "prod-beacon" }));
      });

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(sendBeaconSpy).toHaveBeenCalled();
      const [url, payload] = sendBeaconSpy.mock.calls[0] ?? [];
      expect(url).toBe("/api/cart-abandonment");
      expect(typeof payload).toBe("string");

      unmount();
    });
  });

  describe("Visibility Change Handling", () => {
    it("syncs immediately when user leaves tab", async () => {
      const { unmount } = renderHook(() => useCartAbandonmentSync());

      act(() => {
        useCartStore.getState().addItem(buildProduct({ _id: "prod-visibility" }));
      });

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });

      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/cart-abandonment",
          expect.objectContaining({ method: "POST" })
        );
      });

      unmount();
    });

    it("checks abandonment status when user returns", () => {
      const checkSpy = vi.spyOn(useCartStore.getState(), "checkAbandonmentStatus");

      const { unmount } = renderHook(() => useCartAbandonmentSync());

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });

      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(checkSpy).toHaveBeenCalled();

      checkSpy.mockRestore();
      unmount();
    });
  });
});
