'use client';

import { useEffect, useRef } from "react";
import { trackSegmentChanged, trackSegmentResolved } from "@/lib/analytics";
import { getFullSegmentResult } from "@/lib/segmentation/rules";
import { useSegment } from "./useSegment";

const SESSION_STORAGE_KEY = "session_id";

function generateSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureSessionId(): string {
  if (typeof window === "undefined") return "unknown";
  const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const newId = generateSessionId();
  sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
  return newId;
}

export function useSegmentTracking() {
  const { segment, segmentData } = useSegment();
  const previousSegmentRef = useRef<string | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    ensureSessionId();
  }, []);

  useEffect(() => {
    if (!segment || !segmentData) return;

    const sessionId = ensureSessionId();
    const segmentResult = getFullSegmentResult(segmentData);

    // Track initial segment resolution (once per session)
    if (!hasTrackedRef.current) {
      trackSegmentResolved(segment, {
        sessionId,
        allSegments: segmentResult.all,
        priority: segmentResult.priority,
        ordersCount: segmentResult.metadata.ordersCount,
        ltv: segmentResult.metadata.ltv,
        daysSinceLastPurchase:
          segmentResult.metadata.daysSinceLastPurchase ?? undefined,
        trigger: "page_load",
      });
      hasTrackedRef.current = true;
      previousSegmentRef.current = segment;
      return;
    }

    // Track segment changes
    if (previousSegmentRef.current && previousSegmentRef.current !== segment) {
      trackSegmentChanged(previousSegmentRef.current, segment, {
        sessionId,
        trigger: "cart_update",
      });
    }

    previousSegmentRef.current = segment;
  }, [segment, segmentData]);
}
