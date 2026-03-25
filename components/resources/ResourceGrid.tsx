"use client";

import "@/app/i18n";
import ResourceCard from "@/components/shared/ResourceCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AggregatedResource } from "@/sanity/queries/resources";
import { Info, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type ResourceGridProps = {
  resources: AggregatedResource[];
  view?: "grid" | "list";
};

const ResourceGrid = ({ resources = [], view = "grid" }: ResourceGridProps) => {
  const { t } = useTranslation();
  const [lockInfo, setLockInfo] = useState<{
    message: string;
    href?: string | null;
    title?: string;
  } | null>(null);

  const handleLockedClick = (resource: AggregatedResource, message: string) => {
    const href =
      resource.source === "event" && resource.parentSlug
        ? `/news/events/${resource.parentSlug}`
        : resource.parentSlug
          ? `/news/${resource.parentSlug}`
          : null;

    setLockInfo({
      message,
      href,
      title: resource.title,
    });
  };

  if (!resources.length) {
    return (
      <Card className="border border-dashed border-gray-200 bg-white/70">
        <CardContent className="flex items-center gap-3 p-6 text-gray-600">
          <Info className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <div>
            <p className="font-semibold text-shop_dark_green">
              {t("client.resources.empty.noMatchesTitle", { defaultValue: "No resources found" })}
            </p>
            <p className="text-sm text-gray-600">
              {t("client.resources.empty.noMatchesSubtitle", {
                defaultValue:
                  "Try adjusting the filters or check back after events conclude to unlock attendee files.",
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {lockInfo ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <Lock className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>
            {t("client.resources.locked.title", { defaultValue: "Locked resource" })}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-1 text-sm">
            <span>{lockInfo.message}</span>
            {lockInfo.href ? (
              <Link
                href={lockInfo.href}
                className="font-semibold text-shop_dark_green underline decoration-shop_light_green underline-offset-4 hover:text-shop_light_green"
              >
                {lockInfo.href.includes("/events/")
                  ? t("client.resources.locked.cta.event", {
                      defaultValue: "Go to the parent event",
                    })
                  : t("client.resources.locked.cta.article", {
                      defaultValue: "Go to the parent article",
                    })}
              </Link>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div
        className={cn(
          view === "grid"
            ? "grid grid-cols-1 gap-4 md:grid-cols-2"
            : "grid grid-cols-1 gap-3"
        )}
      >
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            view={view}
            onLockedClick={handleLockedClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ResourceGrid;
