"use client";

import "@/app/i18n";
import Title from "@/components/Title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { urlFor } from "@/sanity/lib/image";
import type { Category } from "@/sanity.types";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { buildCategoryUrl, CATEGORY_BASE_PATH } from "@/lib/paths";

type CategoryPreview = Category & {
  productCount?: number;
  subCategoryCount?: number;
};

type CatalogCategoryOverviewProps = {
  categories: CategoryPreview[];
};

const getCategoryHref = (category: Category) =>
  category?.slug?.current ? buildCategoryUrl(category.slug.current) : CATEGORY_BASE_PATH;

const CatalogCategoryOverview = ({
  categories,
}: CatalogCategoryOverviewProps) => {
  const { t } = useTranslation();

  const getCategoryCountLabel = (category: CategoryPreview) => {
    if (typeof category.productCount === "number") {
      return t("client.catalog.categories.count.products", {
        count: category.productCount,
      });
    }
    if (typeof category.subCategoryCount === "number") {
      return t("client.catalog.categories.count.subcategories", {
        count: category.subCategoryCount,
      });
    }
    return t("client.catalog.categories.count.browse");
  };

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">
            {t("client.catalog.categories.sectionLabel")}
          </p>
          <Title className="text-2xl font-semibold text-ink-strong sm:text-3xl">
            {t("client.catalog.categories.title")}
          </Title>
          <p className="max-w-2xl text-sm text-ink-muted">
            {t("client.catalog.categories.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={CATEGORY_BASE_PATH}>
              {t("client.catalog.categories.cta.categories")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/shop">{t("client.catalog.categories.cta.products")}</Link>
          </Button>
        </div>
      </div>

      {categories.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const href = getCategoryHref(category);
            const countLabel = getCategoryCountLabel(category);
            const title =
              category.title || t("client.catalog.categories.card.titleFallback");
            const description =
              category.description ||
              t("client.catalog.categories.card.descriptionFallback");

            return (
              <Link
                key={category._id}
                href={href}
                className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface-0 p-4 transition hover:-translate-y-0.5 hover:border-ink/50 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-1">
                    {category.image ? (
                      <Image
                        src={urlFor(category.image).width(96).height(96).url()}
                        alt={t("client.catalog.categories.card.imageAlt", { title })}
                        width={96}
                        height={96}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-ink-muted">NCS</span>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm font-semibold text-ink-strong line-clamp-1">
                      {title}
                    </h3>
                    <p className="text-xs text-ink-muted line-clamp-2">
                      {description}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {countLabel}
                </Badge>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-0 p-6 text-center text-sm text-ink-muted">
          {t("client.catalog.categories.empty")}
        </div>
      )}
    </section>
  );
};

export default CatalogCategoryOverview;
