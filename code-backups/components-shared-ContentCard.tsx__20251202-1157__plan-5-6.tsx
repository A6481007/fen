"use client";

import LockBadge from "@/components/shared/LockBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type ContentCardLayout = "grid" | "list";
export type ContentCardSize = "compact" | "default" | "large";

export type ContentCardBadge = {
  label: string;
  variant?: "default" | "secondary" | "outline";
  colorClassName?: string;
  icon?: ReactNode;
};

export type ContentCardMetadata = {
  icon?: ReactNode;
  label?: string;
  value: ReactNode;
};

export type ContentCardAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  target?: string;
  rel?: string;
};

export type ContentCardProps = {
  title: string;
  description?: string | null;
  image?: {
    url?: string | null;
    alt?: string | null;
  };
  badges?: ContentCardBadge[];
  metadata?: ContentCardMetadata[];
  layout?: ContentCardLayout;
  size?: ContentCardSize;
  mediaHref?: string;
  primaryAction?: ContentCardAction;
  secondaryAction?: ContentCardAction;
  className?: string;
  featured?: boolean;
  locked?: boolean;
  lockMessage?: string | null;
  ariaLabel?: string;
  mediaClassName?: string;
};

type ContentCardSkeletonProps = {
  layout?: ContentCardLayout;
  size?: ContentCardSize;
  featured?: boolean;
  mediaClassName?: string;
};

const sizeVariants: Record<ContentCardSize, Record<string, string>> = {
  compact: {
    media: "h-40",
    padding: "p-4",
    gap: "gap-3",
    title: "text-base",
    description: "text-sm line-clamp-2",
    metaText: "text-xs",
    badge: "px-2 py-0.5 text-[11px]",
    actionsGap: "gap-2",
  },
  default: {
    media: "h-48",
    padding: "p-5",
    gap: "gap-4",
    title: "text-lg",
    description: "text-sm line-clamp-3",
    metaText: "text-xs",
    badge: "px-2.5 py-1 text-xs",
    actionsGap: "gap-3",
  },
  large: {
    media: "h-60 md:h-72",
    padding: "p-6 md:p-7",
    gap: "gap-5",
    title: "text-xl md:text-2xl",
    description: "text-base line-clamp-3",
    metaText: "text-sm",
    badge: "px-3 py-1.5 text-sm",
    actionsGap: "gap-3",
  },
};

const layoutVariants: Record<ContentCardLayout, Record<string, string>> = {
  grid: {
    wrapper: "flex-col",
    media: "w-full",
    content: "",
    actions: "justify-between",
  },
  list: {
    wrapper: "flex-col md:flex-row md:items-stretch",
    media: "md:w-64 md:flex-shrink-0",
    content: "md:flex-1",
    actions: "md:justify-between",
  },
};

const renderAction = (
  action: ContentCardAction,
  {
    variant = "default",
    disabled = false,
    className,
  }: { variant?: "default" | "outline" | "ghost"; disabled?: boolean; className?: string }
) => {
  const ariaLabel = action.ariaLabel || action.label;
  const content = (
    <span className="inline-flex items-center gap-2">
      {action.icon ? <span className="flex items-center" aria-hidden="true">{action.icon}</span> : null}
      <span>{action.label}</span>
    </span>
  );

  if (action.href && !disabled) {
    return (
      <Button
        asChild
        variant={variant}
        className={className}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <Link href={action.href} target={action.target} rel={action.rel}>
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      aria-label={ariaLabel}
      className={className}
      onClick={action.onClick}
      disabled={disabled}
      type="button"
    >
      {content}
    </Button>
  );
};

export const ContentCardSkeleton = ({
  layout = "grid",
  size = "default",
  featured,
  mediaClassName,
}: ContentCardSkeletonProps) => {
  const sizeVariant = sizeVariants[size] || sizeVariants.default;
  const layoutVariant = layoutVariants[layout] || layoutVariants.grid;
  const mediaClass = mediaClassName || sizeVariant.media;

  return (
    <Card
      className={cn(
        "flex h-full overflow-hidden rounded-2xl border border-gray-100 bg-white/70 shadow-sm",
        layoutVariant.wrapper,
        featured ? "md:col-span-2" : ""
      )}
      role="status"
      aria-label="Loading content"
      data-layout={layout}
      data-size={size}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-shop_light_bg",
          mediaClass,
          layoutVariant.media
        )}
      >
        <Skeleton className="h-full w-full" />
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col",
          sizeVariant.padding,
          sizeVariant.gap,
          layoutVariant.content
        )}
      >
        <Skeleton className={cn("h-6 w-24", sizeVariant.badge)} />
        <div className="space-y-2">
          <Skeleton className={cn("h-6 w-3/4", sizeVariant.title)} />
          <Skeleton className={cn("h-4 w-full", sizeVariant.description)} />
          <Skeleton className={cn("h-4 w-5/6", sizeVariant.description)} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className={cn("mt-auto flex flex-wrap gap-3", sizeVariant.actionsGap)}>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </Card>
  );
};

