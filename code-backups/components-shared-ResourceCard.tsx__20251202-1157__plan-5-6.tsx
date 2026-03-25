"use client";

import AccessControl from "@/components/shared/AccessControl";
import LockBadge from "@/components/shared/LockBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AggregatedResource } from "@/sanity/queries/resources";
import { ArrowUpRight, Download, File as FileIcon, FileText, Image as ImageIcon, Link2 } from "lucide-react";
import Link from "next/link";

type ResourceCardProps = {
  resource: AggregatedResource;
  view?: "grid" | "list";
  size?: ResourceCardSize;
  onLockedClick?: (resource: AggregatedResource, message: string) => void;
};

type ResourceCardSize = "compact" | "default" | "expanded";

type ResourceCardSkeletonProps = {
  view?: "grid" | "list";
  size?: ResourceCardSize;
};

const sizeVariants: Record<ResourceCardSize, Record<string, string>> = {
  compact: {
    card: "gap-3 p-4",
    contentGap: "gap-3",
    iconContainer: "h-10 w-10",
    icon: "h-4 w-4",
    bodySpacing: "space-y-2.5",
    title: "text-base",
    description: "text-sm",
    metaText: "text-[11px]",
    metaGap: "gap-1.5",
    pillPadding: "px-2 py-0.5",
    infoText: "text-sm",
    actionsGap: "gap-2",
    badge: "px-2 py-0.5 text-[11px]",
  },
  default: {
    card: "gap-4 p-5",
    contentGap: "gap-4",
    iconContainer: "h-12 w-12",
    icon: "h-5 w-5",
    bodySpacing: "space-y-3",
    title: "text-lg",
    description: "text-sm",
    metaText: "text-xs",
    metaGap: "gap-2",
    pillPadding: "px-2 py-1",
    infoText: "text-sm",
    actionsGap: "gap-2",
    badge: "px-2.5 py-1 text-xs",
  },
  expanded: {
    card: "gap-5 p-6 md:p-7",
    contentGap: "gap-5",
    iconContainer: "h-14 w-14",
    icon: "h-6 w-6",
    bodySpacing: "space-y-4",
    title: "text-xl",
    description: "text-base",
    metaText: "text-sm",
    metaGap: "gap-2.5",
    pillPadding: "px-2.5 py-1.5",
    infoText: "text-base",
    actionsGap: "gap-3",
    badge: "px-3 py-1.5 text-sm",
  },
};

const formatFileSize = (value?: number | null) => {
  if (!value || value <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const fileTypeLabel = (value?: string | null) => {
  if (!value || typeof value !== "string") return "Resource";
  const normalized = value.toLowerCase();
  if (normalized === "pdf") return "PDF";
  if (normalized === "image") return "Image";
  if (normalized === "document") return "Document";
  if (normalized === "link") return "Link";
  return value.toUpperCase();
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString();
};

const getFileIcon = (value?: string | null, iconClassName = "h-5 w-5") => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "pdf" || normalized === "document") return <FileText className={iconClassName} aria-hidden="true" />;
  if (normalized === "image") return <ImageIcon className={iconClassName} aria-hidden="true" />;
  if (normalized === "link") return <Link2 className={iconClassName} aria-hidden="true" />;
  return <FileIcon className={iconClassName} aria-hidden="true" />;
};

const renderFileIcon = (value: string | null | undefined, iconClassName: string) => {
  try {
    return getFileIcon(value, iconClassName);
  } catch (error) {
    console.error("Failed to render file icon for resource card", error);
    return <FileIcon className={iconClassName} aria-hidden="true" data-testid="resource-icon-fallback" />;
  }
};

