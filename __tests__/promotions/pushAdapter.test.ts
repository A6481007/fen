import { afterEach, describe, expect, it, vi } from "vitest";

const webPushMocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}));

const messagingMocks = vi.hoisted(() => ({
  sendEachForMulticast: vi.fn(),
}));

vi.mock("web-push", () => ({
  default: webPushMocks,
  sendNotification: webPushMocks.sendNotification,
  setVapidDetails: webPushMocks.setVapidDetails,
}));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => messagingMocks,
}));

const ORIGINAL_ENV = { ...process.env };
const BASE_ENV = {
  VAPID_PUBLIC_KEY: "test-public",
  VAPID_PRIVATE_KEY: "test-private",
  VAPID_SUBJECT: "mailto:test@example.com",
};

async function loadAdapter() {
  vi.resetModules();

  webPushMocks.sendNotification.mockReset();
  webPushMocks.sendNotification.mockResolvedValue({});
  webPushMocks.setVapidDetails.mockReset();

  messagingMocks.sendEachForMulticast.mockReset();
  messagingMocks.sendEachForMulticast.mockResolvedValue({
    successCount: 0,
    failureCount: 0,
    responses: [],
  });

  Object.assign(process.env, ORIGINAL_ENV, BASE_ENV);

  return import("@/lib/promotions/pushAdapter");
}

async function setupFirestore(initialData: Record<string, unknown> = {}) {
  const { adminDb, FieldValue } = await import("@/lib/firebaseAdmin");
  const store = new Map<string, unknown>(Object.entries(initialData));
  const writes: Array<{ type: string; path: string; data: unknown }> = [];

  const makeDoc = (path: string) => ({
    path,
    async get() {
      return { exists: store.has(path), data: () => store.get(path) ?? {} };
    },
    async set(data: Record<string, unknown>) {
      store.set(path, data);
      writes.push({ type: "set", path, data });
    },
    async update(data: Record<string, unknown>) {
      const next = { ...(store.get(path) as Record<string, unknown> | undefined), ...data };
      store.set(path, next);
      writes.push({ type: "update", path, data });
    },
    collection: (name: string) => makeCollection(`${path}/${name}`),
  });

  const makeCollection = (path: string) => ({
    doc: (id: string) => makeDoc(`${path}/${id}`),
    add: async (data: unknown) => {
      const docPath = `${path}/doc-${writes.length}`;
      store.set(docPath, data);
      writes.push({ type: "add", path: docPath, data });
      return { id: docPath };
    },
  });

  (adminDb as unknown as { collection: unknown }).collection = vi.fn((name: string) =>
    makeCollection(name),
  );

  (adminDb as unknown as { runTransaction: unknown }).runTransaction = vi.fn(
    async (fn: (tx: unknown) => Promise<void> | void) =>
      fn({
        get: async (doc: { path: string }) => ({
          exists: store.has(doc.path),
          data: () => store.get(doc.path) ?? {},
        }),
        set: async (doc: { path: string }, data: Record<string, unknown>) => {
          store.set(doc.path, data);
          writes.push({ type: "txSet", path: doc.path, data });
        },
        update: async (doc: { path: string }, data: Record<string, unknown>) => {
          const next = { ...(store.get(doc.path) as Record<string, unknown> | undefined), ...data };
          store.set(doc.path, next ?? data);
          writes.push({ type: "txUpdate", path: doc.path, data });
        },
      }),
  );

  FieldValue.serverTimestamp = vi.fn(() => new Date("2025-01-01T00:00:00Z"));

  return { store, writes, adminDb };
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
  vi.useRealTimers();
});

describe("pushAdapter", () => {
  const subscription = {
    endpoint: "https://example.com/subscription",
    expirationTime: null,
    keys: { auth: "auth-key", p256dh: "p256dh-key" },
  };

  it("validates subscription shape", async () => {
    const { validateSubscription } = await loadAdapter();

    expect(validateSubscription(subscription)).toBe(true);
    expect(validateSubscription({ endpoint: "", keys: {} })).toBe(false);
  });

  it("saves and dedupes subscriptions", async () => {
    const { saveSubscription, getActiveSubscriptions } = await loadAdapter();
    const { store } = await setupFirestore();

    await saveSubscription("user-1", subscription, "web", "device-1");
    await saveSubscription("user-1", subscription, "web", "device-1");

    const active = await getActiveSubscriptions("user-1");
    expect(active).toHaveLength(1);

    const doc = store.get("users/user-1") as { pushTokens?: unknown[] };
    expect(Array.isArray(doc.pushTokens)).toBe(true);
    expect((doc.pushTokens as unknown[]).length).toBe(1);
  });

  it("removes invalid tokens when sends fail", async () => {
    const { sendBulkPush } = await loadAdapter();
    const invalidToken = "not-a-subscription";

    const { store } = await setupFirestore({
      "users/user-2": { pushTokens: [{ token: invalidToken, type: "web" }] },
    });

    const result = await sendBulkPush(
      [{ token: invalidToken, type: "web" }],
      { title: "Test", body: "Message", userId: "user-2" },
    );

    expect(result.invalidTokens).toContain(invalidToken);
    const updated = store.get("users/user-2") as { pushTokens?: unknown[] };
    expect(updated.pushTokens).toHaveLength(0);
  });

  it("halts sends during quiet hours", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T23:30:00Z"));

    const { sendBulkPush } = await loadAdapter();
    await setupFirestore({
      "users/user-quiet": {
        timezone: "UTC",
        pushQuietHoursEnabled: true,
        pushQuietHoursStart: 22,
        pushQuietHoursEnd: 8,
      },
    });

    const result = await sendBulkPush(
      [{ token: JSON.stringify(subscription), type: "web" }],
      { title: "Night", body: "Quiet", userId: "user-quiet" },
    );

    expect(result.quietHours).toBe(true);
    expect(webPushMocks.sendNotification).not.toHaveBeenCalled();
  });

  it("routes device tokens through FCM and prunes invalid entries", async () => {
    const { sendBulkPush } = await loadAdapter();
    messagingMocks.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        },
      ],
    });
    const { store } = await setupFirestore({
      "users/user-fcm": {
        pushTokens: [
          { token: "keep-token", type: "fcm" },
          { token: "drop-token", type: "fcm" },
        ],
      },
    });

    const result = await sendBulkPush(
      [
        { token: "keep-token", type: "fcm" },
        { token: "drop-token", type: "fcm" },
      ],
      { title: "Hi", body: "Device", userId: "user-fcm" },
    );

    expect(result.successCount).toBe(1);
    expect(result.invalidTokens).toContain("drop-token");

    const updated = store.get("users/user-fcm") as { pushTokens?: Array<{ token: string }> };
    const tokens = updated.pushTokens ?? [];
    expect(tokens.map((token) => token.token)).toEqual(["keep-token"]);
  });
});
