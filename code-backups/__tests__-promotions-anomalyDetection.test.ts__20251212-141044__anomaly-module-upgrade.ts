import { checkForAnomalies, type AnomalyConfig, type RedemptionContext } from "@/lib/promotions/anomalyDetection";

type FilterOp = "==" | ">=";

const interactionsByCampaign: Record<string, Array<{ action: string; timestamp: Date }>> = {};
const userPromotions: Record<string, Array<{ redeemedAt: Date }>> = {};
const orders: Array<{ userId: string; hasPromotion: boolean; cartValue: number; promoMinimum: number; createdAt: Date }> =
  [];
const sessionRequests: Array<{ sessionId: string; country: string }> = [];
const anomalyLogs: Array<Record<string, unknown>> = [];
const pausedPromotions: Record<string, unknown> = {};

vi.mock("@/lib/firebaseAdmin", () => {
  class MockTimestamp {
    constructor(private readonly date: Date) {}

    toDate() {
      return this.date;
    }

    static fromDate(date: Date) {
      return new MockTimestamp(date);
    }

    static now() {
      return MockTimestamp.fromDate(new Date());
    }
  }

  const getComparable = (value: unknown) => {
    if (value instanceof MockTimestamp) {
      return value.toDate();
    }

    if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate();
    }

    return value;
  };

  const applyFilters = (items: Array<Record<string, unknown>>, filters: Array<{ field: string; op: FilterOp; value: unknown }>) =>
    items.filter((item) =>
      filters.every(({ field, op, value }) => {
        const left = getComparable(item[field]);
        const right = getComparable(value);

        if (op === "==") return left === right;
        if (op === ">=") return (left as number | Date) >= (right as number | Date);

        return false;
      })
    );

  const createQuery = (data: Array<Record<string, unknown>>, filters: Array<{ field: string; op: FilterOp; value: unknown }> = []) => {
    const filtered = applyFilters(data, filters);

    return {
      where: (field: string, op: FilterOp, value: unknown) => createQuery(data, [...filters, { field, op, value }]),
      orderBy: (field: string, direction: "asc" | "desc" = "desc") => {
        const sorted = [...filtered].sort((a, b) => {
          const left = getComparable(a[field]);
          const right = getComparable(b[field]);

          if (left === right) return 0;
          const comparison = (left as number | Date) > (right as number | Date) ? 1 : -1;
          return direction === "desc" ? -comparison : comparison;
        });

        return createQuery(sorted);
      },
      limit: (count: number) => createQuery(filtered.slice(0, count)),
      count: () => ({
        get: async () => ({
          data: () => ({
            count: filtered.length,
          }),
        }),
      }),
      get: async () => ({
        docs: filtered.map((item) => ({
          data: () => item,
        })),
      }),
    };
  };

  const adminDb = {
    collection: (name: string) => {
      if (name === "promotions") {
        return {
          doc: (campaignId: string) => ({
            collection: (sub: string) => {
              if (sub === "interactions") {
                return createQuery(interactionsByCampaign[campaignId] ?? []);
              }
              return createQuery([]);
            },
            update: async (payload: Record<string, unknown>) => {
              pausedPromotions[campaignId] = payload;
            },
          }),
        };
      }

      if (name === "users") {
        return {
          doc: (userId: string) => ({
            get: async () => ({
              exists: true,
              data: () => ({ createdAt: new Date(), ordersCount: 0 }),
            }),
            collection: (sub: string) => {
              if (sub === "promotions") {
                return createQuery(userPromotions[userId] ?? []);
              }
              return createQuery([]);
            },
          }),
        };
      }

      if (name === "orders") {
        return {
          where: (field: string, op: FilterOp, value: unknown) => createQuery(orders as Array<Record<string, unknown>>).where(field, op, value),
          orderBy: (field: string, direction?: "asc" | "desc") =>
            createQuery(orders as Array<Record<string, unknown>>).orderBy(field, direction),
          limit: (count: number) => createQuery(orders as Array<Record<string, unknown>>).limit(count),
          get: async () => ({
            docs: orders.map((item) => ({
              data: () => item,
            })),
          }),
        };
      }

      if (name === "sessionRequests") {
        return {
          where: (field: string, op: FilterOp, value: unknown) =>
            createQuery(sessionRequests as Array<Record<string, unknown>>).where(field, op, value),
          get: async () => ({
            docs: sessionRequests.map((item) => ({
              data: () => item,
            })),
          }),
          add: async (payload: Record<string, unknown>) => {
            sessionRequests.push(payload as { sessionId: string; country: string });
            return { id: `session-${sessionRequests.length}` };
          },
        };
      }

      if (name === "anomalyLogs") {
        return {
          add: async (payload: Record<string, unknown>) => {
            anomalyLogs.push(payload);
            return { id: `log-${anomalyLogs.length}` };
          },
        };
      }

      return createQuery([]);
    },
  };

  return {
    adminDb,
    Timestamp: MockTimestamp,
    FieldValue: {
      increment: (value: number) => value,
      serverTimestamp: () => new Date(),
    },
  };
});

