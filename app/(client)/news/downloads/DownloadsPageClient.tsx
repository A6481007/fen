"use client";

import Container from "@/components/Container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import dayjs from "dayjs";
import { Download, ExternalLink, FolderDown } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type NewsDownload = {
  _id?: string;
  title?: string;
  slug?: { current?: string };
  publishedAt?: string;
  summary?: string;
  downloadLabel?: string;
  downloadUrl?: string;
  assetUrl?: string;
  blogcategories?: { title?: string }[];
};

type DownloadsPageClientProps = {
  downloads: NewsDownload[];
};

const resolveSlug = (slug?: { current?: string } | null) => slug?.current || "";

const resolveDownloadUrl = (download: NewsDownload) =>
  download.downloadUrl || download.assetUrl || "";

const getDetailUrl = (download: NewsDownload) => {
  const slug = resolveSlug(download.slug);
  return slug ? `/news/${slug}` : "";
};

const clampText = (value?: string, limit: number = 160) => {
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}...`;
};

const DownloadsPageClient = ({ downloads }: DownloadsPageClientProps) => {
  const { t } = useTranslation();
  const items = Array.isArray(downloads) ? downloads : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="py-10 space-y-10">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            <FolderDown className="h-4 w-4 text-shop_dark_green" />
            {t("client.downloads.hero.badge")}
          </div>
          <h1 className="text-3xl font-bold text-shop_dark_green sm:text-4xl">
            {t("client.downloads.hero.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-600 sm:text-base">
            {t("client.downloads.hero.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="bg-shop_light_green/20 text-shop_dark_green">
              {t("client.downloads.count", { count: items.length })}
            </Badge>
            <Button asChild variant="outline" className="border-shop_dark_green text-shop_dark_green">
              <Link href="/news">{t("client.downloads.backToNews")}</Link>
            </Button>
          </div>
        </header>

        {items.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-white/70">
            <CardContent className="py-12 text-center">
              <p className="text-base font-semibold text-slate-700">
                {t("client.downloads.empty.title")}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {t("client.downloads.empty.subtitle")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((download, index) => {
              const downloadUrl = resolveDownloadUrl(download);
              const detailUrl = getDetailUrl(download);
              const isExternal = downloadUrl.startsWith("http");
              const hasDownload = Boolean(downloadUrl);

              return (
                <Card
                  key={download._id || detailUrl || index}
                  className="group overflow-hidden border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {download.publishedAt
                            ? t("client.downloads.card.updated", {
                                date: dayjs(download.publishedAt).format("MMM D, YYYY"),
                              })
                            : t("client.downloads.card.updatedFallback")}
                        </p>
                        <h2 className="text-lg font-semibold text-slate-900">
                          {download.title || t("client.downloads.card.titleFallback")}
                        </h2>
                      </div>
                      <Badge variant="secondary" className="bg-brand-border text-brand-black-strong">
                        {t("client.downloads.card.download")}
                      </Badge>
                    </div>

                    {download.blogcategories && download.blogcategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {download.blogcategories.map((category, categoryIndex) => (
                          <Badge
                            key={`${category?.title || "category"}-${categoryIndex}`}
                            variant="outline"
                            className="border-slate-200 text-slate-600"
                          >
                            {category?.title || t("client.downloads.card.categoryFallback")}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <p className="text-sm text-slate-600 line-clamp-3">
                      {clampText(download.summary) ||
                        t("client.downloads.card.summaryFallback")}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {hasDownload ? (
                        <Button asChild className="bg-shop_dark_green text-white hover:bg-shop_dark_green/90">
                          {isExternal ? (
                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              {download.downloadLabel || t("client.downloads.card.download")}
                            </a>
                          ) : (
                            <Link href={downloadUrl}>
                              <Download className="mr-2 h-4 w-4" />
                              {download.downloadLabel || t("client.downloads.card.download")}
                            </Link>
                          )}
                        </Button>
                      ) : (
                        <Button disabled variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          {t("client.downloads.card.noFile")}
                        </Button>
                      )}

                      {detailUrl ? (
                        <Button asChild variant="outline" className="border-slate-200">
                          <Link href={detailUrl}>
                            {t("client.downloads.card.viewDetails")}{" "}
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default DownloadsPageClient;
