"use client";

import AccessControl from "@/components/shared/AccessControl";
import LockBadge from "@/components/shared/LockBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AggregatedResource } from "@/sanity/queries/resources";
import { ArrowUpRight, Download, File as FileIcon, FileText, Image as ImageIcon, Link2 } from "lucide-react";
import Link from "next/link";

type ResourceCardProps = {
  resource: AggregatedResource;
  view?: "grid" | "list";
  onLockedClick?: (resource: AggregatedResource, message: string) => void;
};

const formatFileSize = (value?: number | null) => {
  if (!value || value <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const fileTypeLabel = (value?: string | null) => {
  if (!value) return "Resource";
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

const getFileIcon = (value?: string | null) => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "pdf" || normalized === "document") return <FileText className="h-5 w-5" aria-hidden="true" />;
  if (normalized === "image") return <ImageIcon className="h-5 w-5" aria-hidden="true" />;
  if (normalized === "link") return <Link2 className="h-5 w-5" aria-hidden="true" />;
  return <FileIcon className="h-5 w-5" aria-hidden="true" />;
};

const ResourceCard = ({ resource, view = "grid", onLockedClick }: ResourceCardProps) => {
  const access = resource.access ?? { isVisible: true, lockReason: null, unlockDate: null };
  const isLocked = !access.isVisible;
  const fileUrl = resource.file?.asset?.url || null;
  const fileName = resource.file?.asset?.originalFilename || resource.title || "Resource";
  const sizeValue =
    resource.file?.asset?.size ??
    resource.file?.asset?.metadata?.size ??
    null;
  const sizeLabel = formatFileSize(sizeValue);
  const typeLabel = fileTypeLabel(resource.fileType || resource.file?.asset?.extension || resource.file?.asset?.mimeType);
  const parentHref = resource.parentSlug
    ? resource.source === "event"
      ? `/news/events/${resource.parentSlug}`
      : `/news/${resource.parentSlug}`
    : null;
  const lockMessage = access.lockReason || "This file unlocks after the event or once you register.";
  const parentDateLabel = formatDate(resource.parentDate);

  const handleLockedClick = () => {
    if (onLockedClick) {
      onLockedClick(resource, lockMessage);
    }
  };

  return (
    <div
      className={cn(
        "group flex h-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        view === "list" ? "md:flex-row md:items-center md:justify-between" : ""
      )}
    >
      <div className={cn("flex flex-1 gap-4", view === "list" ? "md:items-center" : "items-start")}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-shop_light_bg text-shop_dark_green">
          {getFileIcon(resource.fileType)}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("border-transparent px-2.5 py-1 text-xs font-semibold", resource.source === "event" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700")}>
              {resource.source === "event" ? "Event resource" : "News attachment"}
            </Badge>
            <Badge variant="outline" className="bg-white text-gray-700">
              {typeLabel}
            </Badge>
            {resource.status ? (
              <Badge variant="outline" className="bg-white capitalize text-gray-600">
                {resource.status.replace("_", " ")}
              </Badge>
            ) : null}
            {isLocked ? <LockBadge reason={access.lockReason} /> : null}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold text-shop_dark_green">{resource.title || "Untitled resource"}</h3>
            <p className="text-sm text-gray-600">
              {resource.description ||
                "Supporting material for our news and events. Unlock access by registering or waiting for the event to end."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="rounded-full bg-gray-100 px-2 py-1">{fileName}</span>
            {sizeLabel ? <span className="rounded-full bg-gray-100 px-2 py-1">{sizeLabel}</span> : null}
            {parentDateLabel ? (
              <span className="rounded-full bg-gray-100 px-2 py-1">
                Updated {parentDateLabel}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-500">
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

      <div className="flex flex-col gap-2 md:w-48 md:items-end">
        <AccessControl
          accessible={!isLocked}
          accessLevel={resource.status === "event_locked" ? "event-locked" : "public"}
          fallback={
            <Button
              variant="outline"
              className="w-full border-dashed text-gray-500 md:w-auto"
              onClick={handleLockedClick}
            >
              <LockBadge isLocked reason={access.lockReason} className="bg-transparent p-0 text-xs" />
              <span className="ml-1 text-xs font-semibold">Locked</span>
            </Button>
          }
        >
          {fileUrl ? (
            <Button
              asChild
              className="w-full bg-shop_dark_green text-white hover:bg-shop_light_green md:w-auto"
            >
              <Link href={fileUrl} target="_blank" rel="noopener noreferrer">
                {resource.fileType === "link" ? (
                  <>
                    <ArrowUpRight className="mr-2 h-4 w-4" aria-hidden="true" />
                    Open link
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Download
                  </>
                )}
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed text-gray-500 md:w-auto"
              disabled
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

export default ResourceCard;
