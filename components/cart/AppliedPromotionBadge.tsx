import "@/app/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppliedPromotion } from "@/lib/cart/types";
import { Percent, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

type AppliedPromotionBadgeProps = {
  promotion?: AppliedPromotion | null;
  variant?: "line" | "type";
  className?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "THB",
  style: "currency",
  minimumFractionDigits: 2,
});

const getDiscountLabel = (
  promotion: AppliedPromotion,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null => {
  if (!Number.isFinite(promotion.discountValue) || promotion.discountValue <= 0) {
    return null;
  }

  if (promotion.discountType === "percentage") {
    return t("client.cart.promo.percentOff", {
      value: Math.round(promotion.discountValue),
    });
  }

  return t("client.cart.promo.amountOff", {
    value: currencyFormatter.format(promotion.discountValue),
  });
};

export function AppliedPromotionBadge({
  promotion,
  variant = "line",
  className,
}: AppliedPromotionBadgeProps) {
  const { t } = useTranslation();
  if (!promotion) return null;

  const isDeal = promotion.type === "deal";
  const discountLabel = getDiscountLabel(promotion, t);
  const Icon = isDeal
    ? Sparkles
    : promotion.discountType === "percentage"
      ? Percent
      : Tag;
  const typeLabel = isDeal
    ? t("client.cart.promo.type.deal")
    : t("client.cart.promo.type.promo");
  const dealLabel = promotion.badgeLabel?.trim() || promotion.name?.trim();
  const promoName = promotion.name?.trim();

  const label =
    variant === "type"
      ? typeLabel
      : isDeal
        ? dealLabel
          ? t("client.cart.promo.dealLabel", { label: dealLabel })
          : t("client.cart.promo.dealApplied")
        : promoName && discountLabel
          ? t("client.cart.promo.promoLabelWithDiscount", {
              name: promoName,
              discount: discountLabel,
            })
          : promoName
            ? t("client.cart.promo.promoLabel", { name: promoName })
            : discountLabel
              ? t("client.cart.promo.promoLabel", { name: discountLabel })
              : t("client.cart.promo.promoApplied");

  const badgeClasses = isDeal
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";

  const badgeStyle =
    isDeal && promotion.badgeColor
      ? {
          backgroundColor: promotion.badgeColor,
          borderColor: promotion.badgeColor,
          color: "#fff",
        }
      : undefined;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        variant === "type"
          ? "text-[10px] uppercase tracking-wide"
          : "text-xs",
        badgeClasses,
        className
      )}
      style={badgeStyle}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
