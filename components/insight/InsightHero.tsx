"use client";

import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type InsightHeroProps = {
  title: string;
  summary?: string | null;
  categoryLabel?: string | null;
  typeLabel?: string | null;
  metaItems?: { label: string; value: string }[];
  primaryCta?: ReactNode;
  helperText?: ReactNode;
  heroImage?: unknown;
  heroLayout?: "standard" | "fullBleed" | "imageLeft" | "imageRight" | "banner";
  heroTheme?: "light" | "dark" | "overlay";
  caption?: string | null;
  actions?: ReactNode;
};

const themeClasses: Record<
  NonNullable<InsightHeroProps["heroTheme"]>,
  { wrapper: string; overlay: string; text: string; muted: string; chip: string }
> = {
  light: {
    wrapper: "bg-surface-0 text-ink",
    overlay: "from-white/40 via-white/10 to-transparent",
    text: "text-ink-strong",
    muted: "text-ink-muted",
    chip: "bg-white/70 text-ink border border-border",
  },
  dark: {
    wrapper: "bg-ink text-white",
    overlay: "from-black/60 via-black/30 to-transparent",
    text: "text-white",
    muted: "text-white/80",
    chip: "bg-white/15 text-white border border-white/20",
  },
  overlay: {
    wrapper: "bg-ink text-white",
    overlay: "from-black/70 via-black/40 to-transparent",
    text: "text-white",
    muted: "text-white/80",
    chip: "bg-white/15 text-white border border-white/20",
  },
};

const layoutIsBackground = (layout?: string) => layout === "fullBleed" || layout === "banner";

const InsightHero = ({
  title,
  summary,
  categoryLabel,
  typeLabel,
  metaItems,
  primaryCta,
  helperText,
  heroImage,
  heroLayout = "standard",
  heroTheme = "light",
  caption,
  actions,
}: InsightHeroProps) => {
  const theme = themeClasses[heroTheme] || themeClasses.light;
  const imageUrl = heroImage ? urlFor(heroImage).width(1600).height(900).url() : null;
  const altText =
    (heroImage as { alt?: string })?.alt ||
    (heroImage as { caption?: string })?.caption ||
    title ||
    "Hero image";

  const textBlock = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
        {categoryLabel ? (
          <span className={cn("rounded-full px-3 py-1", theme.chip)}>{categoryLabel}</span>
        ) : null}
        {typeLabel ? (
          <span className={cn("rounded-full px-3 py-1", theme.chip)}>{typeLabel}</span>
        ) : null}
      </div>
      <div className="space-y-3">
        <h1 className={cn("text-4xl font-semibold leading-tight sm:text-5xl", theme.text)}>{title}</h1>
        {summary ? <p className={cn("max-w-[70ch] text-lg leading-relaxed", theme.muted)}>{summary}</p> : null}
      </div>
      {metaItems && metaItems.length ? (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {metaItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-white/5 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/10"
            >
              <p className="text-[11px] uppercase tracking-[0.1em] text-ink-soft">{item.label}</p>
              <p className={cn("mt-1 font-semibold", theme.text)}>{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {(primaryCta || actions || helperText) && (
        <div className="space-y-2">
          {primaryCta}
          {helperText ? <p className={cn("text-right text-xs", theme.muted)}>{helperText}</p> : null}
          {actions}
        </div>
      )}
    </div>
  );

  if (!imageUrl) {
    return (
      <div className={cn("border-b border-border pb-8", theme.wrapper)}>
        <div className="container space-y-6 py-6">{textBlock}</div>
      </div>
    );
  }

  if (layoutIsBackground(heroLayout)) {
    return (
      <div className={cn("relative isolate overflow-hidden border-b border-border", theme.wrapper)}>
        <div className="absolute inset-0">
          <Image
            src={imageUrl}
            alt={altText}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div className={cn("absolute inset-0 bg-gradient-to-t", theme.overlay)} />
        </div>
        <div className="container relative py-16 sm:py-20 lg:py-24">
          <div className="max-w-4xl space-y-6">{textBlock}</div>
          {caption ? <p className={cn("mt-4 text-sm", theme.muted)}>{caption}</p> : null}
        </div>
      </div>
    );
  }

  if (heroLayout === "imageLeft" || heroLayout === "imageRight") {
    const imageNode = (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-0 shadow-sm">
        <Image
          src={imageUrl}
          alt={altText}
          width={1200}
          height={900}
          className="h-full w-full object-cover"
          sizes="(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 100vw"
          priority
        />
        {caption ? <p className="px-4 py-2 text-sm text-ink-muted">{caption}</p> : null}
      </div>
    );

    return (
      <div className={cn("border-b border-border py-10", theme.wrapper)}>
        <div className="container grid items-center gap-10 lg:grid-cols-2">
          {heroLayout === "imageLeft" ? imageNode : textBlock}
          {heroLayout === "imageLeft" ? textBlock : imageNode}
        </div>
      </div>
    );
  }

  // standard layout
  return (
    <div className={cn("border-b border-border", theme.wrapper)}>
      <div className="container space-y-8 py-10">
        {textBlock}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-0">
          <Image
            src={imageUrl}
            alt={altText}
            width={1600}
            height={900}
            className="h-auto w-full object-cover"
            sizes="(min-width: 1280px) 1100px, (min-width: 768px) 90vw, 100vw"
            priority
          />
        </div>
        {caption ? <p className={cn("text-sm", theme.muted)}>{caption}</p> : null}
      </div>
    </div>
  );
};

export default InsightHero;
