"use client";

import { useEffect } from "react";

type ContinueLearningTrackerProps = {
  slug: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  readingTime?: number | null;
  updatedAt?: string;
  heroImageUrl?: string;
};

type ContinueLearningEntry = {
  slug: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  readingTime?: number | null;
  updatedAt?: string;
  heroImageUrl?: string;
  lastViewed: string;
};

const STORAGE_KEY = "continueLearningInsights";

const ContinueLearningTracker = ({
  slug,
  title,
  summary,
  category,
  readingTime,
  updatedAt,
  heroImageUrl,
}: ContinueLearningTrackerProps) => {
  useEffect(() => {
    if (!slug) return;
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as ContinueLearningEntry[]) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const nextEntry: ContinueLearningEntry = {
        slug,
        title,
        summary,
        category,
        readingTime,
        updatedAt,
        heroImageUrl,
        lastViewed: new Date().toISOString(),
      };

      const filtered = list.filter((item) => item.slug !== slug);
      filtered.unshift(nextEntry);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 12)));
    } catch {
      // ignore storage errors
    }
  }, [slug, title, summary, category, readingTime, updatedAt, heroImageUrl]);

  return null;
};

export default ContinueLearningTracker;
