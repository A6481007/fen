import { useEffect, useRef, useState } from "react";
import { PatchEvent, defineField, defineType, set, useClient, useFormValue } from "sanity";
import { DealStatusInput } from "../components/ScheduleStatusCard";

const SANITY_API_VERSION = "2023-10-01";
const DEAL_TYPE_NAME = "deal";
const DEAL_TYPE_OPTIONS = [
  { title: "Featured", value: "featured" },
  { title: "Price Drop", value: "priceDrop" },
  { title: "Limited Qty", value: "limitedQty" },
  { title: "Daily", value: "daily" },
  { title: "Clearance", value: "clearance" },
] as const;

const DEAL_STATUS_OPTIONS = [
  { title: "Draft", value: "draft" },
  { title: "Active", value: "active" },
  { title: "Ended", value: "ended" },
] as const;

const normalizeId = (id?: string | null) => (typeof id === "string" ? id.replace(/^drafts\./, "") : null);
const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const getDoc = (context: { document?: unknown } | any) => (context?.document ?? {}) as Record<string, any>;
const getDealType = (doc: Record<string, any>) => (typeof doc?.dealType === "string" ? doc.dealType : null);
const getStatus = (doc: Record<string, any>) => (typeof doc?.status === "string" ? doc.status : null);
const isLimitedQty = (doc: Record<string, any>) => getDealType(doc) === "limitedQty";
const isDaily = (doc: Record<string, any>) => getDealType(doc) === "daily";
const isFeatured = (doc: Record<string, any>) => getDealType(doc) === "featured";
const isClearance = (doc: Record<string, any>) => getDealType(doc) === "clearance";
const hasSchedule = (doc: Record<string, any>) => Boolean(doc?.startDate || doc?.endDate);
const getDateValue = (value: unknown): number | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
};
const isWithinWindow = (doc: Record<string, any>, now = Date.now()) => {
  const start = getDateValue(doc?.startDate);
  const end = getDateValue(doc?.endDate);
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
};
const getBasePrice = (originalPrice: number | null, productPrice: number | null) => {
  if (originalPrice !== null && !Number.isNaN(originalPrice)) return originalPrice;
  if (productPrice !== null && !Number.isNaN(productPrice)) return productPrice;
  return null;
};

const useProductPrice = (productRefId?: string) => {
  const client = useClient({ apiVersion: SANITY_API_VERSION });
  const [productPrice, setProductPrice] = useState<number | null>(null);
  const fetchedProductIdRef = useRef<string | null>(null);
  const normalizedId = normalizeId(productRefId);

  useEffect(() => {
    if (!normalizedId) {
      fetchedProductIdRef.current = null;
      setProductPrice(null);
      return;
    }

    if (fetchedProductIdRef.current === normalizedId) {
      return;
    }

    let cancelled = false;
    fetchedProductIdRef.current = normalizedId;

    client
      .fetch<number | null>("*[_id == $id][0].price", { id: normalizedId })
      .then((price) => {
        if (cancelled) return;
        setProductPrice(typeof price === "number" && !Number.isNaN(price) ? price : null);
      })
      .catch((error) => {
        console.error("Failed to fetch product price for deal", error);
        if (!cancelled) setProductPrice(null);
      });

    return () => {
      cancelled = true;
    };
  }, [client, normalizedId]);

  return productPrice;
};

const DiscountPercentInput = (props: any) => {
  const { renderDefault, onChange, value, readOnly } = props;
  const originalPrice = useFormValue(["originalPrice"]) as number | null;
  const dealPrice = useFormValue(["dealPrice"]) as number | null;
  const productRef = useFormValue(["product"]) as { _ref?: string } | null;
  const productPrice = useProductPrice(productRef?._ref);
  const isReadOnly = Boolean(readOnly || props?.schemaType?.readOnly);

  useEffect(() => {
    if (!onChange || isReadOnly) {
      return;
    }

    const basePrice = getBasePrice(
      typeof originalPrice === "number" && !Number.isNaN(originalPrice) ? originalPrice : null,
      productPrice
    );
    const activeDealPrice = typeof dealPrice === "number" && !Number.isNaN(dealPrice) ? dealPrice : null;

    if (!basePrice || basePrice <= 0 || !activeDealPrice || activeDealPrice <= 0) {
      if (value !== null && value !== undefined) {
        onChange(PatchEvent.from([set(null)]));
      }
      return;
    }

    const rawPercent = ((basePrice - activeDealPrice) / basePrice) * 100;
    const normalizedPercent = Math.max(0, Number(rawPercent.toFixed(2)));
    const currentValue = typeof value === "number" && !Number.isNaN(value) ? value : null;

    if (currentValue !== normalizedPercent) {
      onChange(PatchEvent.from([set(normalizedPercent)]));
    }
  }, [dealPrice, originalPrice, productPrice, onChange, isReadOnly, value]);

  return renderDefault({
    ...props,
    elementProps: { ...(props.elementProps || {}), readOnly: true },
  });
};

