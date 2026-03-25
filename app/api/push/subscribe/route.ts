import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { saveSubscription, validateSubscription } from "@/lib/promotions/pushAdapter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const subscriptionSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  type: z.enum(["web", "fcm", "apns"]).default("web"),
  subscription: z.union([
    z.object({
      endpoint: z.string().url(),
      expirationTime: z.number().nullable().optional(),
      keys: z.object({ auth: z.string().min(1), p256dh: z.string().min(1) }),
    }),
    z.string().trim().min(1),
  ]),
  deviceId: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = subscriptionSchema.parse(body);

    if (payload.type === "web") {
      const subscription = normalizeSubscriptionInput(payload.subscription);
      if (!subscription || !validateSubscription(subscription)) {
        return NextResponse.json({ error: "Invalid web subscription payload" }, { status: 400 });
      }

      await saveSubscription(payload.userId, subscription, payload.type, payload.deviceId);

      return NextResponse.json({
        ok: true,
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      });
    }

    const token =
      typeof payload.subscription === "string"
        ? payload.subscription
        : JSON.stringify(payload.subscription);

    await saveSubscription(payload.userId, token, payload.type, payload.deviceId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues?.[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    console.error("[push] subscribe error", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

function normalizeSubscriptionInput(
  subscription: unknown,
): PushSubscription | null {
  if (typeof subscription === "string") {
    try {
      return JSON.parse(subscription) as PushSubscription;
    } catch (error) {
      console.warn("[push] Failed to parse subscription string", error);
      return null;
    }
  }

  if (subscription && typeof subscription === "object") {
    return subscription as PushSubscription;
  }

  return null;
}

// Minimal type aligned with web-push PushSubscription without importing server-only modules in API runtime types
interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
}
