"use client";

import "@/app/i18n";
import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import bannerSettings from "@/helpers/bannerSettings";
import { useTranslation } from "react-i18next";

const HeroBannerPlaceholder = () => {
  const { t } = useTranslation();
  const primaryBanner = bannerSettings[0];
  const secondaryBanner = bannerSettings[1];
  const title = t("client.home.hero.placeholder.title", {
    defaultValue:
      primaryBanner?.title || "Find the right gear without the noise.",
  });
  const description = t("client.home.hero.placeholder.description", {
    defaultValue:
      primaryBanner?.subtitle ||
      "Shop the latest arrivals, vetted specs, and time-sensitive deals. One decisive red action when you're ready to buy.",
  });
  const primaryCta = primaryBanner
    ? { label: primaryBanner.ctaLabel, href: primaryBanner.ctaHref }
    : { label: "Shop now", href: "/shop" };
  const secondaryCta = secondaryBanner
    ? { label: secondaryBanner.ctaLabel, href: secondaryBanner.ctaHref }
    : { label: "View promotions", href: "/promotions" };
  const bannerImage = primaryBanner?.imageUrl;
  const bannerAlt = t("client.home.hero.placeholder.imageAlt", {
    defaultValue:
      primaryBanner?.alt || primaryBanner?.title || "Hero banner",
  });

  return (
    <section className="border-b border-border bg-surface-0">
      <Container className="py-12 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Badge variant="secondary">
              {t("client.home.hero.placeholder.badge", {
                defaultValue: "Featured",
              })}
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-ink-strong">
              {title}
            </h1>
            <p className="text-lg text-ink-muted max-w-[60ch]">{description}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="accent" className="h-11 px-6">
                <Link href={primaryCta.href}>
                  {t("client.home.hero.placeholder.primaryCta", {
                    defaultValue: primaryCta.label,
                  })}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-6">
                <Link href={secondaryCta.href}>
                  {t("client.home.hero.placeholder.secondaryCta", {
                    defaultValue: secondaryCta.label,
                  })}
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-0">
              {bannerImage ? (
                <Image
                  src={bannerImage}
                  alt={bannerAlt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 520px, 100vw"
                />
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HeroBannerPlaceholder;
