import "server-only";

import webpush, { type PushSubscription } from "web-push";
import { getMessaging } from "firebase-admin/messaging";

import { adminDb, FieldValue } from "../firebaseAdmin";

export interface PushNotificationParams {
  userId: string;
  tokens: PushToken[];
  campaignId: string;
  title: string;
  body: string;
  image?: string;
  deeplink?: string;
  data?: Record<string, string>;
  variant?: string;
}

export interface PushToken {
  token: string;
  type: "web" | "fcm" | "apns";
  deviceId?: string;
}

export interface PushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  errors?: string[];
}

interface WebPushPayload {
  title: string;
  body: string;
  image?: string;
  deeplink?: string;
  data?: Record<string, string>;
}

interface FCMPayload {
  title: string;
  body: string;
  image?: string;
  deeplink?: string;
  data?: Record<string, string>;
}

const QUIET_HOURS_START = 22;
const QUIET_HOURS_END = 8;
const DEDUP_WINDOW_HOURS = 24;

const vapidSubject =
  process.env.VAPID_SUBJECT || "mailto:support@example.com";
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

const hasVapidConfig = Boolean(vapidPublicKey && vapidPrivateKey);

if (hasVapidConfig) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey as string,
    vapidPrivateKey as string,
  );
} else {
  console.warn(
    "[push] VAPID keys are not fully configured; web push is disabled.",
  );
}

export async function sendPromoPush(
  params: PushNotificationParams,
): Promise<PushResult> {
  const {
    userId,
    tokens,
    campaignId,
    title,
    body,
    image,
    deeplink,
    data,
    variant,
  } = params;

  const uniqueTokens = dedupeTokens(tokens);

  if (uniqueTokens.length === 0) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      errors: ["No push tokens provided"],
    };
  }

  const results: PushResult = {
    success: true,
    successCount: 0,
    failureCount: 0,
    invalidTokens: [],
    errors: [],
  };

  try {
    const isDuplicate = await checkPushDeduplication(userId, campaignId);
    if (isDuplicate) {
      return {
        success: true,
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      };
    }
  } catch (error) {
    results.errors?.push("Failed to check push deduplication");
  }

  let userData: Record<string, unknown> | undefined;
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    userData = userDoc.data();
  } catch (error) {
    results.errors?.push("Failed to load user profile");
  }

  const quietHoursEnabled =
    Boolean(userData?.pushQuietHoursEnabled) &&
    isQuietHours(
      typeof userData?.timezone === "string"
        ? (userData.timezone as string)
        : undefined,
      userData?.pushQuietHoursStart,
      userData?.pushQuietHoursEnd,
    );

  if (quietHoursEnabled) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      errors: ["Quiet hours active"],
    };
  }

  const webTokens = uniqueTokens.filter((token) => token.type === "web");
  const fcmTokens = uniqueTokens.filter(
    (token) => token.type === "fcm" || token.type === "apns",
  );

  if (webTokens.length > 0) {
    if (!hasVapidConfig) {
      results.failureCount += webTokens.length;
      results.errors?.push("VAPID keys missing; skipped web push delivery");
    } else {
      const webResults = await sendWebPush(webTokens, {
        title,
        body,
        image,
        deeplink,
        data,
      });
      results.successCount += webResults.successCount;
      results.failureCount += webResults.failureCount;
      results.invalidTokens.push(...webResults.invalidTokens);
    }
  }

  if (fcmTokens.length > 0) {
    const fcmResults = await sendFCMPush(fcmTokens, {
      title,
      body,
      image,
      deeplink,
      data,
    });
    results.successCount += fcmResults.successCount;
    results.failureCount += fcmResults.failureCount;
    results.invalidTokens.push(...fcmResults.invalidTokens);
  }

  if (results.invalidTokens.length > 0) {
    const uniqueInvalid = Array.from(new Set(results.invalidTokens));

    await removeInvalidTokens(userId, uniqueInvalid).catch((error) => {
      console.error("[push] Failed to remove invalid tokens", error);
      results.errors?.push("Failed to prune invalid tokens");
    });

    results.invalidTokens = uniqueInvalid;
  }

  await logPushSent(userId, campaignId, results, variant).catch((error) => {
    console.error("[push] Failed to log push notification", error);
    results.errors?.push("Failed to log push notification");
  });

  await markPushSent(userId, campaignId).catch((error) => {
    console.error("[push] Failed to mark push deduplication key", error);
    results.errors?.push("Failed to mark deduplication key");
  });

  results.success = results.successCount > 0 || results.failureCount === 0;
  if (results.errors?.length === 0) {
    delete results.errors;
  }

  return results;
}