const ResourceCardComponent = ({ resource, view = "grid", size = "default", onLockedClick }: ResourceCardProps) => {
  const sizeVariant = sizeVariants[size] || sizeVariants.default;
  const access = resource.access ?? { isVisible: true, lockReason: null, unlockDate: null };
  const isLocked = !access.isVisible;
  const fileUrl = resource.file?.asset?.url || null;
  const fileName = resource.file?.asset?.originalFilename || resource.title || "Resource";
  const sizeValue =
    resource.file?.asset?.size ??
    resource.file?.asset?.metadata?.size ??
    null;
  const sizeLabel = formatFileSize(sizeValue);
  const displaySize = sizeLabel ?? "Size not available";
  const typeLabel = fileTypeLabel(resource.fileType || resource.file?.asset?.extension || resource.file?.asset?.mimeType);
  const parentHref = resource.parentSlug
    ? resource.source === "event"
      ? `/news/events/${resource.parentSlug}`
      : `/news/${resource.parentSlug}`
    : null;
  const lockMessage = access.lockReason || "This file unlocks after the event or once you register.";
  const parentDateLabel = formatDate(resource.parentDate);
  const cardLabel = `${typeLabel}: ${resource.title || fileName}${isLocked ? " (locked)" : ""}`;
  const downloadContext = resource.title || fileName;
  const actionLabel =
    resource.fileType === "link"
      ? `Open ${downloadContext}`
      : `Download ${downloadContext}`;

  const handleLockedClick = () => {
    if (onLockedClick) {
      onLockedClick(resource, lockMessage);
    }
  };

  return (
    <div
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-gray-100 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        sizeVariant.card,
        view === "list" ? "md:flex-row md:items-center md:justify-between" : ""
      )}
      role="article"
      aria-label={cardLabel}
    >
      <div className={cn("flex flex-1", sizeVariant.contentGap, view === "list" ? "md:items-center" : "items-start")}>
        <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-shop_light_bg text-shop_dark_green", sizeVariant.iconContainer)}>
          {renderFileIcon(resource.fileType, sizeVariant.icon)}
        </div>

        <div className={cn("flex-1", sizeVariant.bodySpacing)}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("border-transparent font-semibold", sizeVariant.badge, resource.source === "event" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700")}>
              {resource.source === "event" ? "Event resource" : "News attachment"}
            </Badge>
            <Badge variant="outline" className={cn("bg-white text-gray-700", sizeVariant.badge)}>
              {typeLabel}
            </Badge>
            {resource.status ? (
              <Badge variant="outline" className={cn("bg-white capitalize text-gray-600", sizeVariant.badge)}>
                {resource.status.replace("_", " ")}
              </Badge>
            ) : null}
            {isLocked ? <LockBadge reason={access.lockReason} ariaLabel={`Locked: ${lockMessage}`} /> : null}
          </div>

          <div className="space-y-1.5">
            <h3 className={cn("font-semibold text-shop_dark_green", sizeVariant.title)}>{resource.title || "Untitled resource"}</h3>
            <p className={cn("text-gray-600", sizeVariant.description)}>
              {resource.description ||
                "Supporting material for our news and events. Unlock access by registering or waiting for the event to end."}
            </p>
          </div>

          <div className={cn("flex flex-wrap items-center text-gray-600", sizeVariant.metaText, sizeVariant.metaGap)}>
            <span className={cn("rounded-full bg-gray-100", sizeVariant.pillPadding)}>{fileName}</span>
            <span className={cn("rounded-full bg-gray-100", sizeVariant.pillPadding)}>{displaySize}</span>
            {parentDateLabel ? (
              <span className={cn("rounded-full bg-gray-100", sizeVariant.pillPadding)}>
                Updated {parentDateLabel}
              </span>
            ) : null}
          </div>

          <div className={cn("flex flex-wrap items-center text-gray-500", sizeVariant.metaGap, sizeVariant.infoText)}>
            <span>
              {resource.source === "event" ? "Event" : "Article"}:{" "}
              {parentHref ? (
                <Link href={parentHref} className="font-semibold text-shop_dark_green hover:text-shop_light_green">
                  {resource.parentTitle || "View parent"}
                </Link>
              ) : (
                <span className="font-semibold text-shop_dark_green">{resource.parentTitle || "Parent item"}</span>
              )}
            </span>
            {!access.isVisible && access.lockReason ? (
              <span className="text-xs text-amber-700">{access.lockReason}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn("flex flex-col md:w-48 md:items-end", sizeVariant.actionsGap)}>
        <AccessControl
          accessible={!isLocked}
          accessLevel={resource.status === "event_locked" ? "event-locked" : "public"}
          fallback={
            <Button
              variant="outline"
              className="w-full border-dashed text-gray-500 md:w-auto"
              onClick={handleLockedClick}
              aria-label={`Locked resource: ${lockMessage}`}
            >
              <LockBadge isLocked reason={access.lockReason} ariaLabel={`Locked: ${lockMessage}`} className="bg-transparent p-0 text-xs" />
              <span className="ml-1 text-xs font-semibold">Locked</span>
            </Button>
          }
        >
          {fileUrl ? (
            <Button
              asChild
              className="w-full bg-shop_dark_green text-white hover:bg-shop_light_green md:w-auto"
            >
              <Link href={fileUrl} target="_blank" rel="noopener noreferrer" aria-label={`${actionLabel} (${typeLabel})`}>
                {resource.fileType === "link" ? (
                  <>
                    <ArrowUpRight className="mr-2 h-4 w-4" aria-hidden="true" />
                    {actionLabel}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    {actionLabel}
                  </>
                )}
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed text-gray-500 md:w-auto"
              disabled
              aria-label="File coming soon"
            >
              File coming soon
            </Button>
          )}
        </AccessControl>

        {parentHref ? (
          <Button
            asChild
            variant="ghost"
            className="w-full text-shop_dark_green hover:bg-shop_light_bg md:w-auto"
          >
            <Link href={parentHref} className="inline-flex items-center">
              View {resource.source === "event" ? "event" : "article"}
              <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
};

const ResourceCardSkeleton = ({ view = "grid", size = "default" }: ResourceCardSkeletonProps) => {
  const sizeVariant = sizeVariants[size] || sizeVariants.default;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-gray-100 bg-white/80 shadow-sm",
        sizeVariant.card,
        view === "list" ? "md:flex-row md:items-center md:justify-between" : ""
      )}
      role="status"
      aria-label="Loading resource"
      data-testid="resource-card-skeleton"
    >
      <div className={cn("flex flex-1", sizeVariant.contentGap, view === "list" ? "md:items-center" : "items-start")}>
        <Skeleton className={cn("flex shrink-0 items-center justify-center rounded-lg bg-shop_light_bg", sizeVariant.iconContainer)} />

        <div className={cn("flex-1", sizeVariant.bodySpacing)}>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className={cn("h-6 w-28", sizeVariant.badge)} />
            <Skeleton className={cn("h-6 w-20", sizeVariant.badge)} />
            <Skeleton className={cn("h-6 w-16", sizeVariant.badge)} />
          </div>

          <div className="space-y-2">
            <Skeleton className={cn("h-5 w-3/4", sizeVariant.title)} />
            <Skeleton className={cn("h-4 w-full", sizeVariant.description)} />
          </div>

          <div className={cn("flex flex-wrap items-center text-gray-600", sizeVariant.metaText, sizeVariant.metaGap)}>
            <Skeleton className={cn("h-7 w-24 rounded-full", sizeVariant.pillPadding)} />
            <Skeleton className={cn("h-7 w-20 rounded-full", sizeVariant.pillPadding)} />
            <Skeleton className={cn("h-7 w-24 rounded-full", sizeVariant.pillPadding)} />
          </div>

          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div className={cn("flex flex-col md:w-48 md:items-end", sizeVariant.actionsGap)}>
        <Skeleton className="h-10 w-full md:w-32" />
        <Skeleton className="h-10 w-full md:w-28" />
      </div>
    </div>
  );
};

const ResourceCard = Object.assign(ResourceCardComponent, { Skeleton: ResourceCardSkeleton });

export default ResourceCard;
