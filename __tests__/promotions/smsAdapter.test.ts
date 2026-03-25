import { afterEach, describe, expect, it, vi } from "vitest";

const twilioMocks = vi.hoisted(() => {
  const messagesCreate = vi.fn();
  const twilioClient = vi.fn(() => ({ messages: { create: messagesCreate } }));
  const validateRequest = vi.fn();

  return { messagesCreate, twilioClient, validateRequest };
});

vi.mock("twilio", () => ({
  default: twilioMocks.twilioClient,
  validateRequest: twilioMocks.validateRequest,
}));

const ORIGINAL_ENV = { ...process.env };
const BASE_ENV = {
  TWILIO_ACCOUNT_SID: "AC_TEST",
  TWILIO_AUTH_TOKEN: "secret",
  TWILIO_PHONE_NUMBER: "+15550000000",
  NEXT_PUBLIC_APP_URL: "https://example.com",
};

async function loadAdapter(envOverrides: Record<string, string | undefined> = {}) {
  vi.resetModules();

  Object.assign(process.env, ORIGINAL_ENV, BASE_ENV, envOverrides);

  twilioMocks.messagesCreate.mockReset();
  twilioMocks.twilioClient.mockReset();
  twilioMocks.twilioClient.mockReturnValue({ messages: { create: twilioMocks.messagesCreate } });
  twilioMocks.validateRequest.mockReset();
  twilioMocks.validateRequest.mockReturnValue(true);

  return import("@/lib/promotions/smsAdapter");
}

async function setupFirestore(initialData: Record<string, unknown> = {}) {
  const { adminDb } = await import("@/lib/firebaseAdmin");
  const store = new Map<string, unknown>(Object.entries(initialData));
  const writes: Array<{ type: string; path: string; data: unknown }> = [];

  const makeDoc = (path: string) => ({
    path,
    async get() {
      return { exists: store.has(path), data: () => store.get(path) ?? {} };
    },
    async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
      const current = (store.get(path) as Record<string, unknown>) ?? {};
      const next = options?.merge ? { ...current, ...data } : data;
      store.set(path, next);
      writes.push({ type: "set", path, data: next });
    },
    async update(data: Record<string, unknown>) {
      const current = (store.get(path) as Record<string, unknown>) ?? {};
      const next = { ...current, ...data };
      store.set(path, next);
      writes.push({ type: "update", path, data });
    },
    collection: (name: string) => makeCollection(`${path}/${name}`),
  });

  const makeCollection = (path: string) => ({
    doc: (id: string) => makeDoc(`${path}/${id}`),
  });

  const buildQuery = (
    docs: Array<{ ref: ReturnType<typeof makeDoc>; data: () => Record<string, unknown> }>,
  ) => ({
    docs,
    where: (field: string, _op: string, value: unknown) =>
      buildQuery(docs.filter((doc) => doc.data()?.[field] === value)),
    limit: (count: number) => buildQuery(docs.slice(0, count)),
    async get() {
      return { empty: docs.length === 0, docs };
    },
  });

  Object.assign(adminDb as Record<string, unknown>, {
    collection: vi.fn((name: string) => makeCollection(name)),
    collectionGroup: vi.fn((group: string) => {
      const matchingPaths = [...store.keys()].filter((path) =>
        path.split("/").includes(group),
      );
      const docs = matchingPaths.map((path) => ({
        ref: makeDoc(path),
        data: () => (store.get(path) as Record<string, unknown>) ?? {},
      }));
      return buildQuery(docs);
    }),
    batch: vi.fn(() => {
      const ops: Array<{
        ref: ReturnType<typeof makeDoc>;
        data: Record<string, unknown>;
        options?: { merge?: boolean };
      }> = [];

      return {
        set: (ref: ReturnType<typeof makeDoc>, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          ops.push({ ref, data, options });
        },
        commit: vi.fn(async () => {
          ops.forEach(({ ref, data, options }) => {
            const current = (store.get(ref.path) as Record<string, unknown>) ?? {};
            const next = options?.merge ? { ...current, ...data } : data;
            store.set(ref.path, next);
            writes.push({ type: "batchSet", path: ref.path, data: next });
          });
        }),
      };
    }),
    runTransaction: vi.fn(async (fn: (tx: unknown) => Promise<void> | void) =>
      fn({
        get: async (doc: { path: string }) => ({
          exists: store.has(doc.path),
          data: () => store.get(doc.path) ?? {},
        }),
        set: async (doc: { path: string }, data: Record<string, unknown>) =>
          store.set(doc.path, data),
        update: async (doc: { path: string }, data: Record<string, unknown>) =>
          store.set(doc.path, {
            ...(store.get(doc.path) as Record<string, unknown> | undefined),
            ...data,
          }),
      }),
    ),
  });

  return { adminDb, store, writes };
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
  vi.useRealTimers();
});

