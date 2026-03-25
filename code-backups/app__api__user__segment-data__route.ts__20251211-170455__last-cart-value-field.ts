import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { adminDb, Timestamp } from "@/lib/firebaseAdmin";
import {
  getFullSegmentResult,
  type SegmentResult,
  type SegmentType,
  type UserSegmentData,
} from "@/lib/segmentation/rules";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FirestoreTimestampLike = {
  seconds: number;
  nanoseconds?: number;
};

type FirestoreUserDoc = {
  ordersCount?: number;
  ltv?: number;
  lastPurchaseAt?: unknown;
  abandonedCarts?: number;
  lastCartAbandonedAt?: unknown;
  createdAt?: unknown;
  emailVerified?: boolean;
  isSubscriber?: boolean;
};

type PromotionUsage = { campaignId: string } & Record<string, unknown>;

interface SegmentDataResponse {
  userId: string;
  segment: SegmentType;
  segmentData: UserSegmentData;
  segmentResult: SegmentResult;
  promoUsage: PromotionUsage[];
}

const buildDefaultSegmentData = (): UserSegmentData => ({
  ordersCount: 0,
  ltv: 0,
  lastPurchaseAt: null,
  abandonedCarts: 0,
  lastCartAbandonedAt: null,
  accountCreatedAt: new Date(),
  emailVerified: false,
  isSubscriber: false,
});

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      // Continue to other parsing strategies when toDate throws.
    }
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as FirestoreTimestampLike).seconds === "number"
  ) {
    const seconds = (value as FirestoreTimestampLike).seconds;
    const nanos = (value as FirestoreTimestampLike).nanoseconds ?? 0;

    if (Number.isFinite(seconds)) {
      const millisFromNanos = Number.isFinite(nanos)
        ? Math.floor(nanos / 1_000_000)
        : 0;
      return new Date(seconds * 1000 + millisFromNanos);
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

export async function GET(request: NextRequest) {
  try {
    const { userId: sessionUserId } = await auth();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userDocRef = adminDb.collection("users").doc(userId);
    const userDoc = await userDocRef.get();

    let segmentData: UserSegmentData = buildDefaultSegmentData();
    let promoUsage: PromotionUsage[] = [];

    if (userDoc.exists) {
      const data = userDoc.data() as FirestoreUserDoc | undefined;

      segmentData = {
        ordersCount: toNumber(data?.ordersCount) ?? 0,
        ltv: toNumber(data?.ltv) ?? 0,
        lastPurchaseAt: toDateValue(data?.lastPurchaseAt),
        abandonedCarts: toNumber(data?.abandonedCarts) ?? 0,
        lastCartAbandonedAt: toDateValue(data?.lastCartAbandonedAt),
        accountCreatedAt: toDateValue(data?.createdAt) ?? new Date(),
        emailVerified: Boolean(data?.emailVerified),
        isSubscriber: Boolean(data?.isSubscriber),
      };

      const promoUsageSnap = await userDocRef.collection("promotions").get();
      promoUsage = promoUsageSnap.docs.map((doc) => ({
        campaignId: doc.id,
        ...doc.data(),
      }));
    }

    const segmentResult = getFullSegmentResult(segmentData);
    const responseBody: SegmentDataResponse = {
      userId,
      segment: segmentResult.primary,
      segmentData,
      segmentResult,
      promoUsage,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Error fetching segment data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
