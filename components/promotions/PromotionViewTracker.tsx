"use client";

import { useEffect, useRef } from "react";

type PromotionViewTrackerProps = {
  campaignId: string;
  userId?: string | null;
  disabled?: boolean;
};

const SESSION_STORAGE_KEY = "promotion_session_id";

const isAbortLikeError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; message?: string };
  if (candidate.name === "AbortError") return true;
  return typeof candidate.message === "string" && candidate.message.toLowerCase().includes("aborted");
};

const ensureSessionId = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return null;
  }
};

export function PromotionViewTracker({ campaignId, userId, disabled }: PromotionViewTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (disabled || sentRef.current) return;
    sentRef.current = true;

    const sessionId = userId ? null : ensureSessionId();
    if (!userId && !sessionId) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/promotions/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        action: "view",
        userId: userId ?? undefined,
        sessionId: sessionId ?? undefined,
        metadata: {
          page: "promotion-detail",
          referrer: typeof document !== "undefined" ? document.referrer : undefined,
        },
      }),
      signal: controller.signal,
    }).catch((error) => {
      if (controller.signal.aborted || isAbortLikeError(error)) {
        return;
      }
      console.error("[promotions] Failed to track view", error);
    });

    return () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, [campaignId, userId, disabled]);

  return null;
}

export default PromotionViewTracker;
