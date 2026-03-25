"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { useTranslation } from "react-i18next";

import DealCard, { type DealCardProps } from "./DealCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "@/app/i18n";

export type Deal = DealCardProps["deal"];

export interface DealGridProps {
  deals: Deal[];
  columns?: 2 | 3 | 4;
  showAddToCart?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onDealImpression?: (deal: Deal, index: number) => void;
}

const columnClasses: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const getDealKey = (deal: Deal, index: number) => {
  const productId = (deal.product as { _id?: string | null })?._id;
  return deal.dealId || productId || `deal-${index}`;
};

export function DealGrid({
  deals = [],
  columns = 4,
  showAddToCart = true,
  loading = false,
  emptyMessage,
  className,
  onDealImpression,
}: DealGridProps) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage || t("client.deals.empty.title");
  const gridClasses = columnClasses[columns] || columnClasses[4];
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const seenImpressions = useRef<Set<string>>(new Set());

  itemRefs.current.length = deals.length;

  useEffect(() => {
    seenImpressions.current.clear();
  }, [deals]);

  useEffect(() => {
    if (!onDealImpression || loading || !deals.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const indexAttr = (entry.target as HTMLElement).dataset.dealIndex;
          const index = typeof indexAttr === "string" ? Number.parseInt(indexAttr, 10) : -1;
          const deal = Number.isFinite(index) && index >= 0 ? deals[index] : null;

          if (!deal) return;

          const impressionKey = getDealKey(deal, index);
          if (seenImpressions.current.has(impressionKey)) return;

          seenImpressions.current.add(impressionKey);
          onDealImpression(deal, index);
        });
      },
      { threshold: 0.35 }
    );

    itemRefs.current.forEach((node) => {
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [deals, loading, onDealImpression]);

  if (loading) {
    const skeletonCount = Math.max(columns * 2, 4);

    return (
      <div className={cn("grid gap-6", gridClasses, className)}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <Skeleton className="mb-4 aspect-[4/3] w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!deals.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <PackageSearch className="h-6 w-6 text-slate-500" aria-hidden="true" />
        </div>
        <p className="text-base font-semibold text-gray-900">{resolvedEmptyMessage}</p>
        <p className="mt-1 text-sm text-gray-600">
          {t("client.deals.grid.emptySubtitle")}
        </p>
        <Button asChild className="mt-4">
          <Link href="/products">{t("client.deals.grid.browseCta")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", gridClasses, className)}>
      {deals.map((deal, index) => (
        <div
          key={getDealKey(deal, index)}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          data-deal-index={index}
          data-deal-id={deal.dealId || (deal.product as { _id?: string })?._id || ""}
          className="h-full"
        >
          <DealCard
            deal={deal}
            showAddToCart={showAddToCart}
            className="h-full"
          />
        </div>
      ))}
    </div>
  );
}

export default DealGrid;
