"use client";

import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

type NewsHeroProps = {
  title: string;
  lead?: string | null;
  categoryLabel?: string | null;
  tags?: string[];
  meta?: ReactNode;
  heroImage?: unknown;
  heroLayout?: "standard" | "fullBleed" | "imageLeft" | "imageRight" | "banner";
  heroTheme?: "light" | "dark" | "overlay";
  caption?: string | null;
};

const themeClasses: Record<
  NonNullable<NewsHeroProps["heroTheme"]>,
  { wrapper: string; overlay: string; text: string; muted: string; chip: string }
> = {
  light: {
    wrapper: "bg-surface-0 text-ink",
    overlay: "from-white/50 via-white/10 to-transparent",
    text: "text-ink-strong",
    muted: "text-ink-muted",
    chip: "bg-white/70 text-ink border border-border",
  },
  dark: {
    wrapper: "bg-ink text-white",
    overlay: "from-black/70 via-black/40 to-transparent",
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

const normalizeImageSource = (image: unknown): SanityImageSource | null => {
  if (!image || typeof image !== "object") return null;

  const candidate = image as {
    _ref?: string | null;
    asset?: { _ref?: string | null; _id?: string | null } | null;
    [key: string]: unknown;
  };

  const ref = candidate._ref || candidate.asset?._ref || candidate.asset?._id;

  if (typeof ref !== "string" || !ref.trim()) return null;

  return {
    ...candidate,
    _ref: ref,
    asset: {
      ...(candidate.asset || {}),
      _ref: ref,
    },
  } as SanityImageSource;
};

const NewsHero = ({
  title,
  lead,
  categoryLabel,
  tags,
  meta,
  heroImage,
  heroLayout = "standard",
  heroTheme = "light",
  caption,
}: NewsHeroProps) => {
  const theme = themeClasses[heroTheme] || themeClasses.light;
  const validHeroImage = normalizeImageSource(heroImage);
  const imageUrl = validHeroImage ? urlFor(validHeroImage).width(1600).height(900).url() : null;
  const altText =
    (heroImage as { alt?: string })?.alt ||
    (heroImage as { caption?: string })?.caption ||
    title ||
    "Hero image";

  const tagPills =
    Array.isArray(tags) && tags.length
      ? tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border bg-surface-1 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted"
          >
            {tag}
          </span>
        ))
      : null;

  const textBlock = (
    <div className="space-y-4">
      {categoryLabel ? (
        <span className={cn("inline-flex w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.12em]", theme.chip)}>
          {categoryLabel}
        </span>
      ) : null}
      <div className="space-y-3">
        <h1 className={cn("text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight tracking-tight", theme.text)}>
          {title}
        </h1>
        {lead ? <p className={cn("text-lg leading-relaxed", theme.muted)}>{lead}</p> : null}
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-4 text-sm">{meta}</div> : null}
      {tagPills ? <div className="flex flex-wrap gap-2">{tagPills}</div> : null}
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
        <div className="container relative py-14 sm:py-16 lg:py-20">
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

export default NewsHero;
