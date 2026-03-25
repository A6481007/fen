import ContentCard from "@/components/shared/ContentCard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isValidElement, type CSSProperties, type Key, type ReactNode } from "react";

type Layout = "list" | "grid";

type ColumnConfig = {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
};

type ContentGridProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  error?: Error | string | React.ReactNode | null;
  emptyState?: React.ReactNode;
  layout?: Layout;
  columns?: ColumnConfig;
  gap?: number;
  className?: string;
  skeletonCount?: number;
  renderSkeleton?: (index: number) => React.ReactNode;
};

const defaultColumns: ColumnConfig = { sm: 1, md: 2, lg: 3, xl: 4 };

const columnClassMap: Record<keyof ColumnConfig, Record<number, string>> = {
  sm: {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
  },
  md: {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  },
  lg: {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  },
  xl: {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
  },
};

const gapClassMap: Record<number, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
};

const spacingValue = (value: number) => `${value * 0.25}rem`;

const getItemKey = (node: ReactNode, index: number): Key => {
  if (isValidElement(node) && node.key != null) {
    return node.key;
  }

  return `content-grid-item-${index}`;
};

const getColumnClasses = (columns: ColumnConfig) => {
  const entries = Object.entries(columns) as [keyof ColumnConfig, number | undefined][];

  return entries
    .map(([breakpoint, count]) => (count ? columnClassMap[breakpoint]?.[count] : null))
    .filter(Boolean);
};

const getGridTemplateFallback = (columns: ColumnConfig) => {
  const entries = Object.entries(columns) as [keyof ColumnConfig, number | undefined][];
  const fallbackEntry = entries.find(
    ([breakpoint, count]) => count && !columnClassMap[breakpoint]?.[count]
  );

  return fallbackEntry?.[1];
};

const getGapClass = (gap?: number) => {
  if (gap === undefined) return undefined;
  return gapClassMap[gap];
};

const ContentGrid = <T,>({
  items,
  renderItem,
  loading = false,
  error = null,
  emptyState,
  layout = "grid",
  columns = defaultColumns,
  gap = 6,
  className,
  skeletonCount = 8,
  renderSkeleton,
}: ContentGridProps<T>) => {
  const isList = layout === "list";
  const gapClass = getGapClass(gap);
  const columnClasses = isList ? [] : getColumnClasses(columns);
  const gridTemplateFallback = isList ? undefined : getGridTemplateFallback(columns);

  const wrapperStyle: CSSProperties = {};
  if (!gapClass && typeof gap === "number") {
    wrapperStyle.gap = spacingValue(gap);
  }
  if (!isList && gridTemplateFallback) {
    wrapperStyle.gridTemplateColumns = `repeat(${gridTemplateFallback}, minmax(0, 1fr))`;
  }

  const wrapperClassName = cn(
    isList ? "flex flex-col" : "grid grid-cols-1",
    gapClass,
    columnClasses,
    className
  );

  if (error) {
    if (isValidElement(error)) {
      return <>{error}</>;
    }

    if (typeof error !== "string" && !(error instanceof Error)) {
      return <>{error}</>;
    }

    const message =
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred";

    return (
      <Card className="border border-red-200 bg-red-50/60">
        <CardContent className="space-y-2 p-6 text-red-800">
          <p className="font-semibold">Something went wrong</p>
          {message ? <p className="text-sm text-red-900/80">{message}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className={wrapperClassName} style={wrapperStyle} role={isList ? "list" : undefined}>
        {Array.from({ length: skeletonCount }).map((_, index) => {
          const skeleton = renderSkeleton ? (
            renderSkeleton(index)
          ) : (
            <ContentCard.Skeleton key={`skeleton-${index}`} layout={layout} />
          );

          return (
            <div key={getItemKey(skeleton, index)} role={isList ? "listitem" : undefined}>
              {skeleton}
            </div>
          );
        })}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <>{emptyState || null}</>;
  }

  return (
    <div className={wrapperClassName} style={wrapperStyle} role={isList ? "list" : undefined}>
      {items.map((item, index) => {
        const content = renderItem(item, index);

        return (
          <div key={getItemKey(content, index)} role={isList ? "listitem" : undefined}>
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default ContentGrid;
