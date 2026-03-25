"use client";

import "@/app/i18n";
import { Product } from "@/sanity.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Shield, Award } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProductSpecsProps {
  product: Product;
  brand: any[] | null;
}

const ProductSpecs = ({ product, brand }: ProductSpecsProps) => {
  const { t } = useTranslation();
  const sku = (product as any)?.sku || product?.slug?.current || product?._id?.slice(-8) || "";
  const brandName =
    (brand && brand[0]?.brandName) ||
    (product as any)?.brand?.title ||
    (product as any)?.brandName ||
    t("client.productPage.characteristics.brand", { defaultValue: "Brand" });
  const shipping = (product as any)?.shipping || {};
  const warranty =
    (product as any)?.warranty ||
    t("client.productPage.specs.warranty.default", {
      defaultValue: "1 Year Manufacturer Warranty",
    });
  const returnPolicy =
    (product as any)?.returnPolicy ||
    t("client.productPage.specs.warranty.returnPolicy", {
      defaultValue: "30 Days Return Policy",
    });
  const qualityBadges =
    ((product as any)?.qualityBadges as string[] | undefined)?.filter(Boolean) ||
    [
      t("client.productPage.specs.quality.tested", { defaultValue: "Quality Tested" }),
      t("client.productPage.specs.quality.authentic", { defaultValue: "Authentic Product" }),
      t("client.productPage.specs.quality.packaging", { defaultValue: "Secure Packaging" }),
    ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      <Card className="border-2 border-gray-100 hover:border-brand-text-main/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-red-accent" />
            <CardTitle className="text-sm font-semibold">
              {t("client.productPage.specs.productInfo", { defaultValue: "Product Info" })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {t("client.productPage.characteristics.stock", { defaultValue: "Stock" })}:
            </span>
            <Badge
              variant={product?.stock === 0 ? "destructive" : "default"}
              className={
                product?.stock === 0
                  ? ""
                  : "bg-success-highlight text-success-base hover:bg-success-highlight"
              }
            >
              {product?.stock === 0
                ? t("client.productPage.stock.out", { defaultValue: "Out of Stock" })
                : typeof product?.stock === "number"
                ? t("client.productPage.specs.stockAvailable", {
                    defaultValue: "{{count}} Available",
                    count: product.stock,
                  })
                : t("client.productPage.characteristics.available", {
                    defaultValue: "Available",
                  })}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {t("client.productPage.characteristics.brand", { defaultValue: "Brand" })}:
            </span>
            <span className="font-medium">{brandName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {t("client.productPage.characteristics.sku", { defaultValue: "SKU" })}:
            </span>
            <span className="font-medium text-xs text-gray-500">#{String(sku).toUpperCase()}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-100 hover:border-brand-text-main/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-brand-red-accent" />
            <CardTitle className="text-sm font-semibold">
              {t("client.productPage.specs.shipping.title", { defaultValue: "Shipping" })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-success-base font-medium">
              {shipping.freeShipping === false
                ? t("client.productPage.specs.shipping.available", {
                    defaultValue: "Shipping Available",
                  })
                : t("client.productPage.specs.shipping.free", {
                    defaultValue: "Free Shipping",
                  })}
            </span>
          </div>
          <div className="text-gray-600">
            {shipping.estimate ||
              t("client.productPage.specs.shipping.estimate", {
                defaultValue: "Estimated: 2-5 business days",
              })}
          </div>
          <div className="text-gray-600">
            {shipping.expressEstimate ||
              t("client.productPage.specs.shipping.express", {
                defaultValue: "Express: 1-2 business days",
              })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-100 hover:border-brand-text-main/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-red-accent" />
            <CardTitle className="text-sm font-semibold">
              {t("client.productPage.specs.warranty.title", { defaultValue: "Warranty" })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="text-gray-600">
            <span className="font-medium text-brand-black-strong">{warranty}</span>
          </div>
          <div className="text-gray-600">
            <span className="font-medium text-brand-black-strong">{returnPolicy}</span>
          </div>
          <div className="text-gray-600">
            {t("client.productPage.specs.warranty.support", {
              defaultValue: "Free Tech Support",
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-100 hover:border-brand-text-main/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-red-accent" />
            <CardTitle className="text-sm font-semibold">
              {t("client.productPage.specs.quality.title", { defaultValue: "Quality" })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {qualityBadges.map((badge) => (
            <div className="flex items-center gap-2" key={badge}>
              <span className="text-success-base font-medium">{`✓ ${badge}`}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductSpecs;
