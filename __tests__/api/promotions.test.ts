import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGetActivePromotions = vi.fn();
const mockGetPromotionByCampaignId = vi.fn();
const mockConsumeRateLimit = vi.fn();
const mockEnqueueAnalyticsTasks = vi.fn();
const mockGetPromotionAnalytics = vi.fn();
const clientFetchMock = vi.fn();

process.env.FIREBASE_PROJECT_ID ??= "test-project";
process.env.FIREBASE_CLIENT_EMAIL ??= "test@example.com";
process.env.FIREBASE_PRIVATE_KEY ??= "test-key";

const buildFirestoreDoc = () => ({
  get: vi.fn(async () => ({ exists: false, data: () => ({}) })),
  set: vi.fn(async () => {}),
  update: vi.fn(async () => {}),
  create: vi.fn(async () => {}),
  collection: vi.fn(() => ({
    doc: vi.fn(() => buildFirestoreDoc()),
  })),
});

class MockTimestamp {
  constructor(public seconds = 0, public nanoseconds = 0) {}

  toDate() {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000));
  }

  static now() {
    const nowMs = Date.now();
    const seconds = Math.floor(nowMs / 1000);
    const nanoseconds = (nowMs % 1000) * 1_000_000;
    return new MockTimestamp(seconds, nanoseconds);
  }
}

const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => buildFirestoreDoc()),
  })),
  runTransaction: vi.fn(async (fn: (tx: unknown) => Promise<void> | void) =>
    fn({
      get: async () => ({ exists: false, data: () => ({}) }),
      set: vi.fn(),
      update: vi.fn(),
    })
  ),
};

vi.mock("firebase-admin/app", () => ({
  cert: vi.fn((value) => value),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((value: number) => value),
    serverTimestamp: vi.fn(() => new Date()),
  },
  Timestamp: MockTimestamp,
  getFirestore: vi.fn(() => mockFirestore),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({})),
}));

vi.mock("@/lib/promotions/analytics", () => ({
  checkBudgetAvailable: vi.fn().mockResolvedValue(true),
  checkUsageLimitAvailable: vi.fn().mockResolvedValue(true),
  checkPerCustomerLimit: vi.fn().mockResolvedValue(true),
  getPromotionAnalytics: mockGetPromotionAnalytics,
}));

vi.mock("@/lib/queue/analytics-queue", () => ({
  enqueueAnalyticsTasks: mockEnqueueAnalyticsTasks,
}));

vi.mock("@/lib/rate-limit/redis-rate-limiter", () => ({
  consumeRateLimit: mockConsumeRateLimit,
}));

vi.mock("@/sanity/queries", () => ({
  getActivePromotions: mockGetActivePromotions,
  getPromotionByCampaignId: mockGetPromotionByCampaignId,
}));

vi.mock("@/sanity/lib/client", () => ({
  client: {
    fetch: clientFetchMock,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null })),
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: vi.fn(async () => ({
        primaryEmailAddress: { emailAddress: "test@example.com" },
        publicMetadata: {},
        privateMetadata: {},
      })),
    },
  })),
}));

const activePromotion = {
  _id: "promo-1",
  campaignId: "test-promo-001",
  name: "Test Promotion",
  type: "seasonal",
  status: "active",
  isActive: true,
  discountType: "percentage" as const,
  discountValue: 20,
  targetAudience: { segmentType: "allCustomers" },
  priority: 50,
  endDate: new Date(Date.now() + 3_600_000).toISOString(),
  minimumOrderValue: 0,
  products: [],
  excludedProducts: [],
  categories: [],
  buyQuantity: 0,
  getQuantity: 0,
  badgeLabel: "",
  shortDescription: "",
};

beforeEach(() => {
  vi.clearAllMocks();

  mockGetActivePromotions.mockResolvedValue([activePromotion]);
  mockGetPromotionByCampaignId.mockImplementation(async (id: string) =>
    id === "test-promo-001" ? activePromotion : null
  );
  mockConsumeRateLimit.mockResolvedValue({
    limited: false,
    retryAfterMs: 0,
    source: "memory",
  });
  mockEnqueueAnalyticsTasks.mockResolvedValue({ queued: true, mode: "inline" });
  mockGetPromotionAnalytics.mockResolvedValue({
    impressions: 10,
    clicks: 5,
    addToCarts: 2,
    conversions: 1,
    totalDiscountSpent: 10,
    totalRevenue: 100,
    averageOrderValue: 100,
    conversionRate: 0.1,
    lastUpdated: { toDate: () => new Date() } as any,
  });
  clientFetchMock.mockImplementation(async (query: string) => {
    if (query.includes("count(")) {
      return 1;
    }
    return [activePromotion];
  });
});

describe("Promotion API Routes", () => {
  describe("POST /api/promotions/eligibility", () => {
    it("returns eligible promotions for valid request", async () => {
      const { POST } = await import("@/app/api/promotions/eligibility/route");

      const request = new Request("http://localhost/api/promotions/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "test-session",
          context: {
            page: "homepage",
          },
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("eligible");
      expect(data).toHaveProperty("ineligible");
      expect(data).toHaveProperty("metadata");
      expect(Array.isArray(data.eligible)).toBe(true);
    });

    it("returns 400 for missing context", async () => {
      const { POST } = await import("@/app/api/promotions/eligibility/route");

      const request = new Request("http://localhost/api/promotions/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
    });

    it("includes user segment metadata when userId provided", async () => {
      const { POST } = await import("@/app/api/promotions/eligibility/route");

      const request = new Request("http://localhost/api/promotions/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-123",
          context: {
            page: "cart",
            cartValue: 100,
          },
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata).toHaveProperty("userSegment");
    });
  });

  describe("POST /api/promotions/track", () => {
    it("tracks view event successfully", async () => {
      const { POST } = await import("@/app/api/promotions/track/route");

      const request = new Request("http://localhost/api/promotions/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: "test-promo-001",
          action: "view",
          sessionId: "test-session",
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked.action).toBe("view");
    });

    it("tracks purchase event with required metadata", async () => {
      const { POST } = await import("@/app/api/promotions/track/route");

      const request = new Request("http://localhost/api/promotions/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: "test-promo-001",
          action: "purchase",
          userId: "user-123",
          metadata: {
            orderId: "order-456",
            orderValue: 150,
            discountAmount: 30,
          },
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tracked.action).toBe("purchase");
    });

    it("returns 400 for missing campaignId", async () => {
      const { POST } = await import("@/app/api/promotions/track/route");

      const request = new Request("http://localhost/api/promotions/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "view",
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid action", async () => {
      const { POST } = await import("@/app/api/promotions/track/route");

      const request = new Request("http://localhost/api/promotions/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: "test-promo-001",
          action: "invalid-action",
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
    });

    it("returns 404 for non-existent promotion", async () => {
      const { POST } = await import("@/app/api/promotions/track/route");

      const request = new Request("http://localhost/api/promotions/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: "non-existent-promo",
          action: "view",
          sessionId: "test-session",
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/promotions/campaigns", () => {
    it("returns list of active campaigns", async () => {
      const { GET } = await import("@/app/api/promotions/campaigns/route");

      const request = new Request("http://localhost/api/promotions/campaigns");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("campaigns");
      expect(data).toHaveProperty("pagination");
      expect(Array.isArray(data.campaigns)).toBe(true);
    });

    it("filters by type parameter", async () => {
      const { GET } = await import("@/app/api/promotions/campaigns/route");

      const request = new Request("http://localhost/api/promotions/campaigns?type=flashSale");

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.type).toBe("flashSale");
    });
  });
});
