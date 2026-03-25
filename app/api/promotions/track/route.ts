import { NextRequest, NextResponse } from "next/server";
import {
  incrementPromotionMetric,
  trackUserPromoInteraction,
  type UserAction,
} from "@/lib/promotions/analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TrackMetadata = {
  page?: string;
  variant?: string;
  productId?: string;
  referrer?: string;
};

type TrackRequest = {
  campaignId: string;
  action: UserAction;
  userId?: string;
  sessionId?: string;
  metadata?: TrackMetadata;
};

const ACTION_TO_METRIC: Record<
  UserAction,
  "impressions" | "clicks" | "addToCarts" | null
> = {
  view: "impressions",
  click: "clicks",
  addToCart: "addToCarts",
  purchase: null,
};

const isUserAction = (value: unknown): value is UserAction =>
  value === "view" || value === "click" || value === "addToCart" || value === "purchase";

const sanitizeMetadata = (metadata?: TrackMetadata): TrackMetadata | undefined => {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const cleaned: TrackMetadata = {};

  if (typeof metadata.page === "string" && metadata.page.trim()) {
    cleaned.page = metadata.page.trim();
  }

  if (typeof metadata.variant === "string" && metadata.variant.trim()) {
    cleaned.variant = metadata.variant.trim();
  }

  if (typeof metadata.productId === "string" && metadata.productId.trim()) {
    cleaned.productId = metadata.productId.trim();
  }

  if (typeof metadata.referrer === "string" && metadata.referrer.trim()) {
    cleaned.referrer = metadata.referrer.trim();
  }

  return Object.keys(cleaned).length ? cleaned : undefined;
};

const badRequest = (error: string) =>
  NextResponse.json({ success: false, error }, { status: 400 });

const serverError = () =>
  NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON payload");
  }

  try {
    if (!body || typeof body !== "object") {
      return badRequest("Invalid request payload");
    }

    const { campaignId: rawCampaignId, action: rawAction, userId: rawUserId, sessionId: rawSessionId, metadata } =
      body as Partial<TrackRequest>;

    const campaignId = typeof rawCampaignId === "string" ? rawCampaignId.trim() : "";
    if (!campaignId) {
      return badRequest("campaignId is required");
    }

    if (!isUserAction(rawAction)) {
      return badRequest("Invalid action");
    }

    const action = rawAction;
    const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";
    const sessionId = typeof rawSessionId === "string" ? rawSessionId.trim() : "";

    if (!userId && !sessionId) {
      return badRequest("Either userId or sessionId is required");
    }

    const cleanedMetadata = sanitizeMetadata(metadata);
    const metric = ACTION_TO_METRIC[action];

    if (metric) {
      const incremented = await incrementPromotionMetric(campaignId, metric, 1);
      if (!incremented) {
        throw new Error("Failed to increment promotion metric");
      }
    }

    if (userId) {
      const tracked = await trackUserPromoInteraction(userId, campaignId, action, cleanedMetadata);
      if (!tracked) {
        throw new Error("Failed to track user interaction");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[promotions][track] Failed to track interaction", error);
    return serverError();
  }
}