describe("smsAdapter", () => {
  it("detects quiet hours in user timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T23:30:00Z"));

    const { isQuietHours } = await loadAdapter();
    expect(isQuietHours("UTC")).toBe(true);
  });

  it("allows sends outside quiet hours", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T15:00:00Z"));

    const { isQuietHours } = await loadAdapter();
    expect(isQuietHours("UTC")).toBe(false);
  });

  it("builds message bodies with variable substitution and deeplink override", async () => {
    const { buildMessageBody } = await loadAdapter();

    const body = buildMessageBody(
      { body: "Hi {{ firstName }} - {{ link }}", variantA: "Deal {{discount}} -> {{link}}" },
      { firstName: "Ada", link: "https://old.example/offer", discount: "20%" },
      "https://new.example/deal",
      "variantA",
    );

    expect(body).toBe("Deal 20% -> https://new.example/deal");
  });

  it("blocks sends when daily limit is reached", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));

    const { checkRateLimits } = await loadAdapter();
    await setupFirestore({
      "smsRateLimits/user-1_2025-01-01": { count: 3 },
      "users/user-1/smsHistory/campaign-1": { count: 0 },
    });

    const result = await checkRateLimits("user-1", "campaign-1");

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/daily sms limit/i);
  });

  it("stops sends during quiet hours without calling Twilio", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T22:30:00Z"));

    const { sendPromoSMS } = await loadAdapter();

    const response = await sendPromoSMS({
      userId: "user-quiet",
      phone: "+15551234567",
      campaignId: "cmp-quiet",
      template: { body: "Hello" },
      variables: { timezone: "UTC" },
    });

    expect(response.quietHours).toBe(true);
    expect(response.success).toBe(false);
    expect(twilioMocks.messagesCreate).not.toHaveBeenCalled();
  });

  it("sends SMS, logs status, and updates rate limits", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T13:00:00Z"));

    const { sendPromoSMS } = await loadAdapter();
    const firestore = await setupFirestore();

    twilioMocks.messagesCreate.mockResolvedValue({ sid: "SM123" });

    const result = await sendPromoSMS({
      userId: "user-2",
      phone: "+15551230000",
      campaignId: "cmp-123",
      template: { body: "Hello {{firstName}}" },
      variables: { firstName: "Pat" },
      deeplink: "https://promo.example/link",
    });

    expect(result.success).toBe(true);
    expect(twilioMocks.messagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+15551230000",
        body: "Hello Pat",
      }),
    );

    const outboundWrite = firestore.writes.find((write) =>
      write.path.includes("promotions/cmp-123/outbound/SM123"),
    );
    expect(outboundWrite).toBeTruthy();

    expect(firestore.store.get("smsRateLimits/user-2_2025-01-01")).toMatchObject({ count: 1 });
    expect(firestore.store.get("users/user-2/smsHistory/cmp-123")).toMatchObject({ count: 1 });
  });

  it("normalizes params when validating signatures", async () => {
    const { validateTwilioSignature } = await loadAdapter();

    twilioMocks.validateRequest.mockReturnValue(true);

    const result = validateTwilioSignature("sig123", "https://example.com/api/webhooks/twilio/status?foo=1", {
      MessageSid: ["SM1", "SM2"],
      MessageStatus: "delivered",
    });

    expect(twilioMocks.validateRequest).toHaveBeenCalledWith(
      "secret",
      "sig123",
      "https://example.com/api/webhooks/twilio/status?foo=1",
      { MessageSid: "SM1,SM2", MessageStatus: "delivered" },
    );
    expect(result).toBe(true);
  });

  it("updates outbound documents on status callbacks", async () => {
    const { handleStatusCallback } = await loadAdapter();
    const firestore = await setupFirestore({
      "promotions/cmp-99/outbound/SM777": { messageId: "SM777", status: "sent" },
    });

    await handleStatusCallback("SM777", "delivered", "300");

    const updated = firestore.store.get(
      "promotions/cmp-99/outbound/SM777",
    ) as { status?: string; rawStatus?: string; errorCode?: string } | undefined;
    expect(updated?.status).toBe("delivered");
    expect(updated?.rawStatus).toBe("delivered");
    expect(updated?.errorCode).toBe("300");
  });
});