async function sendWebPush(
  tokens: PushToken[],
  payload: WebPushPayload,
): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}> {
  const results = {
    successCount: 0,
    failureCount: 0,
    invalidTokens: [] as string[],
  };

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icons/notification-icon.png",
    badge: "/icons/badge-icon.png",
    image: payload.image,
    data: {
      url: payload.deeplink || "/",
      ...payload.data,
    },
  });

  const sendPromises = tokens.map(async ({ token }) => {
    let subscription: PushSubscription;
    try {
      subscription = JSON.parse(token) as PushSubscription;
    } catch (error) {
      results.failureCount += 1;
      results.invalidTokens.push(token);
      return;
    }

    try {
      await webpush.sendNotification(subscription, pushPayload, {
        TTL: 86400,
        urgency: "normal",
      });
      results.successCount += 1;
    } catch (error: any) {
      results.failureCount += 1;

      if (error?.statusCode === 404 || error?.statusCode === 410) {
        results.invalidTokens.push(token);
      }
    }
  });

  await Promise.allSettled(sendPromises);
  return results;
}

async function sendFCMPush(
  tokens: PushToken[],
  payload: FCMPayload,
): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}> {
  const results = {
    successCount: 0,
    failureCount: 0,
    invalidTokens: [] as string[],
  };

  const messaging = getMessaging();
  const tokenStrings = tokens.map((token) => token.token);

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.image ? { imageUrl: payload.image } : {}),
    },
    data: {
      ...(payload.deeplink ? { deeplink: payload.deeplink } : {}),
      ...payload.data,
    },
    android: {
      priority: "high" as const,
      notification: {
        channelId: "promotions",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: "default",
        },
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenStrings,
      ...message,
    });

    results.successCount = response.successCount;
    results.failureCount = response.failureCount;

    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;

        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          results.invalidTokens.push(tokenStrings[index]);
        }
      }
    });
  } catch (error) {
    console.error("FCM send error:", error);
    results.failureCount = tokens.length;
  }

  return results;
}

async function checkPushDeduplication(
  userId: string,
  campaignId: string,
): Promise<boolean> {
  const key = `${userId}_${campaignId}`;
  const doc = await adminDb.collection("pushDeduplication").doc(key).get();

  if (!doc.exists) return false;

  const data = doc.data();
  const sentAt = data?.sentAt?.toDate?.();
  if (!sentAt) return false;

  const hoursSinceSent = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceSent < DEDUP_WINDOW_HOURS;
}

async function markPushSent(
  userId: string,
  campaignId: string,
): Promise<void> {
  const key = `${userId}_${campaignId}`;
  await adminDb.collection("pushDeduplication").doc(key).set({
    userId,
    campaignId,
    sentAt: FieldValue.serverTimestamp(),
  });
}

async function removeInvalidTokens(
  userId: string,
  invalidTokens: string[],
): Promise<void> {
  const userRef = adminDb.collection("users").doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  const currentTokens: PushToken[] = (userData?.pushTokens as PushToken[]) || [];

  const validTokens = currentTokens.filter(
    (token) => !invalidTokens.includes(token.token),
  );

  await userRef.update({
    pushTokens: validTokens,
    pushTokensUpdatedAt: FieldValue.serverTimestamp(),
  });
}

async function logPushSent(
  userId: string,
  campaignId: string,
  results: PushResult,
  variant?: string,
): Promise<void> {
  await adminDb
    .collection("promotions")
    .doc(campaignId)
    .collection("outbound")
    .add({
      type: "push",
      userId,
      campaignId,
      successCount: results.successCount,
      failureCount: results.failureCount,
      invalidTokensRemoved: results.invalidTokens.length,
      errors: results.errors,
      variant,
      sentAt: FieldValue.serverTimestamp(),
    });
}

function isQuietHours(
  timezone?: string,
  quietHoursStart?: unknown,
  quietHoursEnd?: unknown,
): boolean {
  const start =
    typeof quietHoursStart === "number"
      ? quietHoursStart
      : QUIET_HOURS_START;
  const end =
    typeof quietHoursEnd === "number" ? quietHoursEnd : QUIET_HOURS_END;

  const now = new Date();
  let userTime = now;

  if (timezone) {
    try {
      userTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    } catch (error) {
      console.warn(
        `[push] Invalid timezone "${timezone}", using server timezone.`,
        error,
      );
    }
  }

  const hour = userTime.getHours();

  if (start > end) {
    return hour >= start || hour < end;
  }

  return hour >= start && hour < end;
}

function dedupeTokens(tokens: PushToken[]): PushToken[] {
  const seen = new Set<string>();

  return tokens.filter((token) => {
    if (!token.token) return false;
    if (seen.has(token.token)) return false;
    seen.add(token.token);
    return true;
  });
}

export type { PushNotificationParams as PushNotificationParams };
export type { PushToken as PushToken };
export type { PushResult as PushResult };
