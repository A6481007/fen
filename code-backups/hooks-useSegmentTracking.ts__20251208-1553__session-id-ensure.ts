'use client';

import { useEffect, useRef } from "react";
import { trackSegmentChanged, trackSegmentResolved } from "@/lib/analytics";
import { getFullSegmentResult } from "@/lib/segmentation/rules";
import { useSegment } from "./useSegment";

export function useSegmentTracking() {
  const { segment, segmentData } = useSegment();
  const previousSegmentRef = useRef<string | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!segment || !segmentData) return;

    const sessionId =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("session_id") || "unknown"
        : "unknown";
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