const ContentCard = ({
  title,
  description,
  image,
  badges = [],
  metadata = [],
  layout = "grid",
  size = "default",
  mediaHref,
  primaryAction,
  secondaryAction,
  className,
  featured = false,
  locked = false,
  lockMessage,
  ariaLabel,
  mediaClassName,
}: ContentCardProps) => {
  const sizeVariant = sizeVariants[size] || sizeVariants.default;
  const layoutVariant = layoutVariants[layout] || layoutVariants.grid;
  const cardLabel = ariaLabel || title || "Content item";
  const showBadges = badges.length > 0;
  const primaryDisabled = primaryAction ? primaryAction.disabled || (locked && !primaryAction.onClick) : false;
  const secondaryDisabled = secondaryAction ? secondaryAction.disabled : false;
  const imageAlt = image?.alt || title || "Content image";
  const mediaClass = mediaClassName || sizeVariant.media;

  return (
    <Card
      role="article"
      tabIndex={0}
      aria-label={cardLabel}
      className={cn(
        "group relative flex h-full overflow-hidden rounded-2xl border border-gray-100 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shop_light_green",
        layoutVariant.wrapper,
        featured ? "md:col-span-2" : "",
        className
      )}
      data-layout={layout}
      data-size={size}
      data-locked={locked ? "true" : "false"}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl bg-shop_light_bg",
          mediaClass,
          layoutVariant.media
        )}
      >
        {image?.url ? (
          <Image
            src={image.url}
            alt={imageAlt}
            fill
            sizes={layout === "list" ? "(min-width: 768px) 25vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
            className="object-cover transition duration-300 group-hover:scale-105"
            priority={featured}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-shop_dark_green">
            <ImageIcon className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        {mediaHref ? (
          <Link href={mediaHref} className="absolute inset-0" aria-label={cardLabel} />
        ) : null}
        {showBadges ? (
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            {badges.map((badge, index) => (
              <Badge
                key={`${badge.label}-${index}`}
                variant={badge.variant || "default"}
                className={cn(
                  "rounded-full bg-white/90 text-sm font-semibold text-shop_dark_green backdrop-blur",
                  sizeVariant.badge,
                  badge.colorClassName
                )}
              >
                {badge.icon ? <span className="mr-1 inline-flex items-center" aria-hidden="true">{badge.icon}</span> : null}
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col",
          layoutVariant.content,
          sizeVariant.padding,
          sizeVariant.gap
        )}
      >
        <div className="space-y-2">
          <h3 className={cn("font-semibold text-shop_dark_green", sizeVariant.title)}>{title}</h3>
          {description ? (
            <p className={cn("text-gray-700", sizeVariant.description)}>{description}</p>
          ) : null}
        </div>

        {metadata.length > 0 ? (
          <div className={cn("flex flex-wrap items-center gap-3 text-gray-600", sizeVariant.metaText)}>
            {metadata.map((item, index) => (
              <div key={item.label || index} className="inline-flex items-center gap-2">
                {item.icon ? <span className="text-current" aria-hidden="true">{item.icon}</span> : null}
                {item.label ? <span className="text-gray-500">{item.label}</span> : null}
                <span className="font-medium text-gray-700">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            "mt-auto flex flex-wrap items-center gap-3",
            sizeVariant.actionsGap,
            layoutVariant.actions
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {locked ? (
              <LockBadge
                isLocked
                reason={lockMessage || "Locked"}
                ariaLabel={`Locked: ${lockMessage || title || "content"}`}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {primaryAction
              ? renderAction(primaryAction, {
                  variant: "default",
                  disabled: primaryDisabled,
                  className: "bg-shop_dark_green text-white hover:bg-shop_light_green",
                })
              : null}
            {secondaryAction
              ? renderAction(secondaryAction, {
                  variant: "outline",
                  disabled: secondaryDisabled,
                  className: "border-gray-200 text-shop_dark_green hover:bg-shop_light_bg",
                })
              : null}
          </div>
        </div>
      </div>
    </Card>
  );
};

const Component = Object.assign(ContentCard, { Skeleton: ContentCardSkeleton });

export default Component;
