"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { PromotionAddToCartButton } from "./PromotionAddToCartButton";
import type { CartLineInput } from "@/lib/cart/client";
import { image } from "@/sanity/image";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import ShareButton from "@/components/shared/ShareButton";
import { buildPromotionHref } from "@/lib/promotions/paths";
import "@/app/i18n";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;
type PromotionProductRef = {
  _id?: string;
  _ref?: string;
  id?: string;
  name?: string;
  slug?: { current?: string | null } | string | null;
  price?: number | null;
  variant?: { _id?: string; _ref?: string; slug?: { current?: string | null } } | string | null;
  variantId?: string | null;
};

export interface PromotionCardProps {
  promotion: Promotion;
  variant?: "default" | "compact" | "horizontal";
  showCountdown?: boolean;
  showAddToCart?: boolean;
  onAddToCart?: () => void;
  onClick?: () => void;
  className?: string;
}

const typeIcons: Record<string, string> = {
  flashSale: "FS",
  seasonal: "SN",
  bundle: "BD",
  loyalty: "VIP",
  clearance: "CL",
  winBack: "WB",
  priceDrop: "PD",
  deal: "DL",
};

export function PromotionCard({
  promotion,
  variant = "default",
  showCountdown = true,
  showAddToCart = false,
  onAddToCart,
  onClick,
  className = "",
}: PromotionCardProps) {
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const { items: defaultItems, issues: defaultItemIssues } = useMemo(
    () => buildDefaultItems(promotion, t),
    [promotion, t]
  );
  const isBxgy = promotion.discountType === "bxgy" || promotion.type === "bundle";
  const hasBundleShape = !isBxgy || defaultItems.length >= 2;

  const now = Date.now();
  const startMs = promotion.startDate ? new Date(promotion.startDate).getTime() : NaN;
  const endMs = promotion.endDate ? new Date(promotion.endDate).getTime() : NaN;
  const withinWindow =
    (Number.isNaN(startMs) || startMs <= now) && (Number.isNaN(endMs) || endMs >= now);
  const isLive =
    (promotion.isActive === true || promotion.status === "active") && withinWindow;
  const isScheduledWindow =
    promotion.status === "scheduled" && withinWindow && promotion.isUpcoming !== true;
  const canAutoAdd =
    showAddToCart &&
    !isBxgy &&
    (isLive || isScheduledWindow) &&
    defaultItems.length > 0 &&
    hasBundleShape &&
    defaultItemIssues.length === 0;
  const autoAddIssues = useMemo(() => {
    const issues = new Set(defaultItemIssues);
    if (!hasBundleShape && isBxgy) {
      issues.add(t("client.promotions.card.issue.bundleDefaults"));
    }
    return Array.from(issues);
  }, [defaultItemIssues, hasBundleShape, isBxgy, t]);
  const thumbnailUrl = getImageUrl(promotion.thumbnailImage) || getImageUrl(promotion.heroImage);

  useEffect(() => {
    if (!showCountdown) {
      setTimeRemaining("");
      return;
    }

    const endTime = new Date(promotion.endDate).getTime();
    if (Number.isNaN(endTime)) {
      setTimeRemaining("");
      return;
    }

    const updateTime = () => {
      const nowMs = Date.now();
      const diff = endTime - nowMs;

      if (diff <= 0) {
        setTimeRemaining(t("client.promotions.card.ended"));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(t("client.promotions.card.timeLeftDays", { days, hours }));
      } else if (hours > 0) {
        setTimeRemaining(t("client.promotions.card.timeLeftHours", { hours, minutes }));
      } else {
        setTimeRemaining(t("client.promotions.card.timeLeftMinutes", { minutes }));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [promotion.endDate, showCountdown, t]);

  const discountDisplay = formatDiscount(t, promotion.discountType, promotion.discountValue);
  const promotionHref = buildPromotionHref(promotion);
  const href =
    promotion.type === "deal" && promotion.ctaLink
      ? promotion.ctaLink
      : promotionHref;
  const title = promotion.name || t("client.promotions.card.defaultTitle");
  const shareLabel = t("client.promotions.card.shareLabel", { title });

  if (variant === "compact") {
    return (
      <div
        className={`promotion-card-compact flex items-center gap-3 rounded-lg border bg-white p-3 transition-shadow hover:shadow-md ${className}`}
      >
        <Link
          href={href}
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold"
            style={{ backgroundColor: promotion.badgeColor || "#f0f0f0" }}
          >
            {typeIcons[promotion.type] || "DL"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{title}</p>
            <p className="text-xs text-gray-500">{discountDisplay}</p>
          </div>
          {timeRemaining ? (
            <span className="whitespace-nowrap text-xs font-medium text-orange-600">
              {timeRemaining}
            </span>
          ) : null}
        </Link>
        <ShareButton
          url={href}
          title={title}
          ariaLabel={shareLabel}
          iconOnly
          size="icon"
          variant="ghost"
          className="shrink-0 text-gray-500 hover:text-gray-900"
        />
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div
        className={`promotion-card-horizontal relative flex overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-lg ${className}`}
      >
        <Link
          href={href}
          onClick={onClick}
          className="flex flex-1 overflow-hidden"
        >
          <div className="relative w-1/3">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={title}
                fill
                sizes="(max-width: 640px) 40vw, (max-width: 1024px) 30vw, 320px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-sm font-bold">
                {typeIcons[promotion.type] || "DL"}
              </div>
            )}
            <span
              className="absolute left-2 top-2 rounded px-2 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: promotion.badgeColor || "#FF5733" }}
            >
              {promotion.badgeLabel}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <h3 className="mb-1 text-lg font-bold">{title}</h3>
              <p className="line-clamp-2 text-sm text-gray-600">{promotion.shortDescription}</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-2xl font-black text-primary">{discountDisplay}</span>
              {timeRemaining ? (
                <span className="text-sm font-medium text-orange-600">{timeRemaining}</span>
              ) : null}
            </div>
          </div>
        </Link>
        <ShareButton
          url={href}
          title={title}
          ariaLabel={shareLabel}
          iconOnly
          size="icon"
          variant="ghost"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 text-gray-600 shadow-sm hover:text-gray-900"
        />
      </div>
    );
  }

  return (
    <article
      className={`promotion-card group relative flex h-full flex-col overflow-hidden rounded-xl border bg-white transition-all hover:shadow-lg ${className}`}
    >
      <ShareButton
        url={href}
        title={title}
        ariaLabel={shareLabel}
        iconOnly
        size="icon"
        variant="ghost"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 text-gray-700 shadow-sm hover:text-gray-900"
      />
      <Link href={href} onClick={onClick} className="block flex-1">
        <div className="relative aspect-[16/9] overflow-hidden">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
              <span className="text-xl font-bold">{typeIcons[promotion.type] || "DL"}</span>
            </div>
          )}

          <span
            className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md"
            style={{ backgroundColor: promotion.badgeColor || "#FF5733" }}
          >
            {promotion.badgeLabel}
          </span>

          <div className="absolute bottom-3 right-3 rounded-lg bg-white/95 px-3 py-1 shadow-md backdrop-blur">
            <span className="text-xl font-black text-primary">{discountDisplay}</span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="mb-1 text-lg font-bold transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="mb-3 line-clamp-2 text-sm text-gray-600">{promotion.shortDescription}</p>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {typeIcons[promotion.type]} {formatType(t, promotion.type)}
            </span>
            {timeRemaining && promotion.urgencyTrigger?.showCountdown ? (
              <span className="font-medium text-orange-600">{timeRemaining}</span>
            ) : null}
          </div>
        </div>
      </Link>

      {showAddToCart ? (
        <div className="border-t px-4 py-3 space-y-2">
          {canAutoAdd ? (
            <PromotionAddToCartButton
              promotionId={promotion.campaignId}
              items={defaultItems}
              className="w-full justify-center gap-2"
              size="sm"
              onSuccess={
                onAddToCart
                  ? () => {
                      onAddToCart();
                    }
                  : undefined
              }
            />
          ) : (
            <Link
              href={href}
              onClick={onClick}
              className="inline-flex w-full items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              {t("client.promotions.card.viewDetails")}
            </Link>
          )}

          {!canAutoAdd && autoAddIssues.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {autoAddIssues.map((issue, idx) => (
                <div key={idx}>{issue}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

type DefaultItemsResult = { items: CartLineInput[]; issues: string[] };

const resolveSlug = (slug?: unknown) => {
  if (typeof slug === "string" && slug.trim()) return slug.trim();
  if (slug && typeof (slug as { current?: string }).current === "string") {
    return (slug as { current?: string }).current || undefined;
  }
  return undefined;
};

const resolveVariantId = (product: PromotionProductRef | null | undefined) => {
  if (!product) return undefined;
  if (typeof product.variantId === "string" && product.variantId.trim()) return product.variantId;

  const variant = product.variant || {};
  if (typeof variant === "string" && variant.trim()) return variant;
  if (typeof variant?._id === "string") return variant._id;
  if (typeof variant?._ref === "string") return variant._ref;
  if (variant?.slug && typeof variant.slug.current === "string") return variant.slug.current;

  return undefined;
};

const mapDefaultItem = (
  entry: { product?: PromotionProductRef; quantity?: number } | PromotionProductRef | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): { item: CartLineInput | null; issue?: string } => {
  if (!entry) return { item: null, issue: t("client.promotions.card.issue.missingSelection") };

  const product = (entry as { product?: PromotionProductRef }).product ?? (entry as PromotionProductRef | undefined);
  const productId = product?._id || product?.id || product?._ref;
  if (!productId) {
    return { item: null, issue: t("client.promotions.card.issue.missingReference") };
  }

  const variantId = resolveVariantId(product);
  const hasVariantField = Boolean(product?.variant || product?.variantId);
  if (hasVariantField && !variantId) {
    return { item: null, issue: t("client.promotions.card.issue.variantRequired") };
  }

  const slugValue = resolveSlug(product.slug);
  const quantity = Math.max(1, (entry as { quantity?: number }).quantity ?? 1);
  const unitPrice = typeof product.price === "number" ? product.price : undefined;

  return {
    item: {
      productId,
      quantity,
      productName: product.name,
      productSlug: slugValue,
      unitPrice,
      ...(variantId ? { variantId } : {}),
    },
  };
};

function buildDefaultItems(
  promotion: Promotion,
  t: (key: string, options?: Record<string, unknown>) => string
): DefaultItemsResult {
  const issues = new Set<string>();
  const isBxgy = promotion.discountType === "bxgy" || promotion.type === "bundle";
  const sourceItems = isBxgy ? promotion.defaultBundleItems : promotion.defaultProducts;
  const mapped =
    sourceItems
      ?.map((entry) => {
        const typedEntry = entry as { product?: PromotionProductRef; quantity?: number } | PromotionProductRef;
        const { item, issue } = mapDefaultItem(typedEntry, t);
        if (issue) issues.add(issue);
        return item;
      })
      .filter(Boolean) ?? [];

  if (isBxgy && mapped.length < 2) {
    issues.add(t("client.promotions.card.issue.bxgyDefaults"));
  }

  if (!mapped.length) {
    issues.add(t("client.promotions.card.issue.noDefaults"));
  }

  return { items: mapped as CartLineInput[], issues: Array.from(issues) };
}

const getImageUrl = (value?: unknown) => {
  if (!value || typeof value !== "object") return null;
  const imageValue = value as { asset?: { _ref?: string; url?: string }; url?: string };
  try {
    if (imageValue.asset?._ref) {
      const built = image(imageValue as Parameters<typeof image>[0]).width(960).height(540).fit("crop").url();
      if (built) return built;
    }
  } catch {
    // ignore builder errors
  }

  return imageValue.asset?.url || imageValue.url || null;
};

function formatDiscount(
  t: (key: string, options?: Record<string, unknown>) => string,
  type: string,
  value?: number | null
): string {
  const normalizedValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  switch (type) {
    case "percentage":
      return t("client.promotions.discount.percentage", { value: normalizedValue });
    case "fixed":
    case "fixed_amount":
    case "fixedAmount":
      return t("client.promotions.discount.fixed", { value: normalizedValue });
    case "freeShipping":
      return t("client.promotions.discount.freeShippingShort");
    case "bxgy":
      return t("client.promotions.discount.bxgyShort");
    default:
      return t("client.promotions.discount.percentage", { value: normalizedValue });
  }
}

function formatType(
  t: (key: string, options?: Record<string, unknown>) => string,
  type: string
): string {
  const key = `client.promotions.type.${type}`;
  return t(key, { defaultValue: type });
}
