"use client";

import type { Category } from "@/sanity.types";
import Container from "./Container";
import Title from "./Title";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { useTranslation } from "react-i18next";
import { buildCategoryUrl, CATEGORY_BASE_PATH } from "@/lib/paths";

interface Props {
  categories: Category[];
}

const HomeCategories = ({ categories }: Props) => {
  const { t } = useTranslation();

  return (
    <Container className="mt-16 lg:mt-24 space-y-8">
      <div className="text-center space-y-3">
        <Title className="text-3xl lg:text-4xl font-semibold text-ink-strong">
          {t("client.home.categories.title")}
        </Title>
        <p className="text-ink-muted text-lg max-w-2xl mx-auto">
          {t("client.home.categories.subtitle")}
        </p>
        <Link
          href={CATEGORY_BASE_PATH}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-ink hover:border-ink hover:text-ink-strong"
        >
          {t("client.home.categories.cta")}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-surface-0 p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories?.map((category) => {
            const title =
              category?.title || t("client.products.categories.card.titleFallback");
            const imageAlt = t("client.home.categories.card.imageAlt", {
              title,
            });
            return (
              <Link
                key={category?._id}
                href={buildCategoryUrl(category?.slug?.current)}
                className="group flex flex-col gap-4 rounded-xl border border-border bg-surface-0 p-5 transition hover:border-ink"
              >
                <div className="flex justify-center">
                  {category?.image ? (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-surface-1">
                      <Image
                        src={urlFor(category.image).url()}
                        alt={imageAlt}
                        width={80}
                        height={80}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border text-ink-muted">
                      —
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center">
                  <h3 className="text-lg font-semibold text-ink-strong line-clamp-1">
                    {title}
                  </h3>
                  <p className="text-sm text-ink-muted line-clamp-2">
                    {t("client.home.categories.card.subtitle")}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-ink">
                  <span className="inline-flex h-6 items-center rounded-full border border-border px-3 text-xs uppercase tracking-[0.1em]">
                    {t("client.home.categories.card.view")}
                  </span>
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Container>
  );
};

export default HomeCategories;
