# Deals Guide

Documentation for creating and operating Deals managed in Sanity Studio and enforced by the storefront and deal quote API.

## Deal Types & Use Cases

- **featured** — Curated hero deals for homepage and navigation.
- **priceDrop** — Highlight a lower-than-usual price for a SKU.
- **limitedQty** — Scarcity-driven offers with quantity caps.
- **daily** — 24-hour rotating offers; pair with start/end dates.
- **clearance** — End-of-life or overstock cleanup.

## How to Set Up a Deal (Studio)

1. In Studio, open **Deals → New Deal**.
2. Fill basics: `dealId` (unique), `dealType`, `title`, and select a `product` (references existing products only).
3. Pricing: set `dealPrice` (required) and optional `originalPrice` (falls back to product price). `discountPercent` auto-calculates.
4. Display: add `badge`/`badgeColor`, toggle `showOnHomepage`, and set `priority` for ordering.
5. Schedule: set optional `startDate`/`endDate`. Status must be `active` inside the window to render.
6. Limits: configure `quantityLimit` (total cap) and `perCustomerLimit`; `soldCount` stays read-only for telemetry.
7. Publish; the /deal page, PDP widgets, and `/api/deals/quote` will use these settings for pricing and gating.

## Cart & Add to Cart

- Storefront add-to-cart calls `POST /api/cart/add` with `{ dealId, items: [{ productId, quantity }] }` and reuses `/api/deals/quote` for status/schedule/qty validation and pricing.
- UI disables the CTA when status is not `active`, the schedule window is closed, or `remainingQty` <= 0; API errors surface in toasts.
- Cart responses include the applied deal metadata and totals so downstream pages can render badges/discounts consistently.

## Quantity Limits & Inventory

- The quote API enforces status, schedule window, and `quantityLimit` minus `soldCount`; requests above the remainingQty are rejected.
- `perCustomerLimit` is enforced downstream in cart flows; keep it aligned with marketing copy.
- When `originalPrice` is omitted, the product price is used as the base for discountPercent math; keep product pricing accurate.

## Migration from Legacy "Hot" Products

- Script: `pnpm ts-node scripts/migrate-hot-products-to-deals.ts --dry-run` to preview, omit the flag to write.
- The script creates **featured** deals with `dealId` `legacy-hot-<productId>` for products tagged `status == "hot"`, preserving price and surfacing on the homepage.
- Rollback: delete the created deal documents if migration results are not desired.
