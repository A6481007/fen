import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderData, QuotationDocument } from "@/lib/quotationService";

const sanityMocks = vi.hoisted(() => ({
  client: { fetch: vi.fn() },
  writeClient: {
    fetch: vi.fn(),
    create: vi.fn(),
    patch: vi.fn(),
  },
}));

const emailMocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock("@/sanity/lib/client", () => ({
  client: sanityMocks.client,
  writeClient: sanityMocks.writeClient,
}));

vi.mock("@/lib/emailService", () => ({
  sendMail: emailMocks.sendMail,
}));

import { generateQuotation } from "@/lib/quotationService";

const baseOrder: OrderData = {
  _id: "order-1001",
  orderNumber: "1001",
  clerkUserId: "user-1",
  customerName: "Test Customer",
  email: "",
};

beforeEach(() => {
  sanityMocks.client.fetch.mockReset();
  sanityMocks.client.fetch.mockResolvedValue(null);
  sanityMocks.writeClient.fetch.mockReset();
  sanityMocks.writeClient.create.mockReset();
  sanityMocks.writeClient.patch.mockReset();
  sanityMocks.writeClient.patch.mockImplementation(() => ({
    set: vi.fn(() => ({ commit: vi.fn().mockResolvedValue({}) })),
  }));
  emailMocks.sendMail.mockReset();
});

describe("generateQuotation", () => {
  it("returns the same quotation on repeated calls without forceNewVersion", async () => {
    const createdQuotation: QuotationDocument = {
      _id: "quote-1",
      version: 1,
      number: "QT-1001",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    sanityMocks.writeClient.fetch
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdQuotation);
    sanityMocks.writeClient.create.mockResolvedValue(createdQuotation);

    const first = await generateQuotation(baseOrder._id, baseOrder.clerkUserId, {
      order: baseOrder,
      forceNewVersion: false,
    });
    const second = await generateQuotation(baseOrder._id, baseOrder.clerkUserId, {
      order: baseOrder,
      forceNewVersion: false,
    });

    expect(first.quotationId).toBe(createdQuotation._id);
    expect(second.quotationId).toBe(createdQuotation._id);
    expect(second.purchaseOrderNumber).toBe(createdQuotation.number);
    expect(sanityMocks.writeClient.create).toHaveBeenCalledTimes(1);
    expect(emailMocks.sendMail).not.toHaveBeenCalled();
  });

  it("creates a new quotation when forceNewVersion is true and one exists", async () => {
    const existingQuotation: QuotationDocument = {
      _id: "quote-1",
      version: 1,
      number: "QT-1001",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const createdQuotation: QuotationDocument = {
      _id: "quote-2",
      version: 2,
      number: "QT-1001-v2",
      createdAt: "2024-01-03T00:00:00.000Z",
    };

    sanityMocks.writeClient.fetch.mockResolvedValue(existingQuotation);
    sanityMocks.writeClient.create.mockResolvedValue(createdQuotation);

    const result = await generateQuotation(baseOrder._id, baseOrder.clerkUserId, {
      order: baseOrder,
      forceNewVersion: true,
    });

    expect(sanityMocks.writeClient.create).toHaveBeenCalledTimes(1);
    expect(sanityMocks.writeClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "quotation",
        version: 2,
        number: "QT-1001-v2",
      })
    );
    expect(result.quotationId).toBe(createdQuotation._id);
    expect(result.purchaseOrderNumber).toBe(createdQuotation.number);
    expect(emailMocks.sendMail).not.toHaveBeenCalled();
  });

  it("creates version 1 when forcing a new quotation without existing quotes", async () => {
    const createdQuotation: QuotationDocument = {
      _id: "quote-1",
      version: 1,
      number: "QT-1001",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    sanityMocks.writeClient.fetch.mockResolvedValue(null);
    sanityMocks.writeClient.create.mockResolvedValue(createdQuotation);

    const result = await generateQuotation(baseOrder._id, baseOrder.clerkUserId, {
      order: baseOrder,
      forceNewVersion: true,
    });

    expect(sanityMocks.writeClient.create).toHaveBeenCalledTimes(1);
    expect(sanityMocks.writeClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "quotation",
        version: 1,
        number: "QT-1001",
      })
    );
    expect(result.purchaseOrderNumber).toBe(createdQuotation.number);
    expect(emailMocks.sendMail).not.toHaveBeenCalled();
  });
});
