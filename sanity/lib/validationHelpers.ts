import { SanityClient } from "sanity";

// Check if email is unique across users
export async function isEmailUnique(
  client: SanityClient,
  email: string,
  currentDocId?: string
): Promise<boolean> {
  const query = currentDocId
    ? `count(*[_type == "user" && email == $email && _id != $id])`
    : `count(*[_type == "user" && email == $email])`;

  const params = currentDocId ? { email, id: currentDocId } : { email };
  const count = await client.fetch<number>(query, params);

  return count === 0;
}

// Check if SKU is unique across products
export async function isSkuUnique(
  client: SanityClient,
  sku: string,
  currentDocId?: string
): Promise<boolean> {
  if (!sku) return true;

  const query = currentDocId
    ? `count(*[_type == "product" && sku == $sku && _id != $id])`
    : `count(*[_type == "product" && sku == $sku])`;

  const params = currentDocId ? { sku, id: currentDocId } : { sku };
  const count = await client.fetch<number>(query, params);

  return count === 0;
}

// Check if order number is unique
export async function isOrderNumberUnique(
  client: SanityClient,
  orderNumber: string,
  currentDocId?: string
): Promise<boolean> {
  const query = currentDocId
    ? `count(*[_type == "order" && orderNumber == $orderNumber && _id != $id])`
    : `count(*[_type == "order" && orderNumber == $orderNumber])`;

  const params = currentDocId
    ? { orderNumber, id: currentDocId }
    : { orderNumber };
  const count = await client.fetch<number>(query, params);

  return count === 0;
}

// Validate stock availability for order
export async function validateStockForOrder(
  client: SanityClient,
  products: Array<{ product: { _ref: string }; quantity: number }>
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  for (const item of products) {
    if (!item.product?._ref) continue;

    const product = await client.fetch<{ name: string; stock: number } | null>(
      `*[_type == "product" && _id == $id][0] { name, stock }`,
      { id: item.product._ref }
    );

    if (!product) {
      issues.push(`Product not found: ${item.product._ref}`);
      continue;
    }

    if (product.stock < item.quantity) {
      issues.push(
        `Insufficient stock for "${product.name}": requested ${item.quantity}, available ${product.stock}`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// Validate promotion dates
export function validatePromotionDates(
  startDate: string | undefined,
  endDate: string | undefined
): { valid: boolean; message?: string } {
  if (!startDate || !endDate) {
    return { valid: true };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return {
      valid: false,
      message: "End date must be after start date",
    };
  }

  return { valid: true };
}

// Calculate and validate category depth
export async function getCategoryDepth(
  client: SanityClient,
  categoryId: string
): Promise<number> {
  let depth = 0;
  let currentId = categoryId;

  while (currentId) {
    const parent = await client.fetch<
      { parentCategory?: { _ref: string } } | null
    >(
      `*[_type == "category" && _id == $id][0] { parentCategory }`,
      { id: currentId.replace(/^drafts\\./, "") }
    );

    if (!parent?.parentCategory?._ref) break;

    depth++;
    currentId = parent.parentCategory._ref;

    // Prevent infinite loops
    if (depth > 10) break;
  }

  return depth;
}
