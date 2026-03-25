import { writeClient } from "../sanity/lib/client.ts";

type DocRef = { _id: string };

const parseArgs = () => ({
  dryRun: process.argv.includes("--dry-run") || process.argv.includes("--dryRun"),
});

const chunk = <T>(items: T[], size: number) => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

const fetchIds = async (query: string) =>
  writeClient.fetch<DocRef[]>(query);

const patchDocs = async (
  docs: DocRef[],
  unsetPaths: string[],
  label: string,
  dryRun: boolean
) => {
  console.log(`${label}: ${docs.length} document(s)`);
  if (docs.length === 0) return;

  if (dryRun) {
    console.log(`[dry-run] Skipping write for ${label}.`);
    return;
  }

  const batches = chunk(docs, 50);
  let processed = 0;
  for (const batch of batches) {
    let tx = writeClient.transaction();
    batch.forEach((doc) => {
      tx = tx.patch(doc._id, { unset: unsetPaths });
    });
    await tx.commit();
    processed += batch.length;
  }

  console.log(`${label}: updated ${processed} document(s).`);
};

const ADDRESS_QUERY = `*[_type == "address" && defined(office) && !(_id in path("drafts.**"))]{ _id }`;
const ORDER_QUERY = `*[_type == "order" && (defined(address.office) || defined(quotationDetails.office)) && !(_id in path("drafts.**"))]{ _id }`;
const QUOTATION_QUERY = `*[_type == "quotation" && defined(quotationDetails.office) && !(_id in path("drafts.**"))]{ _id }`;

const run = async () => {
  const { dryRun } = parseArgs();

  if (!process.env.SANITY_API_TOKEN) {
    console.warn(
      "SANITY_API_TOKEN is not set; write operations may fail without a write token."
    );
  }

  const addressDocs = await fetchIds(ADDRESS_QUERY);
  const orderDocs = await fetchIds(ORDER_QUERY);
  const quotationDocs = await fetchIds(QUOTATION_QUERY);

  await patchDocs(addressDocs, ["office"], "Address docs", dryRun);
  await patchDocs(
    orderDocs,
    ["address.office", "quotationDetails.office"],
    "Order docs",
    dryRun
  );
  await patchDocs(
    quotationDocs,
    ["quotationDetails.office"],
    "Quotation docs",
    dryRun
  );
};

run().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exitCode = 1;
});
