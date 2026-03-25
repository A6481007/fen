"use client";

import AccessControl from "@/components/shared/AccessControl";
import LockBadge from "@/components/shared/LockBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventStatus } from "@/sanity/helpers/eventStatus";
import { Download, FileText, Image as ImageIcon, Link2, Shield } from "lucide-react";
import Link from "next/link";

type ResourceAccess = {
  isVisible?: boolean;
  lockReason?: string | null;
  unlockDate?: string | null;
};

export type EventResourceItem = {
  _key?: string;
  title?: string | null;
  description?: string | null;
  status?: "public" | "event_locked" | string | null;
  fileType?: string | null;
  file?: {
    asset?: {
      _id?: string | null;
      url?: string | null;
      originalFilename?: string | null;
    } | null;
  } | null;
  access?: ResourceAccess;
};

type GatedResourcesProps = {
  resources?: EventResourceItem[] | null;
  isAttendee: boolean;
  canAccess: boolean;
  status: EventStatus;
};

const iconForType = (value?: string | null) => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "image") return <ImageIcon className="h-5 w-5" aria-hidden="true" />;
  if (normalized === "link") return <Link2 className="h-5 w-5" aria-hidden="true" />;
  return <FileText className="h-5 w-5" aria-hidden="true" />;
};

const humanizeType = (value?: string | null) => {
  if (!value) return "Resource";
  const normalized = value.toLowerCase();
  if (normalized === "pdf") return "PDF";
  if (normalized === "image") return "Image";
  if (normalized === "document") return "Document";
  if (normalized === "link") return "Link";
  return value;
};

const formatUnlockDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString();
};

const GatedResources = ({ resources = [], isAttendee, canAccess, status }: GatedResourcesProps) => {
  const items = Array.isArray(resources) ? resources.filter(Boolean) : [];

  if (!items.length) {
    return (
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-shop_dark_green">
            <Shield className="h-5 w-5" aria-hidden="true" />
            Event resources
          </CardTitle>
          <p className="text-sm text-gray-600">
            Materials, slides, and certificates will appear here once the host uploads them.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-shop_dark_green">
          <Shield className="h-5 w-5" aria-hidden="true" />
          Event resources
        </CardTitle>
        <p className="text-sm text-gray-600">
          {isAttendee
            ? status === "upcoming"
              ? "You’re in! Files unlock automatically once the event goes live."
              : "Download your materials below."
            : "Register to unlock attendee-only downloads when the event starts."}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.map((resource, index) => {
          const access = resource.access ?? { isVisible: true, lockReason: null, unlockDate: null };
          const isLocked = !access.isVisible || (resource.status === "event_locked" && !canAccess);
          const fileUrl = resource.file?.asset?.url || null;
          const label = humanizeType(resource.fileType || resource.status);
          const unlockDateLabel = formatUnlockDate(access.unlockDate);

          return (
            <div
              key={resource._key || resource.title || index}
              className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-shop_light_bg text-shop_dark_green">
                  {iconForType(resource.fileType)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-gray-900">
                      {resource.title || "Event resource"}
                    </p>
                    {resource.status ? (
                      <Badge variant="outline" className="bg-white text-gray-700">
                        {resource.status === "event_locked" ? "Locked" : "Public"}
                      </Badge>
                    ) : null}
                    {isLocked ? <LockBadge reason={access.lockReason} /> : null}
                  </div>
                  {resource.description ? (
                    <p className="text-sm text-gray-600">{resource.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    {label ? <span className="rounded-full bg-gray-100 px-2 py-1">{label}</span> : null}
                    {unlockDateLabel ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1">
                        Unlocks {unlockDateLabel}
                      </span>
                    ) : null}
                  </div>
                  {isLocked && access.lockReason ? (
                    <p className="text-xs text-amber-700">{access.lockReason}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <AccessControl
                  accessible={!isLocked}
                  accessLevel={resource.status === "event_locked" ? "event-locked" : "public"}
                  fallback={
                    <>
                      <LockBadge reason={access.lockReason} />
                      <Button
                        disabled
                        variant="outline"
                        className="w-full sm:w-auto border-dashed text-gray-500"
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        Locked
                      </Button>
                    </>
                  }
                >
                  <>
                    {fileUrl ? (
                      <Button
                        asChild
                        className="w-full sm:w-auto bg-shop_dark_green text-white hover:bg-shop_light_green"
                      >
                        <Link href={fileUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                          Download
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        disabled
                        variant="outline"
                        className="w-full sm:w-auto border-dashed text-gray-500"
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        File pending
                      </Button>
                    )}
                  </>
                </AccessControl>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default GatedResources;
