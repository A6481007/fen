"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import { buildPromotionHref, resolvePromotionSlug } from "@/lib/promotions/paths";

type RelatedPromotionsProps = {
  currentId: string;
  type?: string | null;
  promotions?: PROMOTIONS_LIST_QUERYResult | null;
};

export function RelatedPromotions({ currentId, type, promotions }: RelatedPromotionsProps) {
  const { t } = useTranslation();
  const related = (promotions || [])
    .map((promo) => ({
      promo,
      href: buildPromotionHref(promo, { fallback: "" }),
      slug: resolvePromotionSlug(promo),
    }))
    .filter(({ promo, href, slug }) => promo && href && slug && slug !== currentId);

  if (!related.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("client.promotions.related.kicker", "You might also like")}
          </p>
          <h2 className="text-lg font-bold text-gray-900">
            {type
              ? t("client.promotions.related.typeTitle", {
                  defaultValue: "{{type}} promotions",
                  type,
                })
              : t("client.promotions.related.title", "Related promotions")}
          </h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {related.slice(0, 3).map(({ promo, href }) => (
          <Card key={promo?.campaignId || promo?._id} className="border border-gray-100 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {promo?.type || t("client.promotions.related.promotionFallback", "Promotion")}
                  </p>
                  <h3 className="text-base font-semibold text-gray-900">
                    {promo?.name || t("client.promotions.related.untitled", "Untitled promo")}
                  </h3>
                </div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  {promo?.status || t("client.promotions.related.statusFallback", "Active")}
                </Badge>
              </div>

              {promo?.shortDescription ? (
                <p className="text-sm text-gray-600 line-clamp-2">{promo.shortDescription}</p>
              ) : null}

              {href ? (
                <Link
                  href={href}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  {t("client.promotions.related.viewDetails", "View details")} {"->"}
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default RelatedPromotions;
