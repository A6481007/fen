import { checkForAnomalies, evaluateAllChecks, DEFAULT_CONFIG, type AnomalyConfig, type RedemptionContext } from "@/lib/promotions/anomalyDetection";

type FilterOp = "==" | ">=";

const interactionsByCampaign: Record<string, Array<{ action: string; timestamp: Date }>> = {};
const userPromotions: Record<string, Array<{ redeemedAt: Date }>> = {};
const orders: Array<{ userId: string; hasPromotion: boolean; cartValue: number; promoMinimum: number; createdAt: Date }> = [];
const sessionRequests: Array<{ sessionId: string; country: string; createdAt: Date; deviceFingerprint?: string; userId?: string }> = [];
const deviceFingerprints: Record<string, Record<string, unknown>> = {};
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
          orderBy: (field: string, direction?: "asc" | "desc") => createQuery(orders as Array<Record<string, unknown>>).orderBy(field, direction),
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
            sessionRequests.push({
              createdAt: new Date(),
              ...(payload as { sessionId: string; country: string; deviceFingerprint?: string; userId?: string; createdAt?: Date }),
            });
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

      if (name === "deviceFingerprints") {
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(deviceFingerprints[id]),
              data: () => deviceFingerprints[id],
            }),
            set: async (payload: Record<string, unknown>) => {
              deviceFingerprints[id] = payload;
            },
            update: async (payload: Record<string, unknown>) => {
              deviceFingerprints[id] = { ...(deviceFingerprints[id] ?? {}), ...payload };
            },
          }),
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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const baseContext: RedemptionContext = {
  userId: "user-1",
  campaignId: "camp-1",
  cartValue: 120,
  promoMinimum: 100,
  ipAddress: "1.1.1.1",
  country: "US",
  userAgent: "vitest",
  accountCreatedAt: new Date(Date.now() - 48 * HOUR_MS),
  ordersCount: 5,
  sessionId: "session-1",
};

const resetStores = () => {
  Object.keys(interactionsByCampaign).forEach((key) => delete interactionsByCampaign[key]);
  Object.keys(userPromotions).forEach((key) => delete userPromotions[key]);
  Object.keys(pausedPromotions).forEach((key) => delete pausedPromotions[key]);
  Object.keys(deviceFingerprints).forEach((key) => delete deviceFingerprints[key]);
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

  it("pauses a promotion on a critical campaign velocity spike", async () => {
    interactionsByCampaign["camp-velocity"] = Array.from({ length: 6 }, (_, idx) => ({
      action: "purchase",
      timestamp: new Date(Date.now() - idx * 5_000),
    }));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const config: AnomalyConfig = {
      ...DEFAULT_CONFIG,
      velocity: {
        ...DEFAULT_CONFIG.velocity,
        campaignPerMinuteWarning: 3,
        campaignPerMinuteCritical: 5,
        userPerHour: 10,
        userPerDay: 20,
      },
    };

    const result = await checkForAnomalies(buildContext({ campaignId: "camp-velocity" }), config);

    warnSpy.mockRestore();

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("velocity_campaign");
    expect(result.action).toBe("pause_promotion");
    expect(result.shouldBlock).toBe(true);
    expect(pausedPromotions["camp-velocity"]?.status).toBe("paused");
    expect(anomalyLogs).toHaveLength(1);
  });

  it("blocks rapid geographic jumps within an hour", async () => {
    const sessionId = "session-geo";
    const now = new Date();

    sessionRequests.push(
      { sessionId, country: "US", createdAt: now },
      { sessionId, country: "FR", createdAt: new Date(now.getTime() - 10 * MINUTE_MS) },
      { sessionId, country: "DE", createdAt: new Date(now.getTime() - 20 * MINUTE_MS) }
    );

    const result = await checkForAnomalies(buildContext({ sessionId, country: "GB" }));

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("geographic_jump");
    expect(result.action).toBe("block_transaction");
    expect(result.shouldBlock).toBe(true);
  });

  it("flags cart gaming when orders cluster near the minimum threshold", async () => {
    const userId = "user-cart";
    const promoMinimum = 100;
    const now = new Date();

    orders.push(
      { userId, hasPromotion: true, cartValue: 103, promoMinimum, createdAt: now },
      { userId, hasPromotion: true, cartValue: 101, promoMinimum, createdAt: new Date(now.getTime() - 2 * MINUTE_MS) },
      { userId, hasPromotion: true, cartValue: 104, promoMinimum, createdAt: new Date(now.getTime() - 4 * MINUTE_MS) }
    );

    const result = await checkForAnomalies(buildContext({ userId, cartValue: 102, promoMinimum }));

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("cart_gaming");
    expect(result.action).toBe("flag_for_review");
    expect(result.shouldBlock).toBe(false);
  });

  it("requires verification for new accounts using high-value promos", async () => {
    const now = new Date();

    const result = await checkForAnomalies(
      buildContext({
        accountCreatedAt: new Date(now.getTime() - 6 * HOUR_MS),
        promoValue: 75,
        cartValue: 200,
        promoMinimum: 100,
        now,
      })
    );

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("new_account");
    expect(result.action).toBe("require_verification");
    expect(result.shouldBlock).toBe(false);
  });

  it("pauses when a device fingerprint is shared across multiple users", async () => {
    const deviceFingerprint = "fp-1";
    const now = new Date();

    sessionRequests.push(
      { sessionId: "s1", country: "US", createdAt: now, deviceFingerprint, userId: "user-a" },
      { sessionId: "s2", country: "US", createdAt: new Date(now.getTime() - 10 * MINUTE_MS), deviceFingerprint, userId: "user-b" }
    );

    const result = await checkForAnomalies(
      buildContext({ userId: "user-c", deviceFingerprint, sessionId: "s3" })
    );

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyType).toBe("device_fingerprint");
    expect(result.action).toBe("pause_promotion");
    expect(result.shouldBlock).toBe(true);
    expect(pausedPromotions["camp-1"]?.status).toBe("paused");
    expect(anomalyLogs).toHaveLength(1);
  });

  it("returns aggregated findings via evaluateAllChecks", async () => {
    interactionsByCampaign["camp-multi"] = [
      { action: "purchase", timestamp: new Date() },
      { action: "purchase", timestamp: new Date() },
    ];

    const userId = "user-multi";
    userPromotions[userId] = [
      { redeemedAt: new Date() },
      { redeemedAt: new Date(Date.now() - 10 * MINUTE_MS) },
      { redeemedAt: new Date(Date.now() - 20 * MINUTE_MS) },
      { redeemedAt: new Date(Date.now() - 30 * MINUTE_MS) },
    ];

    orders.push({ userId, hasPromotion: true, cartValue: 101, promoMinimum: 100, createdAt: new Date() });

    const aggregate = await evaluateAllChecks(
      buildContext({ campaignId: "camp-multi", userId, cartValue: 101, promoMinimum: 100 }),
      {
        ...DEFAULT_CONFIG,
        velocity: {
          ...DEFAULT_CONFIG.velocity,
          campaignPerMinuteWarning: 2,
          campaignPerMinuteCritical: 4,
          userPerHour: 3,
          userPerDay: 10,
        },
      }
    );

    expect(aggregate.isAnomaly).toBe(true);
    expect(aggregate.findings.length).toBeGreaterThanOrEqual(2);
    expect(aggregate.mostSevere?.type).toBeDefined();
  });
});
