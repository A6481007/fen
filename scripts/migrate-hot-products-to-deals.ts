import { writeClient } from "../sanity/lib/client.ts";

type Product = {
  _id: string;
  name?: string;
  price?: number;
  images?: unknown;
  slug?: { current?: string };
};

type DealDocument = {
  _type: "deal";
  dealId: string;
  dealType: "featured";
  title: string;
  product: { _type: "reference"; _ref: string };
  status: "active";
  dealPrice: number;
  originalPrice: number;
  badge: "HOT DEAL";
  showOnHomepage: true;
  priority: 1;
};

const HOT_PRODUCTS_QUERY = `*[_type == "product" && status == "hot" && !(_id in path("drafts.**"))]{
  _id,
  name,
  price,
  images,
  slug
}`;

const parseArgs = () => ({
  dryRun: process.argv.includes("--dry-run") || process.argv.includes("--dryRun"),
});

const normalizeId = (id: string) => id.replace(/^drafts\\./, "");

const formatProductLabel = (product: Product) => {
  if (product.name && product.name.trim().length > 0) {
    return `${product.name} (${product._id})`;
  }

  if (product.slug?.current) {
    return `${product.slug.current} (${product._id})`;
  }

  return product._id;
};

const buildDealDocument = (product: Product): DealDocument | null => {
  const hasPrice = typeof product.price === "number" && Number.isFinite(product.price);
  if (!hasPrice) {
    console.error(
      `[skip] Product ${formatProductLabel(product)} is missing a valid price; cannot create deal.`,
    );
    return null;
  }

  const normalizedProductId = normalizeId(product._id);
  const titleSource =
    typeof product.name === "string" && product.name.trim().length > 0
      ? product.name.trim()
      : product.slug?.current || normalizedProductId;

  return {
    _type: "deal",
    dealId: `legacy-hot-${normalizedProductId}`,
    dealType: "featured",
    title: `${titleSource} Deal`,
    product: { _type: "reference", _ref: normalizedProductId },
    status: "active",
    dealPrice: product.price as number,
    originalPrice: product.price as number,
    badge: "HOT DEAL",
    showOnHomepage: true,
    priority: 1,
  };
};

export const migrateHotProducts = async (dryRun = false) => {
  console.info(`Fetching hot products${dryRun ? " (dry run)" : ""}...`);

  let products: Product[] = [];

  try {
    products = await writeClient.fetch<Product[]>(HOT_PRODUCTS_QUERY);
  } catch (error) {
    console.error("Failed to fetch hot products from Sanity:", error);
    throw error;
  }

  if (products.length === 0) {
    console.info("No hot products found to migrate.");
    return;
  }

  console.info(`Found ${products.length} hot product(s) to migrate.`);

  let migrated = 0;
  let failures = 0;

  for (const product of products) {
    const dealDoc = buildDealDocument(product);
    if (!dealDoc) {
      failures += 1;
      continue;
    }

    if (dryRun) {
      console.info(
        `[dry-run] Would create deal ${dealDoc.dealId} for product ${formatProductLabel(product)}`,
      );
      migrated += 1;
      continue;
    }

    try {
      await writeClient.create(dealDoc);
      migrated += 1;
      console.info(
        `[created] Deal ${dealDoc.dealId} for product ${formatProductLabel(product)} (status preserved on product)`,
      );
    } catch (error) {
      failures += 1;
      console.error(
        `[failed] Could not create deal ${dealDoc.dealId} for product ${formatProductLabel(product)}`,
        error,
      );
    }
  }

  console.info(
    `Summary: ${migrated} products migrated${dryRun ? " (dry run)" : ""}, ${failures} failures.`,
  );
};

const { dryRun } = parseArgs();

await migrateHotProducts(dryRun).catch((error) => {
  console.error("Hot products migration failed:", error);
  process.exitCode = 1;
});
