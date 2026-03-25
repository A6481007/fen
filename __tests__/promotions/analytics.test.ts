import { beforeEach, describe, expect, it, vi } from "vitest";

type WhereOp = "==" | ">=" | "<=";
type QueryOrder = { field: string; direction: "asc" | "desc" };
type StoredDoc = {
  path: string;
  id: string;
  data: Record<string, unknown>;
};

type TimestampCtor = {
  new (ms: number): { toDate: () => Date; toMillis: () => number };
  now: () => { toMillis: () => number };
  fromMillis: (ms: number) => { toMillis: () => number };
  fromDate: (date: Date) => { toMillis: () => number };
};

const state = vi.hoisted<{
  docStore: Map<string, Record<string, unknown>>;
  writes: Array<{ path: string; type: "set" | "update"; data: Record<string, unknown> }>;
  MockTimestamp: TimestampCtor;
}>(() => ({
  docStore: new Map<string, Record<string, unknown>>(),
  writes: [],
  MockTimestamp: class {} as TimestampCtor,
}));

const firebaseAdminMock = vi.hoisted(() => {
  return () => {
    const { docStore, writes } = state;

    const getComparableValue = (value: unknown) => {
      if (value instanceof state.MockTimestamp) {
        return value.toMillis();
      }

      if (value instanceof Date) {
        return value.getTime();
      }

      return value;
    };

    class MockTimestamp {
      constructor(private readonly ms: number) {}

      toDate() {
        return new Date(this.ms);
      }

      toMillis() {
        return this.ms;
      }

      static now() {
        return new MockTimestamp(Date.now());
      }

      static fromMillis(ms: number) {
        return new MockTimestamp(ms);
      }

      static fromDate(date: Date) {
        return new MockTimestamp(date.getTime());
      }
    }

    state.MockTimestamp = MockTimestamp as TimestampCtor;

    class MockDocSnapshot {
      constructor(
        public readonly id: string,
        public readonly path: string,
        private readonly dataRef: Record<string, unknown> | undefined,
      ) {}

      get exists() {
        return this.dataRef !== undefined;
      }

      data() {
        return this.dataRef ?? {};
      }

      get(field: string) {
        return (this.dataRef as Record<string, unknown> | undefined)?.[field];
      }
    }

    class MockDocRef {
      constructor(
        private readonly collectionPath: string,
        public readonly id: string,
      ) {}

      get path() {
        return `${this.collectionPath}/${this.id}`;
      }

      collection(name: string) {
        return new MockCollectionRef(`${this.path}/${name}`);
      }

      async get() {
        const data = docStore.get(this.path);
        return new MockDocSnapshot(this.id, this.path, data);
      }

      async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
        const existing = docStore.get(this.path) ?? {};
        const next = options?.merge ? { ...existing, ...data } : data;
        docStore.set(this.path, next);
        writes.push({ path: this.path, type: "set", data: next });
      }

      async update(data: Record<string, unknown>) {
        const existing = docStore.get(this.path) ?? {};
        const next = { ...existing, ...data };
        docStore.set(this.path, next);
        writes.push({ path: this.path, type: "update", data });
      }
    }

    class MockQuery {
      constructor(
        private readonly path: string,
        private readonly docs: StoredDoc[],
        private readonly filters: Array<{ field: string; op: WhereOp; value: unknown }> = [],
        private readonly orders: QueryOrder[] = [],
        private readonly limitCount?: number,
      ) {}

      where(field: string, op: WhereOp, value: unknown) {
        return new MockQuery(this.path, this.docs, [...this.filters, { field, op, value }], this.orders, this.limitCount);
      }

      orderBy(field: string, direction: "asc" | "desc" = "asc") {
        return new MockQuery(this.path, this.docs, this.filters, [...this.orders, { field, direction }], this.limitCount);
      }

      limit(count: number) {
        return new MockQuery(this.path, this.docs, this.filters, this.orders, count);
      }

      private applyFilters(input: StoredDoc[]) {
        return input.filter((doc) =>
          this.filters.every(({ field, op, value }) => {
            const left = getComparableValue(doc.data[field]);
            const right = getComparableValue(value);

            if (op === "==") return left === right;
            if (op === ">=") return (left as number) >= (right as number);
            if (op === "<=") return (left as number) <= (right as number);

            return false;
          }),
        );
      }

      private applyOrder(input: StoredDoc[]) {
        if (this.orders.length === 0) {
          return input;
        }

        const [order] = this.orders;
        return [...input].sort((a, b) => {
          const left = getComparableValue(a.data[order.field]);
          const right = getComparableValue(b.data[order.field]);

          if (left === right) return 0;
          const comparison = (left as number | string) > (right as number | string) ? 1 : -1;
          return order.direction === "desc" ? -comparison : comparison;
        });
      }

      private applyLimit(input: StoredDoc[]) {
        if (!this.limitCount) {
          return input;
        }

        return input.slice(0, this.limitCount);
      }

      private buildSnapshots() {
        const filtered = this.applyFilters(this.docs);
        const ordered = this.applyOrder(filtered);
        const limited = this.applyLimit(ordered);

        return limited.map(
          (doc) => new MockDocSnapshot(doc.id, doc.path, doc.data),
        );
      }

      async get() {
        const docs = this.buildSnapshots();
        return {
          docs,
          size: docs.length,
          empty: docs.length === 0,
        };
      }
    }

    class MockCollectionRef {
      constructor(public readonly path: string) {}

      doc(id: string) {
        return new MockDocRef(this.path, id);
      }

      private listDocs(): StoredDoc[] {
        const prefix = `${this.path}/`;
        const directDocs: StoredDoc[] = [];

        for (const [path, data] of docStore.entries()) {
          if (!path.startsWith(prefix)) {
            continue;
          }

          const remainder = path.slice(prefix.length);
          if (remainder.includes("/")) {
            continue;
          }

          directDocs.push({ path, id: remainder, data });
        }

        return directDocs;
      }

      where(field: string, op: WhereOp, value: unknown) {
        return new MockQuery(this.path, this.listDocs()).where(field, op, value);
      }

      orderBy(field: string, direction: "asc" | "desc" = "asc") {
        return new MockQuery(this.path, this.listDocs()).orderBy(field, direction);
      }

      limit(count: number) {
        return new MockQuery(this.path, this.listDocs()).limit(count);
      }

      async get() {
        return new MockQuery(this.path, this.listDocs()).get();
      }
    }

    const adminDb = {
      collection: (name: string) => new MockCollectionRef(name),
      runTransaction: async (
        fn: (tx: {
          get: (ref: MockDocRef) => Promise<MockDocSnapshot>;
          set: (ref: MockDocRef, data: Record<string, unknown>) => Promise<void>;
          update: (ref: MockDocRef, data: Record<string, unknown>) => Promise<void>;
        }) => Promise<unknown>,
      ) =>
        fn({
          get: async (ref) => ref.get(),
          set: async (ref, data) => ref.set(data),
          update: async (ref, data) => ref.update(data),
        }),
    };

    const FieldValue = {
      increment: (value: number) => ({ __op: "increment", value }),
      arrayUnion: (...values: unknown[]) => ({ __op: "arrayUnion", values }),
      serverTimestamp: () => MockTimestamp.now(),
    };

    return {
      adminDb,
      Timestamp: MockTimestamp,
      FieldValue,
    };
  };
});

