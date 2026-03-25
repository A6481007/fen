"use client";

import "@/app/i18n";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import Title from "@/components/Title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildCategoryUrl, CATEGORY_BASE_PATH } from "@/lib/paths";
import { urlFor } from "@/sanity/lib/image";
import type { Category } from "@/sanity.types";
import { useTranslation } from "react-i18next";

type CategoryWithCounts = Category & {
  productCount?: number;
  subCategoryCount?: number;
};

type ProductsPageClientProps = {
  parentCategories: Category[];
  childCategories: Category[];
  showHeroSection?: boolean;
};

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

const getCategorySlug = (category: Category) => category?.slug?.current || "";

const getParentMeta = (category: Category) => {
  const parent = category.parentCategory as
    | (Category & { _ref?: string })
    | { _ref?: string }
    | undefined;
  return {
    id: (parent as Category | undefined)?._id || parent?._ref || "",
    slug: (parent as Category | undefined)?.slug?.current || "",
  };
};

const ProductsPageClient = ({
  parentCategories,
  childCategories,
  showHeroSection = true,
}: ProductsPageClientProps) => {
  const { t } = useTranslation();
  const [activeParent, setActiveParent] = useState("all");
  const [searchValue, setSearchValue] = useState("");

  const parentOptions = useMemo(
    () =>
      parentCategories
        .map((category) => ({
          value: getCategorySlug(category) || category._id,
          label: category.title || "Category",
          count: (category as CategoryWithCounts).subCategoryCount,
        }))
        .filter((category) => Boolean(category.value)),
    [parentCategories]
  );

  const baseCategories = childCategories.length ? childCategories : parentCategories;

  const visibleCategories = useMemo(() => {
    const normalizedQuery = normalize(searchValue);

    return baseCategories.filter((category) => {
      if (activeParent !== "all") {
        if (childCategories.length) {
          const parentMeta = getParentMeta(category);
          if (activeParent !== parentMeta.slug && activeParent !== parentMeta.id) {
            return false;
          }
        } else {
          const slug = getCategorySlug(category) || category._id;
          if (activeParent !== slug) return false;
        }
      }

      if (!normalizedQuery) return true;

      const title = normalize(category.title);
      const slug = normalize(category.slug?.current);
      return title.includes(normalizedQuery) || slug.includes(normalizedQuery);
    });
  }, [activeParent, baseCategories, childCategories.length, searchValue]);

  const activeParentLabel = useMemo(() => {
    if (activeParent === "all") return t("client.products.categories.allResults");
    return (
      parentCategories.find((category) =>
        [category.slug?.current, category._id].includes(activeParent)
      )?.title || t("client.products.categories.selectedFallback")
    );
  }, [activeParent, parentCategories, t]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="space-y-8 py-10">
        {showHeroSection ? (
          <header className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {t("client.products.categories.badge")}
            </p>
            <Title className="text-3xl font-bold text-ink-strong sm:text-4xl">
              {t("client.products.categories.title")}
            </Title>
            <p className="text-ink-muted max-w-3xl mx-auto">
              {t("client.products.categories.subtitle")}
            </p>
          </header>
        ) : null}

        {parentOptions.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveParent("all")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                activeParent === "all"
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-surface-0 text-ink hover:border-ink/40"
              )}
            >
              {t("client.products.categories.allLabel")}
              <Badge variant="secondary" className="border-0 bg-white/80 text-ink">
                {baseCategories.length}
              </Badge>
            </button>
            {parentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveParent(option.value)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                  activeParent === option.value
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-surface-0 text-ink hover:border-ink/40"
                )}
              >
                {option.label}
                {typeof option.count === "number" ? (
                  <Badge variant="secondary" className="border-0 bg-white/80 text-ink">
                    {option.count}
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-3">
          <div className="w-full max-w-md">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("client.products.categories.search.placeholder")}
              aria-label={t("client.products.categories.search.ariaLabel")}
            />
          </div>
          <p className="text-sm text-ink-muted">
            {t("client.products.categories.results", {
              count: visibleCategories.length,
              label: activeParentLabel,
            })}
          </p>
        </div>

        {visibleCategories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-0 p-8 text-center text-ink-muted">
            {t("client.products.categories.empty")}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleCategories.map((category) => {
              const slug = category.slug?.current;
              const href = slug ? buildCategoryUrl(slug) : CATEGORY_BASE_PATH;
              const counts = category as CategoryWithCounts;
              const totalItems =
                typeof counts.productCount === "number"
                  ? t("client.products.categories.card.count.products", {
                      count: counts.productCount,
                    })
                  : typeof counts.subCategoryCount === "number"
                  ? t("client.products.categories.card.count.subcategories", {
                      count: counts.subCategoryCount,
                    })
                  : t("client.products.categories.card.count.browse");
              const titleFallback = t("client.products.categories.card.titleFallback");
              const descriptionFallback = t(
                "client.products.categories.card.descriptionFallback"
              );
              const title = category.title || titleFallback;

              return (
                <Link
                  key={category._id}
                  href={href}
                  className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-ink/50 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-surface-1">
                      {category.image ? (
                        <Image
                          src={urlFor(category.image).width(96).height(96).url()}
                          alt={t("client.products.categories.card.imageAlt", {
                            title,
                          })}
                          width={96}
                          height={96}
                          className="h-14 w-14 object-contain"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-ink-muted">NCS</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-ink-strong line-clamp-1">
                        {title}
                      </h3>
                      <p className="text-sm text-ink-muted line-clamp-2">
                        {category.description || descriptionFallback}
                      </p>
                      <Badge variant="secondary" className="w-fit">
                        {totalItems}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex justify-center">
          <Button asChild variant="outline" className="h-11 px-6">
            <Link href="/shop">{t("client.products.categories.cta")}</Link>
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default ProductsPageClient;
