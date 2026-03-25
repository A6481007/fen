"use client";

import Container from "@/components/Container";
import { PromotionGrid } from "@/components/promotions/PromotionGrid";
import { PromotionHero } from "@/components/promotions/PromotionHero";
import DealGrid, { type Deal } from "@/components/deals/DealGrid";
import type { PROMOTIONS_LIST_QUERYResult } from "@/sanity.types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Promotion = NonNullable<PROMOTIONS_LIST_QUERYResult[number]>;

type DealPageClientProps = {
  promotions: Promotion[];
  deals: Deal[];
  showHeroHeader?: boolean;
};

const DealPageClient = ({ promotions, deals, showHeroHeader = true }: DealPageClientProps) => {
  const { t } = useTranslation();
  const sortedPromotions = useMemo(
    () => [...(promotions || [])].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
    [promotions]
  );

  const featured = sortedPromotions[0];
  const remainingPromos = sortedPromotions.slice(1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="space-y-10 py-10">
        {showHeroHeader ? (
          <header className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {t("client.deals.header.kicker")}
            </p>
            <h1 className="text-3xl font-bold text-ink-strong sm:text-4xl">
              {t("client.deals.header.title")}
            </h1>
            <p className="text-ink-muted max-w-3xl mx-auto">
              {t("client.deals.header.subtitle")}
            </p>
          </header>
        ) : null}

        {featured ? (
          <section className="space-y-6">
            <PromotionHero promotion={featured as any} variant="featured" />
          </section>
        ) : null}

        {remainingPromos.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink-strong">
                {t("client.deals.current.title")}
              </h2>
              <p className="text-sm text-ink-muted">
                {t("client.deals.current.count", { count: remainingPromos.length })}
              </p>
            </div>
            <PromotionGrid promotions={remainingPromos} columns={3} />
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink-strong">
              {t("client.deals.featured.title")}
            </h2>
            <p className="text-sm text-ink-muted">
              {t("client.deals.featured.count", { count: deals?.length || 0 })}
            </p>
          </div>
          <DealGrid deals={deals || []} columns={4} showAddToCart />
        </section>
      </Container>
    </div>
  );
};

export default DealPageClient;
