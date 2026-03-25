// Order status constants
export const ORDER_STATUSES = {
  QUOTATION_REQUESTED: "quotation_requested",
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

// Payment status constants
export const PAYMENT_STATUSES = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  CREDIT_REQUESTED: "credit_requested",
  CREDIT_APPROVED: "credit_approved",
  CREDIT_REJECTED: "credit_rejected",
} as const;

// Payment methods
export const PAYMENT_METHODS = {
  CASH_ON_DELIVERY: "cash_on_delivery",
  STRIPE: "stripe",
  CLERK: "clerk",
  CARD: "card",
  CREDIT: "credit",
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];
export type PaymentStatus =
  (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];
export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];
