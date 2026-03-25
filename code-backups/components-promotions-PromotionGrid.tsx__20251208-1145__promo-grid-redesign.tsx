import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { image } from "@/sanity/image";
import type { PROMOTION_BY_CAMPAIGN_ID_QUERYResult } from "@/sanity.types";

type PromotionProduct = NonNullable<PROMOTION_BY_CAMPAIGN_ID_QUERYResult>["products"] extends
  | (infer Item)[]
  | undefined
  ? Item
  : never;

type PromotionGridProps = {
  products: PromotionProduct[] | null | undefined;
  campaignId: string;
  discountType?: string | null;
  discountValue?: number | null;
};

const formatDiscount = (discountType?: string | null, discountValue?: number | null) => {
  if (!discountType) return "Special offer";

  switch (discountType) {
    case "percentage":
      return `${Math.round(discountValue ?? 0)}% OFF`;
    case "fixed":
      return `$${(discountValue ?? 0).toFixed(2)} OFF`;
    case "bxgy":
      return "Bundle savings";
    case "freeShipping":
      return "Free shipping";
    case "points":
      return `${Math.round(discountValue ?? 0)} bonus points`;
    default:
      return "Special offer";
  }
};

export function PromotionGrid({ products, campaignId, discountType, discountValue }: PromotionGridProps) {
  if (!products || products.length === 0) {
    return (
      <Card className="border border-dashed border-gray-200 bg-gray-50/70 shadow-none">
        <CardContent className="p-6 text-center text-sm text-gray-600">
          Products for this campaign will appear here once assigned.
        </CardContent>
      </Card>
    );
  }

  const discountLabel = formatDiscount(discountType, discountValue);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-900">Featured products</h2>
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          {discountLabel}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const slugValue = typeof product?.slug === "string" ? product.slug : "";
          const href = slugValue ? `/product/${slugValue}` : "#";
          const productImage = product?.images?.[0] ? image(product.images[0]).width(600).height(420).url() : null;

          return (
            <Card key={product?._id || `${campaignId}-${slugValue}`} className="overflow-hidden border border-gray-100 shadow-sm">
              {productImage ? (
                <div className="relative h-44 w-full bg-gray-50">
                  <img
                    src={productImage}
                    alt={product?.name || "Promotion product"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <Badge className="absolute left-3 top-3 bg-black/70 text-xs uppercase tracking-wide text-white">
                    {discountLabel}
                  </Badge>
                </div>
              ) : null}

              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {product?._type || "Product"}
                    </p>
                    <h3 className="text-base font-semibold text-gray-900">{product?.name || "Untitled product"}</h3>
                  </div>
                  {typeof product?.price === "number" ? (
                    <span className="text-lg font-bold text-emerald-700">${product.price.toFixed(2)}</span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">Campaign ID: {campaignId}</p>
                  {href !== "#" ? (
                    <Button asChild size="sm">
                      <Link href={href}>View</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default PromotionGrid;
