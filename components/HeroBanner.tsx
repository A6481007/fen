import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import HeroBannerPlaceholder from "./HeroBannerPlaceholder";
import { cn } from "@/lib/utils";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import { urlFor } from "@/sanity/lib/image";

type HeroBannerProps = {
  placement: string;
  fallbackPlacement?: string | null;
  className?: string;
  banner?: HeroBannerRecord | null;
};

type HeroBadge = {
  _key?: string;
  label?: string;
  tone?: string;
  badge?: { label?: string; tone?: string };
};

type HeroCta = {
  _key?: string;
  label?: string;
  href?: string;
  style?: string;
};

export type HeroBannerRecord = {
  _id?: string;
  title?: string;
  description?: string;
  kicker?: string;
  metaLine?: string;
  layout?: string;
  linkUrl?: string;
  mediaPosition?: "left" | "right" | "background";
  mediaAspect?: string;
  imageOnly?: boolean;
  badge?: string;
  discountAmount?: number;
  heroVariant?: "light" | "dark";
  heroBadges?: HeroBadge[];
  heroCtas?: HeroCta[];
  image?: any;
  imageAlt?: string;
  placement?: string;
  textColor?: "black" | "white";
  badgeColor?: string;
  primaryCtaColor?: string;
  secondaryCtaColor?: string;
  appearance?: string;
};

const aspectClass: Record<string, string> = {
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-[16/9]",
  "21/9": "aspect-[21/9]",
  "1/1": "aspect-square",
};

const mapCtaVariant = (style?: string) => {
  if (style === "secondary") return "outline" as const;
  if (style === "ghost") return "ghost" as const;
  return "accent" as const;
};

const normalizeBadges = (badges?: HeroBadge[], legacyBadge?: string): HeroBadge[] => {
  const items = Array.isArray(badges) ? badges : [];
  const normalized = items.map((item) => ({
    _key: item._key,
    label: item.label ?? item.badge?.label,
    tone: item.tone ?? item.badge?.tone,
  }));
  if (legacyBadge) {
    normalized.unshift({ _key: "legacy", label: legacyBadge, tone: "accent" });
  }
  return normalized;
};

const buildImageUrl = (image: any) => {
  try {
    return urlFor(image).width(1600).height(900).quality(85).url();
  } catch {
    return null;
  }
};