const DAY_MS = 24 * 60 * 60 * 1000;

const TEST_CONFIG: AnomalyConfig = {
  velocity: {
    maxGlobalPerMinute: 3,
    maxUserPerHour: 2,
    maxUserPerDay: 4,
  },
  account: {
    minAgeForHighValuePromos: 7,
    minOrdersForVIPPromos: 1,
  },
  geographic: {
    maxCountriesPerSession: 2,
    flaggedCountries: [],
  },
  cartGaming: {
    suspiciousThresholdRange: 5,
    maxNearThresholdInWindow: 3,
  },
};

const baseContext: RedemptionContext = {
  userId: "user-1",
  campaignId: "camp-1",
  cartValue: 120,
  promoMinimum: 100,
  ipAddress: "1.1.1.1",
  country: "US",
  userAgent: "vitest",
  accountCreatedAt: new Date(Date.now() - 30 * DAY_MS),
  ordersCount: 5,
  sessionId: "session-1",
};

const resetStores = () => {
  Object.keys(interactionsByCampaign).forEach((key) => delete interactionsByCampaign[key]);
  Object.keys(userPromotions).forEach((key) => delete userPromotions[key]);
  Object.keys(pausedPromotions).forEach((key) => delete pausedPromotions[key]);
  orders.length = 0;
  sessionRequests.length = 0;
  anomalyLogs.length = 0;
};

const buildContext = (overrides: Partial<RedemptionContext> = {}): RedemptionContext => ({
  ...baseContext,
  ...overrides,
});

describe("promotion anomaly detection", () => {
  beforeEach(() => {
    resetStores();
  });

  it("pauses a promotion on a global velocity spike", async () => {
    interactionsByCampaign["camp-velocity"] = [
      { action: "purchase", timestamp: new Date() },
      { action: "purchase", timestamp: new Date(Date.now() - 5_000) },
      { action: "purchase", timestamp: new Date(Date.now() - 10_000) },
    ];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkForAnomalies(
      buildContext({ campaignId: "camp-velocity" }),
      { ...TEST_CONFIG, velocity: { ...TEST_CONFIG.velocity, maxGlobalPerMinute: 2 } }
    );

    warnSpy.mockRestore();

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("velocity_global");
    expect(result.action).toBe("pause_promotion");
    expect(result.shouldBlock).toBe(true);
    expect(pausedPromotions["camp-velocity"]?.status).toBe("paused");
    expect(anomalyLogs).toHaveLength(1);
  });

  it("blocks a user that exceeds hourly velocity", async () => {
    const userId = "user-fast";
    userPromotions[userId] = [
      { redeemedAt: new Date() },
      { redeemedAt: new Date(Date.now() - 10 * 60 * 1000) },
      { redeemedAt: new Date(Date.now() - 20 * 60 * 1000) },
    ];

    const result = await checkForAnomalies(
      buildContext({ userId, campaignId: "camp-user" }),
      { ...TEST_CONFIG, velocity: { ...TEST_CONFIG.velocity, maxUserPerHour: 2, maxUserPerDay: 6 } }
    );

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("velocity_user");
    expect(result.action).toBe("block_transaction");
    expect(result.shouldBlock).toBe(true);
  });

  it("flags cart gaming when orders cluster near the minimum threshold", async () => {
    const userId = "user-cart";
    const promoMinimum = 100;

    orders.push(
      { userId, hasPromotion: true, cartValue: 103, promoMinimum, createdAt: new Date() },
      { userId, hasPromotion: true, cartValue: 101, promoMinimum, createdAt: new Date(Date.now() - 2 * 60 * 1000) },
      { userId, hasPromotion: true, cartValue: 104, promoMinimum, createdAt: new Date(Date.now() - 4 * 60 * 1000) }
    );

    const result = await checkForAnomalies(
      buildContext({ userId, cartValue: 102, promoMinimum }),
      { ...TEST_CONFIG, cartGaming: { suspiciousThresholdRange: 5, maxNearThresholdInWindow: 3 } }
    );

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("cart_gaming");
    expect(result.action).toBe("flag_for_review");
    expect(result.shouldBlock).toBe(false);
  });

  it("blocks multi-country sessions that exceed the allowed country count", async () => {
    const sessionId = "session-geo";

    sessionRequests.push(
      { sessionId, country: "US" },
      { sessionId, country: "FR" },
      { sessionId, country: "DE" }
    );

    const result = await checkForAnomalies(
      buildContext({ sessionId, country: "GB" }),
      { ...TEST_CONFIG, geographic: { ...TEST_CONFIG.geographic, maxCountriesPerSession: 2 } }
    );

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("geographic");
    expect(result.action).toBe("block_transaction");
    expect(result.shouldBlock).toBe(true);
  });
});
