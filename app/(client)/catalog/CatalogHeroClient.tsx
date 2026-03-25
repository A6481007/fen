"use client";

import Container from "@/components/Container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookmarkCheck, FileDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

type CatalogHeroClientProps = {
  totalCount: number;
  categoryCount: number;
  showHeroCard?: boolean;
};

const CatalogHeroClient = ({
  totalCount,
  categoryCount,
  showHeroCard = true,
}: CatalogHeroClientProps) => {
  const { t } = useTranslation();

  return (
    <>
      <Container className="pt-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href="/" className="hover:text-shop_dark_green">
            {t("client.catalog.breadcrumb.home")}
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">
            {t("client.catalog.breadcrumb.catalog")}
          </span>
        </div>
      </Container>

      {showHeroCard ? (
        <Container className="py-8">
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white shadow-xl">
            <CardContent className="p-6 sm:p-8 lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-semibold uppercase tracking-wide">
                    <Sparkles className="h-4 w-4" /> {t("client.catalog.hero.badge")}
                  </div>
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                    {t("client.catalog.hero.title")}
                  </h1>
                  <p className="max-w-3xl text-sm text-white/90 sm:text-base">
                    {t("client.catalog.hero.subtitle")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-white/15 px-3 py-2 text-white shadow-sm backdrop-blur">
                      <FileDown className="mr-2 h-4 w-4" />
                      {t("client.catalog.hero.assetsAvailable", { count: totalCount })}
                    </Badge>
                    <Badge className="bg-white/15 px-3 py-2 text-white shadow-sm backdrop-blur">
                      <BookmarkCheck className="mr-2 h-4 w-4" />
                      {t("client.catalog.hero.categoriesIndexed", { count: categoryCount })}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/80">
                    {t("client.catalog.hero.whatsInside")}
                  </p>
                  <Separator className="my-4 bg-white/30" />
                  <ul className="space-y-3 text-white/90">
                    <li className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">
                          {t("client.catalog.hero.feature.coverTitle")}
                        </p>
                        <p className="text-sm text-white/80">
                          {t("client.catalog.hero.feature.coverBody")}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <FileDown className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">
                          {t("client.catalog.hero.feature.downloadTitle")}
                        </p>
                        <p className="text-sm text-white/80">
                          {t("client.catalog.hero.feature.downloadBody")}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <BookmarkCheck className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">
                          {t("client.catalog.hero.feature.filterTitle")}
                        </p>
                        <p className="text-sm text-white/80">
                          {t("client.catalog.hero.feature.filterBody")}
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </Container>
      ) : null}
    </>
  );
};

export default CatalogHeroClient;
