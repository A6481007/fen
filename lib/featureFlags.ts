export const NEW_QUOTE_FEATURE =
  process.env.NEXT_PUBLIC_ENABLE_NEW_QUOTATIONS === "true";
export const REQUEST_QUOTE_FROM_CART_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_CART_QUOTE_REQUESTS === "true";

export const LEGACY_BLOG_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_LEGACY_BLOG === "true";

export const BANNERS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_BANNERS !== "false";

export const ADMIN_STUDIO_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_ADMIN_STUDIO === "true";
