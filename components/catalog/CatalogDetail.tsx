import PDFViewer from "@/components/catalog/PDFViewer";
import RelatedDownloads from "@/components/catalog/RelatedDownloads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CatalogItem } from "@/sanity/queries/catalog";
import {
  CalendarDays,
  Download,
  FileText,
  Layers3,
  Share2,
  Tag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type CatalogDetailProps = {
  item: CatalogItem;
  coverImageUrl: string;
  shareUrl: string;
};

type VersionEntry = {
  version?: string;
  dateLabel?: string;
  notes?: string;
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

const formatDate = (dateValue?: string | null) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
};

const getFileTypeLabel = (item: CatalogItem) =>
  item.metadata?.fileType ||
  item.file?.asset?.metadata?.mimeType ||
  item.file?.asset?.originalFilename?.split(".").pop();

const buildShareLinks = (title: string, url: string) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return [
    {
      label: "Twitter / X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
  ];
};

const normalizeVersionHistory = (item: CatalogItem): VersionEntry[] => {
  const entries: VersionEntry[] = [];
  const rawVersions = Array.isArray(item.versions)
    ? item.versions
    : Array.isArray(item.versionHistory)
      ? item.versionHistory
      : [];

  if (item.metadata?.version) {
    entries.push({
      version: item.metadata.version,
      dateLabel: formatDate(item.publishDate),
      notes: "Current",
    });
  }

  rawVersions.forEach((entry) => {
    if (typeof entry === "string") {
      entries.push({ version: entry });
      return;
    }

    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const version =
        typeof record.version === "string"
          ? record.version
          : typeof record.label === "string"
            ? record.label
            : typeof record.name === "string"
              ? record.name
              : undefined;
      const date =
        typeof record.date === "string"
          ? record.date
          : typeof record.publishedAt === "string"
            ? record.publishedAt
            : undefined;
      const notes =
        typeof record.notes === "string"
          ? record.notes
          : typeof record.summary === "string"
            ? record.summary
            : undefined;

      if (version || date || notes) {
        entries.push({
          version,
          dateLabel: formatDate(date),
          notes,
        });
      }
    }
  });

  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.version || ""}-${entry.dateLabel || ""}-${entry.notes || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(entry.version || entry.dateLabel || entry.notes);
  });
};

