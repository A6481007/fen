"use client";

import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ShareButton from "@/components/shared/ShareButton";
import { cn } from "@/lib/utils";
import { urlFor } from "@/sanity/lib/image";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  Package,
  User2,
  Wrench,
  Zap,
} from "lucide-react";

export interface InsightCardProps {
  insight: {
    _id: string;
    title: string;
    slug: { current: string };
    insightType: string;
    summary?: string;
    mainImage?: any;
    heroImage?: any;
    featuredImage?: any;
    cardImage?: any;
    readingTime?: number;
    publishedAt?: string;
    author?: {
      name: string;
      image?: any;
    };
    solutionMaturity?: string;
    solutionComplexity?: string;
    implementationTimeline?: string;
    metrics?: Array<{ metricLabel: string; metricValue: string }>;
    linkedProducts?: any[];
    solutionProducts?: any[];
  };
  variant?: "default" | "featured" | "compact" | "solution";
  showMetrics?: boolean;
  showProductCount?: boolean;
  linkBase?: {
    knowledge: string;
    solutions: string;
  };
}

type InsightTypeConfig = {
  label: string;
  className: string;
};

type MaturityConfig = {
  label: string;
  className: string;
};

type ComplexityConfig = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const INSIGHT_TYPE_CONFIG: Record<string, InsightTypeConfig> = {
  productKnowledge: {
    label: "Product Knowledge",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  generalKnowledge: {
    label: "General Knowledge",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  problemKnowledge: {
    label: "Problem Knowledge",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  comparison: {
    label: "Comparison",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  caseStudy: {
    label: "Case Study",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  validatedSolution: {
    label: "Validated Solution",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  theoreticalSolution: {
    label: "Theoretical Solution",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
};

const FALLBACK_INSIGHT_TYPE: InsightTypeConfig = {
  label: "Insight",
  className: "border border-ink/15 bg-white/90 text-ink-strong",
};

const SOLUTION_TYPES = new Set([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

const MATURITY_CONFIG: Record<string, MaturityConfig> = {
  proven: {
    label: "Proven",
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
  tested: {
    label: "Tested",
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
  emerging: {
    label: "Emerging",
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
};

const COMPLEXITY_CONFIG: Record<string, ComplexityConfig> = {
  quickWin: {
    label: "Quick Win",
    icon: Zap,
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
  standard: {
    label: "Standard",
    icon: Wrench,
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
  enterprise: {
    label: "Enterprise",
    icon: Building2,
    className: "border border-ink/20 bg-surface-0 text-ink",
  },
};

const formatDate = (value?: string) => {
  if (!value) return "Coming soon";
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "Coming soon";
  return parsed.format("MMM D, YYYY");
};

const normalizeBase = (value: string) => (value.endsWith("/") ? value.slice(0, -1) : value);

const buildInsightHref = (
  slug?: string,
  insightType?: string,
  linkBase?: InsightCardProps["linkBase"]
) => {
  const knowledgeBase = normalizeBase(linkBase?.knowledge || "/insight/knowledge");
  const solutionsBase = normalizeBase(linkBase?.solutions || "/insight/solutions");
  const isSolutionType = SOLUTION_TYPES.has(insightType || "");
  if (!slug) return isSolutionType ? solutionsBase : knowledgeBase;
  return isSolutionType ? `${solutionsBase}/${slug}` : `${knowledgeBase}/${slug}`;
};

const buildImageUrl = (source: any, variant: InsightCardProps["variant"]) => {
  if (!source) return null;
  if (typeof source === "string") return source;

  const size =
    variant === "featured"
      ? { width: 1200, height: 720 }
      : variant === "solution"
      ? { width: 1000, height: 560 }
      : { width: 900, height: 520 };

  try {
    return urlFor(source).width(size.width).height(size.height).url();
  } catch (error) {
    console.error("Unable to build insight image url", error);
    return null;
  }
};

const buildAvatarUrl = (source: any) => {
  if (!source) return null;
  if (typeof source === "string") return source;

  try {
    return urlFor(source).width(80).height(80).url();
  } catch (error) {
    console.error("Unable to build insight author image url", error);
    return null;
  }
};

const InsightCard = ({
  insight,
  variant = "default",
  showMetrics,
  showProductCount,
  linkBase,
}: InsightCardProps) => {
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";
  const isSolution = variant === "solution";
  const typeConfig =
    INSIGHT_TYPE_CONFIG[insight.insightType || ""] || FALLBACK_INSIGHT_TYPE;
  const href = buildInsightHref(insight.slug?.current, insight.insightType, linkBase);
  const cardImageSource =
    insight.cardImage ||
    insight.mainImage ||
    insight.featuredImage ||
    insight.heroImage;
  const imageUrl = isCompact ? null : buildImageUrl(cardImageSource, variant);
  const authorName = insight.author?.name || "ShopCart Team";
  const authorAvatar = buildAvatarUrl(insight.author?.image);
  const dateLabel = formatDate(insight.publishedAt);
  const summaryText =
    insight.summary ||
    "Explore expert guidance, research, and solution strategies from our team.";
  const metricsEnabled = !isCompact
    ? isSolution
      ? showMetrics !== false
      : Boolean(showMetrics)
    : false;
  const metricsPreview = metricsEnabled
    ? (insight.metrics || []).slice(0, 3)
    : [];
  const metricsGridClass =
    metricsPreview.length > 2 ? "grid-cols-3" : "grid-cols-2";
  const maturityConfig =
    MATURITY_CONFIG[insight.solutionMaturity || ""] || MATURITY_CONFIG.proven;
  const complexityConfig =
    COMPLEXITY_CONFIG[insight.solutionComplexity || ""] ||
    COMPLEXITY_CONFIG.standard;
  const productCount = isSolution
    ? insight.solutionProducts?.length ?? 0
    : insight.linkedProducts?.length ?? insight.solutionProducts?.length ?? 0;
  const shouldShowProductCount =
    !isCompact && Boolean(showProductCount) && productCount > 0;
  const productCountLabel = isSolution ? "included" : "linked";

  const contentClasses = cn(
    "space-y-3",
    isCompact ? "p-4" : isFeatured ? "p-6 md:p-7 space-y-4" : "p-5",
    isSolution ? "space-y-4" : ""
  );

  const titleClass = cn(
    "font-semibold text-ink-strong group-hover/title:text-ink transition-colors",
    isCompact ? "text-base" : isFeatured ? "text-xl md:text-2xl" : "text-lg"
  );

  const summaryClass = cn(
    "text-ink-muted",
    isFeatured ? "text-base" : "text-sm line-clamp-3"
  );

  const imageHeight = isFeatured
    ? "h-64 md:h-72"
    : isSolution
    ? "h-52"
    : "h-48";

  const imageSizes = isFeatured
    ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw";

  return (
    <Card
      role="article"
      aria-label={insight.title || "Insight card"}
      className={cn(
        "group h-full overflow-hidden border border-border bg-surface-0 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.5)] transition will-change-transform hover:-translate-y-1 hover:shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)]",
        isCompact ? "hover:-translate-y-0.5" : ""
      )}
      data-variant={variant}
    >
      {!isCompact && (
        <div className={cn("relative overflow-hidden", imageHeight)}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={insight.title || "Insight image"}
              fill
              sizes={imageSizes}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              priority={isFeatured}
            />
          ) : (
            <div className="h-full w-full bg-surface-2" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "border border-ink/15 bg-white/85 text-ink-strong backdrop-blur-sm",
                typeConfig.className
              )}
            >
              {typeConfig.label}
            </Badge>
            {isSolution && (
              <Badge
                variant="secondary"
                className={cn(
                  "border border-ink/15 bg-white/85 text-ink backdrop-blur-sm",
                  maturityConfig.className
                )}
              >
                {maturityConfig.label}
              </Badge>
            )}
            {isSolution && (
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1 border border-ink/15 bg-white/85 text-ink backdrop-blur-sm",
                  complexityConfig.className
                )}
              >
                <complexityConfig.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {complexityConfig.label}
              </Badge>
            )}
          </div>
          <Link
            href={href}
            className="absolute inset-0"
            aria-label={insight.title || "Insight"}
          />
        </div>
      )}

      <CardContent className={contentClasses}>
        {isCompact && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <Badge
              variant="secondary"
              className={cn("border border-ink/15 bg-white text-ink-strong", typeConfig.className)}
            >
              {typeConfig.label}
            </Badge>
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{dateLabel}</span>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="group/title block flex-1">
            <h3 className={titleClass}>{insight.title || "Insight"}</h3>
          </Link>
          <ShareButton
            url={href}
            title={insight.title || "Insight"}
            ariaLabel={`Share ${insight.title || "insight"}`}
            iconOnly
            size="icon"
            variant="ghost"
            className="text-ink-soft hover:text-ink-strong"
          />
        </div>

        {!isCompact && (
          <p className={summaryClass}>
            {summaryText}
          </p>
        )}

        {metricsEnabled && metricsPreview.length > 0 && (
          <div className="rounded-lg border border-border bg-surface-1 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Key metrics
            </p>
            <div className={cn("mt-2 grid gap-2", metricsGridClass)}>
              {metricsPreview.map((metric, index) => (
                <div
                  key={`${metric.metricLabel || "metric"}-${index}`}
                  className="rounded-md border border-border bg-surface-0 p-2"
                >
                  <p className="text-[11px] text-ink-soft line-clamp-1">
                    {metric.metricLabel || "Metric"}
                  </p>
                  <p className="text-sm font-semibold text-ink-strong">
                    {metric.metricValue || "TBD"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isCompact && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
            <div className="flex items-center gap-2">
              {authorAvatar ? (
                <Image
                  src={authorAvatar}
                  alt={authorName}
                  width={32}
                  height={32}
                  className="rounded-full border border-border"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-1 text-ink">
                  <User2 className="h-4 w-4" />
                </div>
              )}
              <span className="font-medium text-ink-strong">
                {authorName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{dateLabel}</span>
            </div>
          </div>
        )}

        {shouldShowProductCount && (
          <div className="flex items-center gap-2 text-xs text-ink">
            <Package className="h-3.5 w-3.5" />
            <span>
              {productCount} product{productCount === 1 ? "" : "s"} {productCountLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightCard;