const HeroBanner = async ({ placement, fallbackPlacement = "sitewidepagehero", className, banner }: HeroBannerProps) => {
  const resolvedBanner =
    banner === undefined
      ? ((await getHeroBannerByPlacement(placement, fallbackPlacement)) as HeroBannerRecord | null)
      : banner;

  if (!resolvedBanner) return <HeroBannerPlaceholder />;

  const {
    heroVariant = "light",
    textColor,
    mediaPosition = "right",
    layout = "split",
    mediaAspect = "4/3",
    imageOnly,
  } = resolvedBanner;

  const isDark = heroVariant === "dark";
  const textTone = textColor === "white" || isDark ? "text-white" : "text-ink-strong";
  const mutedTone = textColor === "white" || isDark ? "text-white/80" : "text-ink-muted";
  const surfaceTone = isDark ? "bg-gradient-to-br from-ink to-ink-strong" : "bg-surface-0";

  const badges = normalizeBadges(resolvedBanner.heroBadges, resolvedBanner.badge);
  const ctas = (Array.isArray(resolvedBanner.heroCtas) ? resolvedBanner.heroCtas : [])
    .map((cta, index) => ({
      key: cta._key ?? `cta-${index}`,
      label: cta.label?.trim(),
      href: cta.href?.trim() || resolvedBanner.linkUrl?.trim(),
      variant: mapCtaVariant(cta.style),
    }))
    .filter((cta) => cta.label && cta.href);

  if (ctas.length === 0 && resolvedBanner.linkUrl) {
    ctas.push({
      key: "default-cta",
      label: "Learn more",
      href: resolvedBanner.linkUrl,
      variant: "accent",
    });
  }

  const imageUrl = resolvedBanner.image ? buildImageUrl(resolvedBanner.image) : null;
  const aspectClassName = aspectClass[mediaAspect] ?? "aspect-[4/3]";
  const isBackground = mediaPosition === "background" || layout === "background";
  const isStacked = layout === "stacked";

  const copyBlock = (
    <div className={cn("space-y-4", isStacked ? "order-1" : mediaPosition === "left" ? "order-2" : "order-1")}>
      {resolvedBanner.kicker ? (
        <p className={cn("text-xs uppercase tracking-[0.12em]", mutedTone)}>{resolvedBanner.kicker}</p>
      ) : null}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {badges.map((badgeItem) => (
            <Badge
              key={badgeItem._key ?? badgeItem.label}
              variant={badgeItem.tone === "accent" ? "accent" : badgeItem.tone === "ink" ? "outline" : "secondary"}
              className={badgeItem.tone === "accent" ? "" : undefined}
              style={
                resolvedBanner.badgeColor
                  ? {
                      background: resolvedBanner.badgeColor,
                      borderColor: resolvedBanner.badgeColor,
                      color: "#fff",
                    }
                  : undefined
              }
            >
              {badgeItem.label}
            </Badge>
          ))}
          {typeof resolvedBanner.discountAmount === "number" ? (
            <Badge variant="accent">{`${resolvedBanner.discountAmount}% off`}</Badge>
          ) : null}
        </div>
        <h1 className={cn("text-4xl lg:text-5xl font-semibold leading-tight", textTone)}>
          {resolvedBanner.title || "Featured offer"}
        </h1>
        {resolvedBanner.description ? (
          <p className={cn("text-base lg:text-lg max-w-[70ch]", mutedTone)}>
            {resolvedBanner.description}
          </p>
        ) : null}
        {resolvedBanner.metaLine ? (
          <p className={cn("text-sm font-medium", textTone)}>{resolvedBanner.metaLine}</p>
        ) : null}
      </div>

      {ctas.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {ctas.map((cta, index) => (
            <Button
              key={cta.key}
              asChild
              variant={index === 0 && resolvedBanner.primaryCtaColor ? "outline" : cta.variant}
              className={cn("h-11 px-6", {
                "!bg-[color:var(--hero-primary-cta)] !text-white border-transparent":
                  index === 0 && resolvedBanner.primaryCtaColor,
                "!text-ink": cta.variant === "ghost" && !isDark,
              })}
              style={
                index === 0 && resolvedBanner.primaryCtaColor
                  ? { ["--hero-primary-cta" as string]: resolvedBanner.primaryCtaColor }
                  : cta.variant !== "accent" && resolvedBanner.secondaryCtaColor
                    ? { color: resolvedBanner.secondaryCtaColor, borderColor: resolvedBanner.secondaryCtaColor }
                    : undefined
              }
            >
              <Link href={cta.href ?? "#"}>{cta.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const mediaBlock = imageUrl ? (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-surface-1 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.5)]",
        aspectClassName,
        isStacked ? "order-2" : mediaPosition === "left" ? "order-1" : "order-2",
      )}
    >
      <Image
        src={imageUrl}
        alt={resolvedBanner.imageAlt || resolvedBanner.title || "Hero banner"}
        fill
        priority
        className={cn("object-cover", imageOnly ? "brightness-100" : "object-cover")}
        sizes="(min-width: 1024px) 640px, 100vw"
      />
    </div>
  ) : null;

  if (imageOnly && imageUrl) {
    return (
      <section className={cn("border-b border-border bg-surface-0", className)}>
        <Container className="py-10">
          {mediaBlock ?? (
            <div className={cn("w-full overflow-hidden rounded-2xl border border-border bg-surface-1", aspectClassName)} />
          )}
        </Container>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-b border-border",
        surfaceTone,
        isBackground ? "bg-gradient-to-r from-ink/90 via-ink/80 to-ink/60" : "",
        className,
      )}
      style={{ minHeight: "var(--hero-banner-fixed-height)" }}
    >
      {isBackground && imageUrl ? (
        <>
          <div className="absolute inset-0">
            <Image
              src={imageUrl}
              alt={resolvedBanner.imageAlt || "Hero background"}
              fill
              className="object-cover opacity-50"
              priority
              sizes="100vw"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
        </>
      ) : null}

      <Container className="relative py-12 lg:py-16">
        <div
          className={cn(
            "grid items-center gap-10",
            isStacked ? "grid-cols-1" : "lg:grid-cols-[1.1fr_0.9fr]",
          )}
        >
          {mediaPosition === "left" && !isBackground ? mediaBlock : null}
          {copyBlock}
          {mediaPosition !== "left" && !isBackground ? mediaBlock : null}
        </div>
      </Container>
    </section>
  );
};

export default HeroBanner;
