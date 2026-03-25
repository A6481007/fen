"use client";

import "@/app/i18n";
import Container from "@/components/Container";
import ResourcesClient from "@/components/resources/ResourcesClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AggregatedResource } from "@/sanity/queries/resources";
import { CalendarCheck, Newspaper, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type ResourcesPageClientProps = {
  resources: AggregatedResource[];
  showHeroCard?: boolean;
};

const ResourcesPageClient = ({ resources, showHeroCard = true }: ResourcesPageClientProps) => {
  const { t } = useTranslation();

  const counts = useMemo(() => {
    const total = resources.length;
    const news = resources.filter((resource) => resource.source === "news").length;
    const events = resources.filter((resource) => resource.source === "event").length;
    return { total, news, events };
  }, [resources]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-shop_light_bg to-white">
      <Container className="pt-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href="/news" className="hover:text-shop_dark_green">
            {t("client.resources.breadcrumb.news")}
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">
            {t("client.resources.breadcrumb.resources")}
          </span>
        </div>
      </Container>

      {showHeroCard ? (
        <Container className="py-8">
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-lime-500 text-white shadow-xl">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-semibold uppercase tracking-wide">
                    <Sparkles className="h-4 w-4" /> {t("client.resources.hero.badge")}
                  </div>
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                    {t("client.resources.hero.title")}
                  </h1>
                  <p className="max-w-3xl text-sm text-white/90 sm:text-base">
                    {t("client.resources.hero.subtitle")}
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl bg-white/10 p-6 text-white/90 backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">
                    {t("client.resources.breadcrumb.resources")}
                  </p>
                  <div className="space-y-2">
                    <Badge className="w-full justify-start gap-2 bg-white/15 px-3 py-2 text-white shadow-sm">
                      <Newspaper className="h-4 w-4" />
                      {t("client.resources.groups.news.label")}
                      <span className="ml-auto text-sm font-semibold">{counts.news}</span>
                    </Badge>
                    <Badge className="w-full justify-start gap-2 bg-white/15 px-3 py-2 text-white shadow-sm">
                      <CalendarCheck className="h-4 w-4" />
                      {t("client.resources.groups.events.label")}
                      <span className="ml-auto text-sm font-semibold">{counts.events}</span>
                    </Badge>
                    <Badge className="w-full justify-start gap-2 bg-white/15 px-3 py-2 text-white shadow-sm">
                      <Sparkles className="h-4 w-4" />
                      {t("client.resources.hero.badge")} ·{" "}
                      {t("client.resources.groups.count", { count: counts.total })}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Container>
      ) : null}

      <Container className="pb-12">
        <ResourcesClient resources={resources} />
      </Container>
    </div>
  );
};

export default ResourcesPageClient;
