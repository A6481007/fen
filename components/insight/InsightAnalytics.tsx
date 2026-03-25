"use client";

import { useEffect, useRef } from "react";

import {
  trackInsightReadComplete,
  trackInsightScrollDepth,
  trackInsightView,
} from "@/lib/analytics";

const SCROLL_THRESHOLDS = [25, 50, 75, 100];
const READ_COMPLETE_THRESHOLD = 90;

type InsightAnalyticsProps = {
  insightId: string;
  kind: "knowledge" | "solutions";
  locale: string;
};

const InsightAnalytics = ({ insightId, kind, locale }: InsightAnalyticsProps) => {
  const scrollDepths = useRef(new Set<number>());
  const readCompleteSent = useRef(false);
  const viewSent = useRef(false);

  useEffect(() => {
    if (!insightId || viewSent.current) return;
    viewSent.current = true;
    trackInsightView({ insightId, kind, locale });
  }, [insightId, kind, locale]);

  useEffect(() => {
    if (!insightId) return;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;
        const doc = document.documentElement;
        const scrollTop = window.scrollY || doc.scrollTop || 0;
        const scrollHeight = doc.scrollHeight || 0;
        const viewportHeight = window.innerHeight || doc.clientHeight || 0;
        const totalScrollable = Math.max(scrollHeight - viewportHeight, 0);
        const percent =
          totalScrollable > 0
            ? Math.min(100, Math.max(0, (scrollTop / totalScrollable) * 100))
            : 100;

        SCROLL_THRESHOLDS.forEach((threshold) => {
          if (percent >= threshold && !scrollDepths.current.has(threshold)) {
            scrollDepths.current.add(threshold);
            trackInsightScrollDepth({
              insightId,
              kind,
              locale,
              depth: threshold,
            });
          }
        });

        if (!readCompleteSent.current && percent >= READ_COMPLETE_THRESHOLD) {
          readCompleteSent.current = true;
          trackInsightReadComplete({ insightId, kind, locale });
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [insightId, kind, locale]);

  return null;
};

export default InsightAnalytics;