vi.mock("@/lib/firebaseAdmin", firebaseAdminMock, { virtual: true });
vi.mock("../../lib/firebaseAdmin", firebaseAdminMock, { virtual: true });

const { docStore, writes, MockTimestamp } = state;

import { recordDailyRollup } from "@/lib/promotions/analytics";
import { backfillCampaign } from "@/scripts/aggregatePromos";

import { recordDailyRollup } from "@/lib/promotions/analytics";
import { backfillCampaign } from "@/scripts/aggregatePromos";

describe("promotion analytics daily rollups", () => {
  beforeEach(() => {
    docStore.clear();
    writes.length = 0;
  });

  it("writes daily rollup snapshots into analytics/daily/days/{date}", async () => {
    const campaignId = "camp-rollup";
    const date = "2025-12-10";
    const realTimePath = `promotions/${campaignId}/analytics/real-time`;

    docStore.set(realTimePath, {
      impressions: 10,
      clicks: 4,
      addToCarts: 3,
      conversions: 2,
      totalDiscountSpent: 5,
      totalRevenue: 50,
      lastUpdated: MockTimestamp.fromMillis(0),
    });

    const result = await recordDailyRollup(campaignId, date);
    const targetPath = `promotions/${campaignId}/analytics/daily/days/${date}`;
    const rollupWrite = writes.find((write) => write.path === targetPath);

    expect(result).toBe(true);
    expect(rollupWrite).toBeTruthy();
    expect(rollupWrite?.data).toMatchObject({
      impressions: 10,
      clicks: 4,
      addToCarts: 3,
      conversions: 2,
      totalDiscountSpent: 5,
      totalRevenue: 50,
      date,
    });
  });

  it("stores aggregated interaction metrics in analytics/daily/days/{date}", async () => {
    const campaignId = "camp-agg";
    const date = "2025-12-09";

    docStore.set(`promotions/${campaignId}/interactions/a`, {
      action: "view",
      channel: "email",
      deviceType: "desktop",
      segment: "segA",
      timestamp: MockTimestamp.fromDate(new Date(`${date}T10:00:00.000Z`)),
    });

    docStore.set(`promotions/${campaignId}/interactions/b`, {
      action: "purchase",
      channel: "sms",
      deviceType: "mobile",
      segment: "segA",
      orderValue: 50,
      discountAmount: 5,
      timestamp: MockTimestamp.fromDate(new Date(`${date}T12:00:00.000Z`)),
    });

    docStore.set(`promotions/${campaignId}/analytics/real-time`, {
      impressions: 2,
      clicks: 1,
      addToCarts: 1,
      conversions: 1,
      totalDiscountSpent: 5,
      totalRevenue: 50,
      lastUpdated: MockTimestamp.fromMillis(0),
    });

    const outcomes = await backfillCampaign(campaignId, date, date, true);
    const targetPath = `promotions/${campaignId}/analytics/daily/days/${date}`;
    const stored = docStore.get(targetPath);

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.status).toBe("written");
    expect(stored).toBeTruthy();
  });
});
