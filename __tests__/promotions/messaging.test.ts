import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageRecipient } from "@/lib/promotions/promotionMessaging";

const firestoreMock = vi.hoisted(() => createFirestoreMock());
const smsState = vi.hoisted(() => ({
  quietHours: false,
  rateLimited: false,
  sent: [] as Array<{ userId: string; campaignId: string }>,
}));
const pushState = vi.hoisted(() => ({
  sent: [] as Array<{ userId: string; campaignId: string }>,
}));
const emailMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));

vi.mock("@/lib/firebaseAdmin", () => firestoreMock.module);

vi.mock("@/sanity/queries", () => ({
  getPromotionByCampaignId: vi.fn(async (id: string) => ({
    campaignId: id,
    name: "Test Campaign",
    discountType: "percentage",
    discountValue: 10,
    endDate: new Date().toISOString(),
    _id: id,
  })),
}));

vi.mock("@/lib/promotions/smsAdapter", () => {
  const sendPromoSMS = vi.fn(
    async ({ userId, campaignId }: { userId: string; campaignId: string }) => {
      smsState.sent.push({ userId, campaignId });
      if (smsState.quietHours) {
        return { success: false, quietHours: true, error: "Quiet hours" };
      }
      if (smsState.rateLimited) {
        return { success: false, error: "Rate limited" };
      }
      return { success: true };
    },
  );

  const isQuietHours = vi.fn(() => smsState.quietHours);
  const checkRateLimits = vi.fn(async () => ({
    allowed: !smsState.rateLimited,
    reason: smsState.rateLimited ? "Rate limited" : undefined,
  }));

  return { sendPromoSMS, isQuietHours, checkRateLimits };
});

vi.mock("@/lib/promotions/pushAdapter", () => {
  const sendPromoPush = vi.fn(
    async ({ userId, campaignId }: { userId: string; campaignId: string }) => {
      pushState.sent.push({ userId, campaignId });
      return { success: true, errors: [] as string[] };
    },
  );

  return { sendPromoPush };
});

vi.mock("@/lib/emailService", () => ({
  sendMail: emailMock,
}));

import {
  processMessageQueue,
  queueMessage,
  selectChannel,
  sendPromotionalMessage,
} from "@/lib/promotions/promotionMessaging";

describe("promotionMessaging orchestrator", () => {
  beforeEach(() => {
    firestoreMock.reset();
    smsState.sent.length = 0;
    smsState.quietHours = false;
    smsState.rateLimited = false;
    pushState.sent.length = 0;
    emailMock.mockClear();
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  });

  it("routes abandonment messages to SMS as the primary urgent channel", async () => {
    const recipient = buildRecipient();

    const result = await sendPromotionalMessage({
      campaignId: "camp-urgent",
      recipient,
      messageType: "abandonment",
    });

    expect(result.channel).toBe("sms");
    expect(smsState.sent).toHaveLength(1);
    expect(pushState.sent).toHaveLength(0);
    expect(emailMock).not.toHaveBeenCalled();
  });

  it("enforces cross-channel frequency caps", async () => {
    const userId = "user-capped";
    const today = new Date();

    seedHistory(userId, [
      { sentAt: today, channel: "email", campaignId: "prev" },
      { sentAt: today, channel: "push", campaignId: "prev" },
      { sentAt: today, channel: "sms", campaignId: "prev" },
      { sentAt: today, channel: "email", campaignId: "prev-2" },
      { sentAt: today, channel: "push", campaignId: "prev-3" },
    ]);

    const result = await sendPromotionalMessage({
      campaignId: "camp-cap",
      recipient: buildRecipient({ userId }),
      messageType: "promotion",
    });

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("frequencyCap");
    expect(smsState.sent).toHaveLength(0);
    expect(pushState.sent).toHaveLength(0);
  });

  it("logs dry runs without sending", async () => {
    const result = await sendPromotionalMessage({
      campaignId: "camp-dry",
      recipient: buildRecipient({ userId: "user-dry" }),
      messageType: "promotion",
      dryRun: true,
    });

    expect(result.status).toBe("sent");
    expect(result.dryRun).toBe(true);
    expect(smsState.sent).toHaveLength(0);
    expect(pushState.sent).toHaveLength(0);

    const logs = listLogsForCampaign("camp-dry", "messageEvents");
    expect(logs.length).toBeGreaterThan(0);
  });

  it("processes queued urgent messages before lower priority tasks", async () => {
    const order: string[] = [];

    const { sendPromoPush } = await import("@/lib/promotions/pushAdapter");
    (sendPromoPush as any).mockImplementation(
      async ({ userId, campaignId }: { userId: string; campaignId: string }) => {
        order.push(userId);
        pushState.sent.push({ userId, campaignId });
        return { success: true, errors: [] as string[] };
      },
    );

    await queueMessage(
      {
        campaignId: "camp-queue",
        recipient: buildRecipient({
          userId: "user-low",
          pushTokens: [{ token: "t-low", type: "web" }],
          preferences: { emailOptIn: false, smsOptIn: false, pushOptIn: true },
        }),
        messageType: "promotion",
      },
      "low",
    );

    await queueMessage(
      {
        campaignId: "camp-queue",
        recipient: buildRecipient({
          userId: "user-urgent",
          pushTokens: [{ token: "t-urgent", type: "web" }],
          preferences: { emailOptIn: false, smsOptIn: false, pushOptIn: true },
        }),
        messageType: "promotion",
      },
      "urgent",
    );

    const results = await processMessageQueue();

    expect(order[0]).toBe("user-urgent");
    expect(results.map((item) => item.status)).toEqual(["sent", "sent"]);
    expect(results[0].channel).toBe("push");
  });

  it("exposes quiet hours preference through selectChannel", () => {
    smsState.quietHours = true;
    const recipient = buildRecipient({
      preferences: {
        emailOptIn: false,
        smsOptIn: true,
        pushOptIn: false,
      },
    });

    const channel = selectChannel(recipient, "abandonment");
    expect(channel).toBe("sms");
  });
});