const BasePriceUsedInput = (props: any) => {
  const { renderDefault } = props;
  const originalPrice = useFormValue(["originalPrice"]) as number | null;
  const productRef = useFormValue(["product"]) as { _ref?: string } | null;
  const productPrice = useProductPrice(productRef?._ref);
  const basePrice = getBasePrice(originalPrice ?? null, productPrice);
  const usingOriginal = typeof originalPrice === "number" && !Number.isNaN(originalPrice);
  const label = usingOriginal ? "Base price (originalPrice)" : "Base price (product.price)";
  const displayValue = basePrice !== null ? `${label}: ${basePrice}` : "Base price unavailable";

  return renderDefault({
    ...props,
    value: displayValue,
    elementProps: { ...(props.elementProps || {}), readOnly: true },
  });
};

const RemainingQtyDisplay = (props: any) => {
  const { renderDefault } = props;
  const quantityLimit = useFormValue(["quantityLimit"]) as number | null;
  const soldCount = useFormValue(["soldCount"]) as number | null;
  const limit = toNumberOrNull(quantityLimit);
  const sold = toNumberOrNull(soldCount) ?? 0;

  const remaining = limit === null ? "Unlimited" : Math.max(limit - sold, 0);
  const displayValue = limit === null ? "Unlimited" : String(remaining);

  return renderDefault({
    ...props,
    value: displayValue,
    elementProps: { ...(props.elementProps || {}), readOnly: true },
  });
};

const getDealTypeLabel = (dealType?: string | null) =>
  DEAL_TYPE_OPTIONS.find((option) => option.value === dealType)?.title || dealType || "Deal";

