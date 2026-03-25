import { writeClient } from "../sanity/lib/client.ts";

type LegacyOrder = {
  _id: string;
  orderNumber: string;
  purchaseOrder?: { number?: string; createdAt?: string; emailSentAt?: string };
  quotationRequestedAt?: string;
  orderDate?: string;
};

const LEGACY_ORDERS_QUERY = `*[_type == "order" && defined(purchaseOrder.number) && !(_id in path("drafts.**"))]{
  _id,
  orderNumber,
  purchaseOrder { number, createdAt, emailSentAt },
  quotationRequestedAt,
  orderDate
}`;

const parseArgs = () => ({
  dryRun: process.argv.includes("--dry-run") || process.argv.includes("--dryRun"),
});

const normalizeDateTime = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toISOString();
};

const resolveCreatedAt = (order: LegacyOrder) => {
  const candidates = [
    order.purchaseOrder?.createdAt,
    order.quotationRequestedAt,
    order.orderDate,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeDateTime(candidate);
    if (normalized) return normalized;
  }
  return new Date().toISOString();
};

async function backfillQuotations(dryRun = false) {
  console.log(
    `Starting quotation backfill${dryRun ? " (dry run)" : ""}...`,
  );

  const ordersWithQuotes = await writeClient.fetch<LegacyOrder[]>(
    LEGACY_ORDERS_QUERY,
  );

  if (!ordersWithQuotes || ordersWithQuotes.length === 0) {
    console.log("No legacy quotations found to migrate.");
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const order of ordersWithQuotes) {
    const { _id: orderId, orderNumber, purchaseOrder } = order;
    if (!purchaseOrder?.number) continue;

    const existingQuote = await writeClient.fetch<{ _id: string }[]>(
      `*[_type == "quotation" && order._ref == $orderId][0...1]`,
      { orderId },
    );
    if (existingQuote && existingQuote.length > 0) {
      console.log(
        `Order ${orderNumber} already has quotation documents, skipping (orderId=${orderId}).`,
      );
      skippedCount += 1;
      continue;
    }

    const quotationNumber = purchaseOrder.number;
    const createdAt = resolveCreatedAt(order);
    const emailSentAt = normalizeDateTime(purchaseOrder.emailSentAt);

    const newQuotation = {
      _type: "quotation",
      order: { _type: "reference", _ref: orderId },
      version: 1,
      number: quotationNumber,
      createdAt,
      ...(emailSentAt ? { emailSentAt } : {}),
    };

    if (dryRun) {
      migratedCount += 1;
      console.log(
        `[dry-run] Would migrate Order ${orderNumber} -> Quotation ${quotationNumber}`,
      );
      continue;
    }

    try {
      await writeClient.create(newQuotation);
      migratedCount += 1;
      console.log(
        `Migrated Order ${orderNumber} -> Quotation ${quotationNumber}`,
      );
    } catch (err) {
      failedCount += 1;
      console.error(
        `Failed to create quotation for order ${orderId} (${quotationNumber}):`,
        err,
      );
    }
  }

  console.log(
    `Backfill complete. Created ${migratedCount} quotation document(s).${dryRun ? " (dry run)" : ""}`,
  );
  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} order(s) with existing quotations.`);
  }
  if (failedCount > 0) {
    console.log(`Failed to migrate ${failedCount} order(s).`);
  }
}

const { dryRun } = parseArgs();

await backfillQuotations(dryRun).catch((error) => {
  console.error("Backfill encountered an error:", error);
  process.exitCode = 1;
});
