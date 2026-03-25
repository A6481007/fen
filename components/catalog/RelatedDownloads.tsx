import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogItem } from "@/sanity/queries/catalog";
import { Download, FileText, Link2, Tag } from "lucide-react";
import Link from "next/link";

type RelatedDownload = NonNullable<CatalogItem["relatedDownloads"]>[number];

type RelatedDownloadsProps = {
  downloads?: CatalogItem["relatedDownloads"] | null;
};

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return "";

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const getFileTypeLabel = (download: RelatedDownload) =>
  download.file?.asset?.metadata?.mimeType ||
  download.file?.asset?.originalFilename?.split(".").pop();

const getDownloadUrl = (download: RelatedDownload) =>
  download.file?.asset?.url || null;

const RelatedDownloads = ({ downloads }: RelatedDownloadsProps) => {
  const items: RelatedDownload[] = Array.isArray(downloads)
    ? (downloads.filter(Boolean) as RelatedDownload[])
    : [];

  if (!items.length) {
    return (
      <Card className="border border-slate-200 bg-white/70">
        <CardContent className="flex items-start gap-3 p-5 text-sm text-slate-700">
          <FileText className="mt-0.5 h-5 w-5 text-shop_dark_green" />
          <div>
            <p className="font-semibold text-slate-900">No related downloads yet</p>
            <p className="text-slate-600">
              Browse the catalog for more resources or check back soon for new additions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-shop_dark_green">
            Related downloads
          </p>
          <h3 className="text-xl font-semibold text-slate-900">
            You might also find these useful
          </h3>
        </div>
        <Link
          href="/catalog"
          className="text-sm font-semibold text-shop_light_green hover:text-shop_dark_green"
        >
          View all catalog items
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((download) => {
          const downloadUrl = getDownloadUrl(download);
          const fileType = getFileTypeLabel(download);
          const fileSize = formatFileSize(download.file?.asset?.metadata?.size);

          return (
            <Card
              key={download._id || download.slug || download.title}
              className="h-full border border-slate-200 bg-white shadow-sm"
            >
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {fileType ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                        <FileText className="mr-1 h-3.5 w-3.5 text-shop_dark_green" />
                        {fileType}
                      </Badge>
                    ) : null}
                    {fileSize ? (
                      <Badge variant="outline" className="border-dashed">
                        {fileSize}
                      </Badge>
                    ) : null}
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">
                    {download.title || "Download"}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <Badge variant="outline" className="border-dashed">
                    <Tag className="mr-1 h-3 w-3 text-shop_dark_green" />
                    Download asset
                  </Badge>
                  {download.slug ? (
                    <Badge variant="outline" className="border-dashed">
                      <Link2 className="mr-1 h-3 w-3 text-shop_dark_green" />
                      {download.slug}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="gap-2 bg-shop_dark_green text-white hover:bg-shop_dark_green/90"
                    disabled={!downloadUrl}
                  >
                    <Link
                      href={downloadUrl || "#"}
                      download
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-slate-200 text-slate-800 hover:border-shop_dark_green hover:text-shop_dark_green"
                  >
                    <Link href={downloadUrl || "/catalog"} target={downloadUrl ? "_blank" : undefined}>
                      Preview link
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default RelatedDownloads;