const CatalogDetail = ({ item, coverImageUrl, shareUrl }: CatalogDetailProps) => {
  const downloadUrl = item.file?.asset?.url || "";
  const fileName = item.file?.asset?.originalFilename || "";
  const description =
    item.summary || item.description || "Download the latest version of this catalog asset.";
  const category = item.metadata?.category || "Catalog";
  const tags =
    Array.isArray(item.metadata?.tags) && item.metadata?.tags?.length
      ? item.metadata.tags.filter(Boolean)
      : [];
  const fileSize =
    formatFileSize(item.metadata?.fileSize ?? item.file?.asset?.metadata?.size) || "";
  const fileType = getFileTypeLabel(item) || "";
  const publishDate = formatDate(item.publishDate);
  const versionLabel = item.metadata?.version ? `v${item.metadata.version}` : "";
  const shareLinks = buildShareLinks(item.title || "Catalog file", shareUrl);
  const versionHistory = normalizeVersionHistory(item);

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border border-slate-200 bg-gradient-to-r from-white to-shop_light_bg/60 shadow-md">
        <CardContent className="p-5 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
              <Image
                src={coverImageUrl}
                alt={item.title || "Catalog cover"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 500px"
                priority={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              <div className="absolute inset-4 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-white text-slate-900 shadow-sm">
                    <Layers3 className="mr-1 h-4 w-4 text-shop_dark_green" />
                    {category}
                  </Badge>
                  {versionLabel ? (
                    <Badge variant="secondary" className="bg-shop_dark_green text-white">
                      {versionLabel}
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-2 rounded-xl bg-white p-3 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                    File metadata
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-800">
                    {fileType ? (
                      <Badge variant="outline" className="border-dashed bg-white">
                        <FileText className="mr-1 h-3.5 w-3.5 text-shop_dark_green" />
                        {fileType}
                      </Badge>
                    ) : null}
                    {fileSize ? (
                      <Badge variant="outline" className="border-dashed bg-white">
                        {fileSize}
                      </Badge>
                    ) : null}
                    {publishDate ? (
                      <Badge variant="outline" className="border-dashed bg-white">
                        <CalendarDays className="mr-1 h-3.5 w-3.5 text-shop_dark_green" />
                        {publishDate}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-shop_dark_green">
                <span>Catalog</span>
                <span className="text-slate-400">/</span>
                <span>{category}</span>
              </div>

              <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                {item.title || "Catalog item"}
              </h1>

              <p className="text-base text-slate-700 sm:text-lg">{description}</p>

              {tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-dashed">
                      <Tag className="mr-1 h-3 w-3 text-shop_dark_green" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                {publishDate ? (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                    <CalendarDays className="h-4 w-4 text-shop_dark_green" />
                    Published {publishDate}
                  </span>
                ) : null}
                {fileType ? (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                    <FileText className="h-4 w-4 text-shop_dark_green" />
                    {fileType}
                  </span>
                ) : null}
                {fileSize ? (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                    {fileSize}
                  </span>
                ) : null}
                {versionLabel ? (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                    {versionLabel}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="gap-2 bg-shop_dark_green text-white hover:bg-shop_dark_green/90"
                  disabled={!downloadUrl}
                >
                  <Link href={downloadUrl || "#"} download target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" />
                    Download file
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white"
                >
                  <Link href="#catalog-viewer">Jump to viewer</Link>
                </Button>
                <div className="flex flex-wrap gap-2">
                  {shareLinks.map((shareLink) => (
                    <Button
                      key={shareLink.label}
                      asChild
                      size="sm"
                      variant="secondary"
                      className="border-slate-200 bg-white text-slate-800 hover:border-shop_dark_green hover:text-shop_dark_green"
                    >
                      <Link href={shareLink.href} target="_blank" rel="noreferrer">
                        <Share2 className="mr-1 h-4 w-4" />
                        {shareLink.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]" id="catalog-viewer">
        <PDFViewer fileUrl={downloadUrl} title={item.title || "Catalog document"} />

        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-shop_dark_green">
                    File details
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">Download metadata</h3>
                </div>
              </div>

              <Separator />

              <dl className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="font-semibold text-slate-800">Filename</dt>
                  <dd className="truncate text-right">{fileName || "Not provided"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="font-semibold text-slate-800">File type</dt>
                  <dd className="text-right">{fileType || "Unknown"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="font-semibold text-slate-800">Size</dt>
                  <dd className="text-right">{fileSize || "Not available"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="font-semibold text-slate-800">Category</dt>
                  <dd className="text-right">{category}</dd>
                </div>
                {publishDate ? (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="font-semibold text-slate-800">Published</dt>
                    <dd className="text-right">{publishDate}</dd>
                  </div>
                ) : null}
                {versionLabel ? (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="font-semibold text-slate-800">Version</dt>
                    <dd className="text-right">{versionLabel}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {versionHistory.length ? (
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-shop_dark_green">
                      Version history
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">Release notes</h3>
                  </div>
                </div>
                <Separator />
                <ul className="space-y-3">
                  {versionHistory.map((entry, index) => (
                    <li
                      key={`${entry.version || "version"}-${index}`}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <p className="font-semibold text-slate-900">
                        {entry.version || "Revision"}
                      </p>
                      <p className="text-sm text-slate-700">
                        {entry.notes || "Catalog update"}
                      </p>
                      {entry.dateLabel ? (
                        <p className="text-xs text-slate-500">Published {entry.dateLabel}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <RelatedDownloads downloads={item.relatedDownloads} />
    </div>
  );
};

export default CatalogDetail;
