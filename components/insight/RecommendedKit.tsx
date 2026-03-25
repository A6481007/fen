import Image from "next/image";
import Link from "next/link";

import PriceView from "@/components/PriceView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildProductPath } from "@/lib/paths";
import { urlFor } from "@/sanity/lib/image";

export type RecommendedKitProduct = {
  id: string;
  name: string;
  slug?: string;
  price?: number | null;
  dealerPrice?: number | null;
  discount?: number | null;
  stock?: number | null;
  image?: unknown;
  brand?: string | null;
  reason?: string | null;
};

type RecommendedKitProps = {
  insightSlug?: string;
  products: RecommendedKitProduct[];
  headline?: string;
  summary?: string;
  alternativesHref?: string;
  explicitReference?: boolean;
  className?: string;
};

const FALLBACK_IMAGE = "/images/catalog-placeholder.png";

const buildImageUrl = (source?: unknown) => {
  if (!source) return FALLBACK_IMAGE;
  if (typeof source === "string") return source;
  try {
    return urlFor(source).width(600).height(600).url();
  } catch {
    return FALLBACK_IMAGE;
  }
};

const buildProductHref = (product: RecommendedKitProduct) => {
  if (product.slug) {
    return buildProductPath(product.slug);
  }
  return buildProductPath(product.id);
};

const getStockLabel = (stock?: number | null) => {
  if (typeof stock !== "number") return null;
  return stock > 0 ? "In stock" : "Out of stock";
};

const RecommendedKit = ({
  products,
  headline = "Recommended kit",
  summary,
  alternativesHref,
  explicitReference = false,
  className,
}: RecommendedKitProps) => {
  if (!products.length) return null;

  return (
    <section className={cn("rounded-2xl border border-border bg-surface-0 p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            Recommended kit
          </p>
          <h2 className="text-2xl font-semibold text-ink-strong">{headline}</h2>
          {summary ? (
            <p className="max-w-2xl text-sm text-ink-muted">{summary}</p>
          ) : null}
        </div>
        {alternativesHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full border-border text-ink"
          >
            <Link href={alternativesHref}>Browse alternatives</Link>
          </Button>
        ) : null}
      </div>

      {explicitReference ? (
        <p className="mt-3 text-xs text-ink-muted">
          Selected to match the steps and tools referenced in this lesson.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {products.map((product) => {
          const imageUrl = buildImageUrl(product.image);
          const stockLabel = getStockLabel(product.stock);
          const href = buildProductHref(product);
          const hasDiscount = typeof product.discount === "number" && product.discount > 0;

          return (
            <div
              key={product.id}
              className="flex gap-4 rounded-xl border border-border bg-surface-1 p-4"
            >
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <div className="space-y-1">
                  <Link href={href} className="text-sm font-semibold text-ink-strong hover:underline">
                    {product.name}
                  </Link>
                  {product.brand ? (
                    <p className="text-xs text-ink-muted">{product.brand}</p>
                  ) : null}
                </div>

                {product.reason ? (
                  <p className="text-sm text-ink-muted">{product.reason}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  {stockLabel ? (
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5",
                        stockLabel === "In stock"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      )}
                    >
                      {stockLabel}
                    </span>
                  ) : null}
                  {hasDiscount ? (
                    <Badge variant="secondary" className="border border-border">
                      {product.discount}% off
                    </Badge>
                  ) : null}
                  {typeof product.dealerPrice === "number" ? (
                    <span className="text-emerald-700">Dealer pricing</span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <PriceView
                    price={product.price ?? 0}
                    discount={product.discount ?? 0}
                    className="text-sm"
                  />
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full border-border text-ink"
                  >
                    <Link href={href}>View</Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedKit;
