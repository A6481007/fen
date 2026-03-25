"use client";

import CatalogCard from "@/components/catalog/CatalogCard";
import ContentGrid from "@/components/shared/ContentGrid";
import ContentCard from "@/components/shared/ContentCard";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogItem } from "@/sanity/queries/catalog";
import { FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";

type CatalogGridProps = {
  items: CatalogItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
};

const CatalogGrid = ({ items, isLoading = false, errorMessage }: CatalogGridProps) => {
  const { t } = useTranslation();
  const resolvedErrorMessage = errorMessage
    ? t(errorMessage, { defaultValue: errorMessage })
    : "";

  const emptyState = (
    <Card className="border border-slate-200 bg-white/60">
      <CardContent className="flex items-start gap-4 p-6 text-slate-700">
        <FileSearch className="mt-1 h-10 w-10 text-shop_dark_green" />
        <div className="space-y-2">
          <p className="text-lg font-semibold text-slate-900">
            {t("client.catalog.empty.title")}
          </p>
          <p className="text-sm text-slate-600">{t("client.catalog.empty.subtitle")}</p>
        </div>
      </CardContent>
    </Card>
  );

  const errorContent = errorMessage ? (
    <Card className="border border-red-200 bg-red-50/60">
      <CardContent className="flex items-center gap-4 p-6 text-red-800">
        <FileSearch className="h-10 w-10" />
        <div>
          <p className="font-semibold">{t("client.catalog.error.title")}</p>
          <p className="text-sm text-red-900/80">{resolvedErrorMessage}</p>
        </div>
      </CardContent>
    </Card>
  ) : null;

  return (
    <ContentGrid<CatalogItem>
      items={items}
      loading={isLoading}
      error={errorContent}
      emptyState={emptyState}
      columns={{ sm: 2, lg: 3, xl: 4 }}
      gap={4}
      skeletonCount={8}
      renderItem={(item) => <CatalogCard key={item._id || item.slug || item.title} item={item} />}
      renderSkeleton={(index) => (
        <ContentCard.Skeleton
          key={`catalog-skeleton-${index}`}
          layout="grid"
          size="default"
          mediaClassName="aspect-[3/4]"
        />
      )}
    />
  );
};

export default CatalogGrid;
