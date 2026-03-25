"use client";

import "@/app/i18n";
import { Product } from "@/sanity.types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { useTranslation } from "react-i18next";

interface ProductCharacteristicsProps {
  product: Product;
  brand: any[] | null;
}

const ProductCharacteristics = ({ product, brand }: ProductCharacteristicsProps) => {
  const { t } = useTranslation();
  const variantLabel =
    typeof product?.variant === "string"
      ? product.variant
      : (product?.variant as any)?.title ||
        (product?.variant as any)?.name ||
        (product?.variant as any)?.slug?.current ||
        "";
  const isInStock = typeof product?.stock === "number" ? product.stock > 0 : Boolean(product?.stock);
  const collection = (product as any)?.collection;

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger className="font-bold">
          {t("client.productPage.characteristics.title", {
            defaultValue: "{{name}}: Characteristics",
            name: product?.name || t("client.productPage.fallback.product", { defaultValue: "Product" }),
          })}
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-1">
          <p className="flex items-center justify-between">
            {t("client.productPage.characteristics.brand", { defaultValue: "Brand" })}:{" "}
            {brand && brand.length > 0 && (
              <span className="font-semibold tracking-wide">
                {brand[0]?.brandName}
              </span>
            )}
          </p>
          <p className="flex items-center justify-between">
            {t("client.productPage.characteristics.collection", { defaultValue: "Collection" })}:{" "}
            <span className="font-semibold tracking-wide">
              {collection ||
                t("client.productPage.characteristics.na", {
                  defaultValue: "N/A",
                })}
            </span>
          </p>
          <p className="flex items-center justify-between">
            {t("client.productPage.characteristics.type", { defaultValue: "Type" })}:{" "}
            <span className="font-semibold tracking-wide">
              {variantLabel ||
                t("client.productPage.characteristics.na", {
                  defaultValue: "N/A",
                })}
            </span>
          </p>
          {product?.sku ? (
            <p className="flex items-center justify-between">
              {t("client.productPage.characteristics.sku", { defaultValue: "SKU" })}:{" "}
              <span className="font-semibold tracking-wide">{product.sku}</span>
            </p>
          ) : null}
          <p className="flex items-center justify-between">
            {t("client.productPage.characteristics.stock", { defaultValue: "Stock" })}:{" "}
            <span className="font-semibold tracking-wide">
              {isInStock
                ? t("client.productPage.characteristics.available", { defaultValue: "Available" })
                : t("client.productPage.stock.out", { defaultValue: "Out of Stock" })}
            </span>
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ProductCharacteristics;