export const dealType = defineType({
  name: DEAL_TYPE_NAME,
  title: "Deal",
  type: "document",
  groups: [
    { name: "main", title: "Deal Info", default: true },
    { name: "pricing", title: "Pricing" },
    { name: "display", title: "Display" },
    { name: "schedule", title: "Schedule" },
    { name: "limits", title: "Limits" },
  ],
  fieldsets: [
    { name: "identifiers", title: "Identifiers" },
    { name: "classification", title: "Classification" },
    { name: "content", title: "Content" },
    { name: "priceInputs", title: "Price Inputs" },
    { name: "computed", title: "Computed", options: { collapsible: true, collapsed: true } },
    { name: "badge", title: "Badge" },
    { name: "placement", title: "Placement" },
    { name: "window", title: "Schedule Window" },
    { name: "caps", title: "Limits" },
    { name: "telemetry", title: "Telemetry", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({
      name: "dealId",
      title: "Deal ID",
      type: "string",
      group: "main",
      fieldset: "identifiers",
      description: 'Unique identifier, e.g., "deal-2025-001".',
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          const idValue = (value as string | undefined)?.trim();
          if (!idValue) {
            return "Deal ID is required";
          }

          const client = context.getClient?.({ apiVersion: SANITY_API_VERSION });
          if (!client) {
            return true;
          }

          const docId = (context.document as { _id?: string } | undefined)?._id || "";
          const baseId = docId.replace(/^drafts\./, "");

          const existingId = await client.fetch<string | null>(
            '*[_type == $type && dealId == $dealId && !(_id in [$draftId, $publishedId])][0]._id',
            {
              type: DEAL_TYPE_NAME,
              dealId: idValue,
              draftId: `drafts.${baseId}`,
              publishedId: baseId,
            }
          );

          return existingId ? "Deal ID must be unique" : true;
        }),
    }),
    defineField({
      name: "dealType",
      title: "Deal Type",
      type: "string",
      options: { list: DEAL_TYPE_OPTIONS, layout: "dropdown" },
      group: "main",
      fieldset: "classification",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: DEAL_STATUS_OPTIONS,
        layout: "dropdown",
      },
      initialValue: "draft",
      group: "main",
      fieldset: "classification",
      validation: (Rule) => [
        Rule.required(),
        Rule.custom((status, context) => {
          const doc = getDoc(context);
          if (status === "active") {
            const start = getDateValue(doc.startDate);
            if (start && start > Date.now()) {
              return "Active but starts in the future; won’t render until startDate.";
            }
          }
          return true;
        }).warning(),
        Rule.custom((status, context) => {
          const doc = getDoc(context);
          if (status === "active") {
            const end = getDateValue(doc.endDate);
            if (end && end < Date.now()) {
              return "Active but already ended; won’t render.";
            }
          }
          return true;
        }).warning(),
        Rule.custom((status, context) => {
          const doc = getDoc(context);
          if (status === "ended") {
            const end = getDateValue(doc.endDate);
            if (end && end > Date.now()) {
              return "Ended but endDate is in the future; confirm status.";
            }
          }
          return true;
        }).warning(),
        Rule.custom((status, context) => {
          const doc = getDoc(context);
          if (status === "draft" && hasSchedule(doc) && isWithinWindow(doc)) {
            return "Draft within window; won’t render until Active.";
          }
          return true;
        }).warning(),
      ],
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "main",
      fieldset: "content",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "product",
      title: "Product",
      type: "reference",
      to: [{ type: "product" }],
      options: { disableNew: true },
      group: "main",
      fieldset: "content",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "originalPrice",
      title: "Original Price",
      type: "number",
      description: "Optional; if omitted, product.price is used as base for discountPercent.",
      group: "pricing",
      fieldset: "priceInputs",
      validation: (Rule) => [
        Rule.min(0.01),
        Rule.custom((originalPrice, context) => {
          const doc = getDoc(context);
          const dealPrice = toNumberOrNull(doc.dealPrice);
          const original = toNumberOrNull(originalPrice);
          if (original !== null && dealPrice !== null && dealPrice > original) {
            return "Deal price is higher than original price; discountPercent will be clamped to 0.";
          }
          return true;
        }).warning(),
      ],
    }),
    defineField({
      name: "dealPrice",
      title: "Deal Price",
      type: "number",
      description: "Required; this is the enforced price returned by `/api/deals/quote` when deal is eligible.",
      group: "pricing",
      fieldset: "priceInputs",
      validation: (Rule) => [
        Rule.required(),
        Rule.min(0.01),
        Rule.custom((dealPrice, context) => {
          const doc = getDoc(context);
          const original = toNumberOrNull(doc.originalPrice);
          const deal = toNumberOrNull(dealPrice);
          if (original !== null && deal !== null && deal >= original) {
            return "Deal price is not lower than original price; discountPercent will read as 0%. Is this intended?";
          }
          return true;
        }).warning(),
      ],
    }),
    defineField({
      name: "discountPercent",
      title: "Discount Percent",
      type: "number",
      readOnly: true,
      description: "Auto-calculated from original/product price and deal price.",
      group: "pricing",
      fieldset: "computed",
      initialValue: 0,
      components: { input: DiscountPercentInput },
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "basePriceUsed",
      title: "Base Price Used",
      type: "string",
      readOnly: true,
      description: "Display-only; shows which price is used to calculate discountPercent.",
      group: "pricing",
      fieldset: "computed",
      components: { input: BasePriceUsedInput },
    }),
    defineField({
      name: "badge",
      title: "Badge",
      type: "string",
      group: "display",
      fieldset: "badge",
      validation: (Rule) =>
        Rule.custom((badgeValue, context) => {
          const doc = getDoc(context);
          if (isClearance(doc) && !badgeValue) {
            return 'Clearance deals typically include a badge (e.g., "Clearance").';
          }
          return true;
        }).warning(),
    }),
    defineField({
      name: "badgeColor",
      title: "Badge Color",
      type: "string",
      description: "Hex color (e.g., #FF5733).",
      group: "display",
      fieldset: "badge",
      hidden: (context) => {
        const doc = getDoc(context);
        return !doc?.badge;
      },
      validation: (Rule) =>
        Rule.custom((value) => {
          if (!value) return true;
          const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
          return hexPattern.test(value) ? true : "Badge color should be a valid hex (#RGB or #RRGGBB).";
        }).warning(),
    }),
    defineField({
      name: "showOnHomepage",
      title: "Show on Homepage",
      type: "boolean",
      group: "display",
      fieldset: "placement",
      initialValue: false,
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          if (isFeatured(doc) && value === false) {
            return "Featured deals usually surface on the homepage.";
          }
          return true;
        }).warning(),
    }),
    defineField({
      name: "priority",
      title: "Priority",
      type: "number",
      group: "display",
      fieldset: "placement",
      initialValue: 0,
      hidden: (context) => {
        const doc = getDoc(context);
        return doc?.showOnHomepage !== true && !isFeatured(doc);
      },
      validation: (Rule) => [
        Rule.min(0),
        Rule.custom((priority, context) => {
          const doc = getDoc(context);
          if (doc?.showOnHomepage === true && (priority === undefined || priority === null)) {
            return "Homepage ordering uses priority; set a value.";
          }
          return true;
        }).warning(),
      ],
    }),
    defineField({
      name: "startDate",
      title: "Start Date",
      type: "datetime",
      group: "schedule",
      fieldset: "window",
      validation: (Rule) => [
        Rule.custom((startDate, context) => {
          const doc = getDoc(context);
          if (isDaily(doc) && (!doc?.startDate || !doc?.endDate)) {
            return "Daily deals should have a 24h window; pair start/end dates.";
          }
          return true;
        }).warning(),
        Rule.custom((startDate, context) => {
          const doc = getDoc(context);
          const start = getDateValue(startDate);
          const end = getDateValue(doc?.endDate);
          if (isDaily(doc) && start && end) {
            const durationHours = (end - start) / (1000 * 60 * 60);
            if (durationHours > 30 || durationHours < 18) {
              return "Daily deal window is not ~24h; confirm schedule.";
            }
          }
          return true;
        }).warning(),
      ],
    }),
    defineField({
      name: "endDate",
      title: "End Date",
      type: "datetime",
      group: "schedule",
      fieldset: "window",
      validation: (Rule) => [
        Rule.custom((endDate, context) => {
          const startDate = getDoc(context)?.startDate;
          if (startDate && endDate && new Date(endDate as string) <= new Date(startDate)) {
            return "End date must be after start date";
          }
          return true;
        }),
      ],
    }),
    defineField({
      name: "statusOverview",
      title: "Status & Limits",
      type: "string",
      group: "schedule",
      fieldset: "window",
      components: { input: DealStatusInput },
      readOnly: true,
      description: "Preview of live/scheduled/ended state plus remaining quantity guardrails.",
    }),
    defineField({
      name: "quantityLimit",
      title: "Quantity Limit",
      type: "number",
      description: "Total cap enforced by quote API (remaining = quantityLimit - soldCount).",
      group: "limits",
      fieldset: "caps",
      validation: (Rule) => [
        Rule.min(0),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          if (isLimitedQty(doc)) {
            const limit = toNumberOrNull(value);
            if (limit === null || limit < 1) {
              return "Quantity limit is required and must be at least 1 for limitedQty deals.";
            }
          }
          return true;
        }),
        Rule.custom((value, context) => {
          const doc = getDoc(context);
          const limit = toNumberOrNull(value);
          const sold = toNumberOrNull(doc?.soldCount);
          if (limit !== null && sold !== null && sold > limit) {
            const status = getStatus(doc);
            if (status === "active") {
              return "Oversold vs cap; remainingQty negative; quote API will reject further units.";
            }
            return "Oversold vs cap; adjust limits or soldCount before activating.";
          }
          return true;
        }).warning(),
      ],
    }),
    defineField({
      name: "perCustomerLimit",
      title: "Per Customer Limit",
      type: "number",
      description: "Enforced downstream in cart flows; align with marketing copy.",
      group: "limits",
      fieldset: "caps",
      initialValue: 1,
      validation: (Rule) => [
        Rule.min(1),
        Rule.custom((perCustomerLimit, context) => {
          const doc = getDoc(context);
          const limit = toNumberOrNull(doc?.quantityLimit);
          const perCustomer = toNumberOrNull(perCustomerLimit);
          if (limit !== null && perCustomer !== null && perCustomer > limit) {
            return "Per customer limit exceeds total quantityLimit.";
          }
          return true;
        }).warning(),
      ],
    }),
    defineField({
      name: "soldCount",
      title: "Sold Count",
      type: "number",
      readOnly: true,
      description: "Read-only telemetry; updated by system.",
      group: "limits",
      fieldset: "telemetry",
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "remainingQty",
      title: "Remaining Qty",
      type: "string",
      readOnly: true,
      description: "Display-only; computed from quantityLimit and soldCount.",
      group: "limits",
      fieldset: "telemetry",
      hidden: (context) => {
        const doc = getDoc(context);
        return toNumberOrNull(doc?.quantityLimit) === null;
      },
      components: { input: RemainingQtyDisplay },
    }),
  ],
  preview: {
    select: {
      title: "title",
      dealType: "dealType",
      status: "status",
      productName: "product->name",
      media: "product->images.0",
      showOnHomepage: "showOnHomepage",
      startDate: "startDate",
      endDate: "endDate",
      dealPrice: "dealPrice",
      discountPercent: "discountPercent",
    },
    prepare({ title, dealType, status, productName, media, showOnHomepage, startDate, endDate, dealPrice, discountPercent }) {
      const dealLabel = getDealTypeLabel(dealType);
      const statusLabel = status || "draft";
      const productLabel = productName ? ` • ${productName}` : "";
      const homepageLabel = showOnHomepage ? " (Homepage)" : "";

      const priceLabel =
        typeof dealPrice === "number"
          ? ` • ${dealPrice}${typeof discountPercent === "number" ? ` (${discountPercent}% off)` : ""}`
          : "";

      const windowLabel =
        startDate || endDate
          ? ` • ${startDate ? new Date(startDate).toLocaleDateString() : "…"} → ${endDate ? new Date(endDate).toLocaleDateString() : "…"}`
          : "";

      return {
        title,
        subtitle: `${dealLabel} • ${statusLabel}${homepageLabel}${productLabel}${priceLabel}${windowLabel}`,
        media,
      };
    },
  },
});
