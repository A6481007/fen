"use client";

import Container from "./Container";
import Title from "./Title";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { GitCompareArrows, Headphones, ShieldCheck, Truck } from "lucide-react";
import type { BRANDS_QUERYResult } from "@/sanity.types";
import { useTranslation } from "react-i18next";

const extraData = [
  {
    titleKey: "client.home.brands.extra.delivery.title",
    descriptionKey: "client.home.brands.extra.delivery.description",
    icon: <Truck size={45} />,
  },
  {
    titleKey: "client.home.brands.extra.return.title",
    descriptionKey: "client.home.brands.extra.return.description",
    icon: <GitCompareArrows size={45} />,
  },
  {
    titleKey: "client.home.brands.extra.support.title",
    descriptionKey: "client.home.brands.extra.support.description",
    icon: <Headphones size={45} />,
  },
  {
    titleKey: "client.home.brands.extra.moneyBack.title",
    descriptionKey: "client.home.brands.extra.moneyBack.description",
    icon: <ShieldCheck size={45} />,
  },
];

interface Props {
  brands: BRANDS_QUERYResult;
}

const ShopByBrands = ({ brands }: Props) => {
  const { t } = useTranslation();
  const items = Array.isArray(brands) ? brands : [];

  return (
    <Container className="mt-16 lg:mt-24 space-y-8">
      <div className="text-center space-y-3">
        <Title className="text-3xl lg:text-4xl font-semibold text-ink-strong">
          {t("client.home.brands.title")}
        </Title>
        <p className="text-ink-muted text-lg max-w-2xl mx-auto">
          {t("client.home.brands.subtitle")}
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-ink hover:border-ink"
        >
          {t("client.home.brands.cta")}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-surface-0 p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {items?.map((brand) => {
            const title = brand?.title || t("client.home.brands.logoAltFallback");
            const imageAlt = t("client.home.brands.logoAlt", { title });
            return (
            <Link
              key={brand?._id}
              href={{
                pathname: "/shop",
                query: { brand: brand?.slug?.current },
              }}
              className="group flex aspect-square items-center justify-center rounded-xl border border-border bg-surface-0 p-4 transition hover:border-ink"
            >
              {brand?.image && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={urlFor(brand?.image).url()}
                    alt={imageAlt}
                    width={120}
                    height={80}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </Link>
          );
          })}
        </div>

        <div className="border-t border-border pt-4 text-center text-sm text-ink-muted">
          <p>
            {t("client.home.brands.countNote", { count: items.length || 0 })}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-0 p-6 lg:p-8">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-semibold text-ink-strong">
            {t("client.home.brands.guarantee.title")}
          </h3>
          <p className="text-ink-muted">
            {t("client.home.brands.guarantee.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {extraData?.map((item, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-xl border border-border bg-surface-0 p-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink">
                {item.icon}
              </div>
              <h4 className="text-base font-semibold text-ink-strong">
                {t(item.titleKey)}
              </h4>
              <p className="text-sm text-ink-muted">
                {t(item.descriptionKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
};

export default ShopByBrands;
