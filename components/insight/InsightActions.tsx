"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";

import ShareButton from "@/components/shared/ShareButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InsightActionsProps = {
  slug: string;
  title: string;
  shareUrl?: string;
  recommendedHref?: string;
  className?: string;
};

type SavedInsight = {
  slug: string;
  title: string;
  savedAt: string;
};

const STORAGE_KEY = "savedInsights";

const readSavedInsights = () => {
  if (typeof window === "undefined") return [] as SavedInsight[];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [] as SavedInsight[];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as SavedInsight[]) : [];
  } catch {
    return [] as SavedInsight[];
  }
};

const writeSavedInsights = (items: SavedInsight[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
};

const InsightActions = ({
  slug,
  title,
  shareUrl,
  recommendedHref,
  className,
}: InsightActionsProps) => {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const saved = readSavedInsights();
    setIsSaved(saved.some((item) => item.slug === slug));
  }, [slug]);

  const toggleSaved = useCallback(() => {
    if (!slug) return;
    const saved = readSavedInsights();
    const exists = saved.some((item) => item.slug === slug);
    const next = exists
      ? saved.filter((item) => item.slug !== slug)
      : [
          { slug, title, savedAt: new Date().toISOString() },
          ...saved,
        ];
    writeSavedInsights(next.slice(0, 50));
    setIsSaved(!exists);
  }, [slug, title]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ShareButton
        url={shareUrl}
        title={title}
        variant="outline"
        size="sm"
        className="rounded-full border-border text-ink"
      />
      {recommendedHref ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-border text-ink"
        >
          <Link href={recommendedHref}>Recommended kit</Link>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full text-ink"
        onClick={toggleSaved}
      >
        {isSaved ? (
          <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Bookmark className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{isSaved ? "Saved" : "Save"}</span>
      </Button>
    </div>
  );
};

export default InsightActions;