function buildRecipient(
  overrides: Partial<MessageRecipient> = {},
): MessageRecipient {
  return {
    userId: "user-1",
    email: "user@example.com",
    phone: "+15550000000",
    pushTokens: [{ token: "push-token", type: "web" }],
    preferences: {
      emailOptIn: true,
      smsOptIn: true,
      pushOptIn: true,
    },
    segment: "allCustomers",
    ...overrides,
  };
}

function seedHistory(
  userId: string,
  entries: Array<{ sentAt: Date; channel: "email" | "sms" | "push"; campaignId: string }>,
) {
  entries.forEach((entry, index) => {
    firestoreMock.store.set(
      `users/${userId}/messageHistory/doc-seed-${index}`,
      entry,
    );
  });
}

function listLogsForCampaign(campaignId: string, collection: string) {
  const prefix = `promotions/${campaignId}/${collection}`;
  return Array.from(firestoreMock.store.entries()).filter(([key]) =>
    key.startsWith(prefix),
  );
}

function createFirestoreMock() {
  const store = new Map<string, any>();
  let counter = 0;

  class FakeTimestamp {
    constructor(private readonly date = new Date()) {}

    toDate() {
      return this.date;
    }

    static now() {
      return new FakeTimestamp(new Date());
    }
  }

  const FieldValue = {
    serverTimestamp: vi.fn(() => new Date("2025-01-01T00:00:00Z")),
    increment: (value: number) => value,
  };

  const makeDoc = (path: string) => ({
    path,
    async get() {
      return { exists: store.has(path), data: () => store.get(path) ?? {} };
    },
    async set(data: Record<string, unknown>) {
      store.set(path, data);
    },
    async update(data: Record<string, unknown>) {
      const existing = (store.get(path) as Record<string, unknown>) ?? {};
      store.set(path, { ...existing, ...data });
    },
    collection: (name: string) => makeCollection(`${path}/${name}`),
  });

  const makeCollection = (path: string) => ({
    path,
    doc: (id = `doc-${counter++}`) => makeDoc(`${path}/${id}`),
    async add(data: Record<string, unknown>) {
      const docPath = `${path}/doc-${counter++}`;
      store.set(docPath, data);
      return { id: docPath };
    },
    where: (field: string, op: string, value: unknown) => ({
      async get() {
        return {
          docs: listDocs(path).filter((doc) =>
            matchesWhere(doc.data(), field, op, value),
          ),
        };
      },
    }),
    async get() {
      return { docs: listDocs(path) };
    },
  });

  const listDocs = (path: string) =>
    Array.from(store.entries())
      .filter(([key]) => key.startsWith(`${path}/`))
      .map(([key, data]) => ({ id: key, data: () => data }));

  const matchesWhere = (data: any, field: string, op: string, value: any) => {
    const target = data?.[field];
    if (op === "==") {
      return target === value;
    }
    if (op === ">=") {
      const normalized =
        typeof target?.toDate === "function" ? target.toDate() : target;
      return normalized >= value;
    }
    return true;
  };

  const adminDb = {
    collection: (name: string) => makeCollection(name),
  };

  return {
    module: { adminDb, FieldValue, Timestamp: FakeTimestamp },
    store,
    reset() {
      store.clear();
      counter = 0;
    },
  };
}
