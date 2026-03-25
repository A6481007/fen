"use client";

import Link from "next/link";
import { PackageSearch } from "lucide-react";

import DealCard, { type DealCardProps } from "./DealCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Deal = DealCardProps["deal"];

export interface DealGridProps {
  deals: Deal[];
  columns?: 2 | 3 | 4;
  showAddToCart?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const columnClasses: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const defaultEmptyMessage = "No active deals right now.";

const getDealKey = (deal: Deal, index: number) => {
  const productId = (deal.product as { _id?: string | null })?._id;
  return deal.dealId || productId || `deal-${index}`;
};

export function DealGrid({
  deals = [],
  columns = 4,
  showAddToCart = true,
  loading = false,
  emptyMessage = defaultEmptyMessage,
  className,
}: DealGridProps) {
  const gridClasses = columnClasses[columns] || columnClasses[4];

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
        <p className="text-base font-semibold text-gray-900">{emptyMessage}</p>
        <p className="mt-1 text-sm text-gray-600">
          Browse products to discover current offers.
        </p>
        <Button asChild className="mt-4">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", gridClasses, className)}>
      {deals.map((deal, index) => (
        <DealCard
          key={getDealKey(deal, index)}
          deal={deal}
          showAddToCart={showAddToCart}
        />
      ))}
    </div>
  );
}

export default DealGrid;
