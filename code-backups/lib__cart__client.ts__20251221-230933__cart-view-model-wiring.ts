import type { Cart } from "./types";

export type CartLineInput = {
  productId: string;
  quantity: number;
  variantId?: string;
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

const parseResponse = async (response: Response): Promise<Cart> => {
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

  return data as Cart;
};

export async function apiAddItems(payload: AddItemsRequest): Promise<Cart> {
  const response = await fetch("/api/cart/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return parseResponse(response);
}

export async function apiGetCart(): Promise<Cart> {
  const response = await fetch("/api/cart", {
    method: "GET",
    cache: "no-store",
  });

  return parseResponse(response);
}

export async function apiUpdateLine(lineId: string, quantity: number): Promise<Cart> {
  const response = await fetch(`/api/cart/items/${lineId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
    cache: "no-store",
  });

  return parseResponse(response);
}

export async function apiRemoveLine(lineId: string): Promise<Cart> {
  const response = await fetch(`/api/cart/items/${lineId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  return parseResponse(response);
}

export async function apiClearCart(): Promise<Cart> {
  const response = await fetch("/api/cart", {
    method: "DELETE",
    cache: "no-store",
  });

  return parseResponse(response);
}
