import type { CartReorderResponse, CartResponsePayload } from "./types";

export type CartLineInput = {
  productId: string;
  quantity: number;
  variantId?: string;
  priceOptionId?: string;
  priceOptionLabel?: string;
  productName?: string;
  productSlug?: string;
  unitPrice?: number;
};

export interface AddItemsRequest {
  items: CartLineInput[];
  dealId?: string;
  promotionId?: string;
  promoCode?: string;
}

export interface ReorderRequest {
  orderId?: string;
  items?: CartLineInput[];
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let data: any = null;

  try {
    data = isJson ? await response.json() : await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected cart response";
    throw new Error(message);
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.reason)) ||
      (typeof data === "string" ? data : "Unable to update cart");
    throw new Error(message);
  }

  return data as T;
};

export async function apiAddItems(payload: AddItemsRequest): Promise<CartResponsePayload> {
  const response = await fetch("/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return parseResponse<CartResponsePayload>(response);
}

export async function apiReorder(payload: ReorderRequest): Promise<CartReorderResponse> {
  const response = await fetch("/api/cart/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return parseResponse<CartReorderResponse>(response);
}

export async function apiGetCart(): Promise<CartResponsePayload> {
  const response = await fetch("/api/cart", {
    method: "GET",
    cache: "no-store",
  });

  return parseResponse<CartResponsePayload>(response);
}

export async function apiRefreshCart(): Promise<CartResponsePayload> {
  const response = await fetch("/api/cart", {
    method: "PATCH",
    cache: "no-store",
  });

  return parseResponse<CartResponsePayload>(response);
}

export async function apiUpdateLine(lineId: string, quantity: number): Promise<CartResponsePayload> {
  const response = await fetch(`/api/cart/items/${lineId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
    cache: "no-store",
  });

  return parseResponse<CartResponsePayload>(response);
}

export async function apiRemoveLine(lineId: string): Promise<CartResponsePayload> {
  const response = await fetch(`/api/cart/items/${lineId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  return parseResponse<CartResponsePayload>(response);
}

export async function apiClearCart(options?: { keepalive?: boolean }): Promise<CartResponsePayload> {
  const response = await fetch("/api/cart", {
    method: "DELETE",
    cache: "no-store",
    keepalive: options?.keepalive,
  });

  return parseResponse<CartResponsePayload>(response);
}

export async function apiApplyPromoCode(code: string): Promise<CartResponsePayload> {
  const response = await fetch("/api/cart/promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  });

  return parseResponse<CartResponsePayload>(response);
}

export async function apiRemovePromoCode(code?: string): Promise<CartResponsePayload> {
  const response = await fetch("/api/cart/promo", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(code ? { code } : {}),
    cache: "no-store",
  });

  return parseResponse<CartResponsePayload>(response);
}
