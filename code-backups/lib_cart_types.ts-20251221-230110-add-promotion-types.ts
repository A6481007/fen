/**
 * Identifies how a discount should be calculated when applied to a cart or line item.
 * - `percentage`: `discountValue` represents a percent (e.g., 10 for 10%).
 * - `fixed_amount`: `discountValue` represents a currency amount to subtract.
 */
export type DiscountType = "percentage" | "fixed_amount";

/**
 * Metadata for a promotion or deal that has been applied to a cart or line item.
 */
export interface AppliedPromotion {
  /** Indicates whether the adjustment came from a promotion or a bundled deal. */
  type: "promotion" | "deal";
  /** Promotion or deal identifier (e.g., Sanity _id or campaign id). */
  id: string;
  /** Human-friendly name shown to customers and in receipts. */
  name: string;
  /** How to interpret `discountValue` when computing the price adjustment. */
  discountType: DiscountType;
  /** Raw discount value (percentage or currency) before it is applied. */
  discountValue: number;
  /** Absolute discount amount applied to the line or cart total. */
  discountAmount: number;
 /** Optional expiry timestamp for the applied promotion. */
  expiresAt?: string;
}

/**
 * Minimal snapshot of a product to hydrate cart lines without refetching.
 */
export interface CartProductSnapshot {
  id: string;
  slug?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  stock?: number | null;
  variant?: string | null;
  categories?: string[];
}

/**
 * Represents a single product row in the cart with optional promotion context.
 */
export interface CartItem {
  /** Unique cart line identifier (UUID). */
  id: string;
  /** Sanity `_id` reference for the product. */
  productId: string;
  /** Current product slug used for routing. */
  productSlug: string;
  /** Display name of the product at the time it was added. */
  productName: string;
  /** Optional variant identifier when the product has multiple options. */
  variantId?: string;
  /** Optional human-friendly variant label to render in the cart UI. */
  variantLabel?: string;
  /** Quantity of the product in the cart. */
  quantity: number;
  /** Original unit price before discounts. */
  unitPrice: number;
  /** Promotion or deal applied to this line item, if any. */
  appliedPromotion?: AppliedPromotion;
  /** Computed line total: `unitPrice * quantity - discountAmount`. */
  lineTotal: number;
  /** Snapshot of the product used when hydrating the cart response. */
  product?: CartProductSnapshot;
  /** Optional resolved image URL for the product or variant. */
  imageUrl?: string | null;
  /** Optional warnings or validation messages scoped to this line. */
  messages?: string[];
  /** Optional stock value to enable guardrails in the UI. */
  availableStock?: number | null;
}

/**
 * Captures a cart session, applied promotions, and computed totals.
 */
export interface Cart {
  /** Cart session identifier (stable per browser/session). */
  id: string;
  /** Optional user identifier when the shopper is authenticated. */
  userId?: string;
  /** All line items currently in the cart. */
  items: CartItem[];
  /** Promotions or deals applied at either the cart or line level. */
  appliedPromotions: AppliedPromotion[];
  /** Sum of `unitPrice * quantity` across all items before discounts. */
  subtotal: number;
  /** Sum of all discount amounts applied to the cart. */
  totalDiscount: number;
  /** Final total after discounts. */
 total: number;
  /** Creation timestamp for the cart session. */
  createdAt: string;
  /** Last-updated timestamp for the cart session. */
  updatedAt: string;
  /** Optional warnings (e.g., partial application of promos). */
  warnings?: string[];
  /** Optional cart-level errors when certain lines fail validation. */
  errors?: string[];
}

/**
 * Payload sent to the server to request promotion/deal quotes for a cart snapshot.
 */
export interface QuoteRequest {
  /** Cart identifier for idempotency and session tracking. */
  cartId: string;
  /** Optional authenticated user identifier. */
  userId?: string;
  /** Current items in the cart (used for server-side validation). */
  items: CartItem[];
  /** Promotion codes the shopper entered for validation. */
  promotionCodes?: string[];
  /** Promotions already applied client-side that should be revalidated. */
  activePromotionIds?: string[];
  /** Optional currency code to clarify pricing context. */
  currency?: string;
  /** Request correlation identifier for logging or retries. */
  requestId?: string;
}

/**
 * Server-calculated quote response detailing applied promotions and totals.
 */
export interface QuoteResponse {
  /** Cart identifier matching the quote request. */
  cartId: string;
  /** Items returned with any server-calculated promotion adjustments. */
  items: CartItem[];
  /** Promotions or deals applied after server validation. */
  appliedPromotions: AppliedPromotion[];
  /** Cart subtotal before discounts. */
  subtotal: number;
  /** Aggregate discount amount applied to the cart. */
  totalDiscount: number;
  /** Final total after all discounts. */
  total: number;
  /** Optional expiration timestamp for the quoted discounts. */
  expiresAt?: string;
  /** Optional warnings (e.g., partially applied codes or nearing expiry). */
  warnings?: string[];
}
