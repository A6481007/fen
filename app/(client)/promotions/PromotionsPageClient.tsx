"use client";

import Container from "@/components/Container";
import { PromotionHero } from "@/components/promotions/PromotionHero";
import { PromotionGrid } from "@/components/promotions/PromotionGrid";
import PromotionsGridClient from "./PromotionsClient";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;

type PromotionsPageClientProps = {
  counts: Record<string, number>;
  currentType?: string;
  currentSort: string;
  currentPage: number;
  totalPages: number;
  featured?: Promotion;
  promotions: Promotion[];
  showHeroHeader?: boolean;
};

const TYPE_VALUES = ["flashSale", "seasonal", "bundle", "loyalty", "deal"] as const;
const SORT_VALUES = ["priority", "ending", "newest", "discount"] as const;

const resolveImageUrl = (promotion: Promotion) => {
  const hero = promotion.heroImage as { asset?: { url?: string }; url?: string } | undefined;
  const thumb = promotion.thumbnailImage as { asset?: { url?: string }; url?: string } | undefined;
  return hero?.asset?.url || hero?.url || thumb?.asset?.url || thumb?.url || undefined;
};

const toHeroPromotion = (promotion?: Promotion | null) => {
  if (!promotion) return undefined;

  return {
    campaignId: promotion.campaignId || promotion._id || "promotion",
    name: promotion.name || "Promotion",
    heroMessage: promotion.heroMessage || promotion.shortDescription || "",
    heroImage: resolveImageUrl(promotion)
      ? { url: resolveImageUrl(promotion) as string, alt: promotion.name || "Promotion" }
      : undefined,
    discountType: promotion.discountType || "percentage",
    discountValue: promotion.discountValue ?? 0,
    badgeLabel: promotion.badgeLabel || "Promotion",
    badgeColor: promotion.badgeColor || undefined,
    ctaText: promotion.ctaText || "Shop now",
    ctaLink: promotion.ctaLink || undefined,
    startDate: promotion.startDate || "",
    endDate: promotion.endDate || "",
    urgencyTrigger:
      promotion.urgencyTrigger && typeof promotion.urgencyTrigger === "object"
        ? {
            showCountdown: Boolean((promotion.urgencyTrigger as any).showCountdown),
            urgencyMessage:
              typeof (promotion.urgencyTrigger as any).urgencyMessage === "string"
                ? (promotion.urgencyTrigger as any).urgencyMessage
                : undefined,
          }
        : undefined,
    assignedVariant: (promotion as { assignedVariant?: { copy?: string; cta?: string } }).assignedVariant,
  };
};

const filterPill = (
  label: string,
  value: string,
  activeValue?: string,
  count?: number
) => {
  const active = activeValue === value;
  const href = value === "all" ? "/promotions" : `/promotions?type=${value}`;
  return (
    <a
      key={value}
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition",
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
          : "border-border bg-surface-0 text-ink hover:border-emerald-200"
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <Badge variant="secondary" className="border-0 bg-white/80 text-ink">
          {count}
        </Badge>
      ) : null}
    </a>
  );
};

const PromotionsPageClient = ({
  counts,
  currentType,
  currentSort,
  currentPage,
  totalPages,
  featured,
  promotions,
  showHeroHeader = true,
}: PromotionsPageClientProps) => {
  const { t } = useTranslation();
  const totalPagesSafe = Math.max(totalPages, 1);
  const featuredHero = toHeroPromotion(featured);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="space-y-10 py-10">
        <header className="space-y-4 text-center">
          {showHeroHeader ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {t("client.promotions.hero.badge")}
              </p>
              <h1 className="text-3xl font-bold text-ink-strong sm:text-4xl">
                {t("client.promotions.hero.title")}
              </h1>
              <p className="text-ink-muted max-w-3xl mx-auto">
                {t("client.promotions.hero.subtitle")}
              </p>
            </>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {filterPill(
              t("client.promotions.filters.type.all"),
              "all",
              currentType ?? "all",
              counts.all
            )}
            {TYPE_VALUES.map((value) =>
              filterPill(
                t(`client.promotions.filters.type.${value}`),
                value,
                currentType,
                (counts as any)[value]
              )
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{t("client.promotions.filters.sort.label")}</span>
            {SORT_VALUES.map((value) => {
              const isActive = currentSort === value;
              const search = new URLSearchParams();
              if (currentType) search.set("type", currentType);
              if (value !== "priority") search.set("sort", value);
              const href = search.toString() ? `/promotions?${search.toString()}` : "/promotions";
              return (
                <a
                  key={value}
                  href={href}
                  className={cn(
                    "rounded-full px-3 py-1",
                    isActive ? "bg-emerald-50 text-emerald-900 font-semibold" : "hover:bg-surface-1"
                  )}
                >
                  {t(`client.promotions.sort.${value}`)}
                </a>
              );
            })}
          </div>
        </header>

        {featuredHero ? (
          <PromotionHero promotion={featuredHero} variant="featured" showCountdown />
        ) : null}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink-strong">
              {t("client.promotions.list.title")}
            </h2>
            <span className="text-sm text-ink-muted">
              {t("client.promotions.pagination.pageOf", {
                current: currentPage,
                total: totalPagesSafe,
              })}
            </span>
          </div>

          <PromotionGrid promotions={promotions} columns={3} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-strong">
              {t("client.promotions.autoAdd.title")}
            </h3>
            <span className="text-sm text-ink-muted">{t("client.promotions.autoAdd.body")}</span>
          </div>
          <PromotionsGridClient promotions={promotions} />
        </section>

        <div className="flex justify-center gap-2 text-sm text-ink">
          {Array.from({ length: totalPagesSafe }).map((_, index) => {
            const page = index + 1;
            const params = new URLSearchParams();
            if (currentType) params.set("type", currentType);
            if (currentSort && currentSort !== "priority") params.set("sort", currentSort);
            if (page > 1) params.set("page", page.toString());
            const href = params.toString() ? `/promotions?${params.toString()}` : "/promotions";
            const isActive = page === currentPage;
            return (
              <a
                key={page}
                href={href}
                className={cn(
                  "rounded-full border px-3 py-1",
                  isActive ? "border-ink bg-ink text-white" : "border-border bg-surface-0 text-ink"
                )}
              >
                {page}
              </a>
            );
          })}
        </div>
      </Container>
    </div>
  );
};

export default PromotionsPageClient;
