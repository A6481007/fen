import CatalogCard from "@/components/catalog/CatalogCard";
import ContentCard from "@/components/shared/ContentCard";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogItem } from "@/sanity/queries/catalog";
import { FileSearch } from "lucide-react";

type CatalogGridProps = {
  items: CatalogItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
};

const CatalogGrid = ({ items, isLoading = false, errorMessage }: CatalogGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ContentCard.Skeleton
            key={index}
            layout="grid"
            size="default"
            mediaClassName="aspect-[3/4]"
          />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <Card className="border border-red-200 bg-red-50/60">
        <CardContent className="flex items-center gap-4 p-6 text-red-800">
          <FileSearch className="h-10 w-10" />
          <div>
            <p className="font-semibold">Something went wrong</p>
            <p className="text-sm text-red-900/80">{errorMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card className="border border-slate-200 bg-white/60">
        <CardContent className="flex items-start gap-4 p-6 text-slate-700">
          <FileSearch className="mt-1 h-10 w-10 text-shop_dark_green" />
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-900">No catalog items found</p>
            <p className="text-sm text-slate-600">
              Try clearing filters or searching for a different keyword.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <CatalogCard key={item._id || item.slug || item.title} item={item} />
      ))}
    </div>
  );
};

export default CatalogGrid;
