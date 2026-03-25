import "server-only";

import webpush, { type PushSubscription } from "web-push";
import { getMessaging } from "firebase-admin/messaging";

import { adminDb, FieldValue, Timestamp } from "../firebaseAdmin";

export type PushChannel = "web" | "fcm" | "apns";

export interface PushToken {
  token: string;
  type: PushChannel;
  deviceId?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  image?: string;
  deeplink?: string;
  data?: Record<string, string>;
  campaignId?: string;
  userId?: string;
  variant?: string;
  timezone?: string;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

export interface PushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  quietHours?: boolean;
  errors?: string[];
}

export interface BulkPushResult extends PushResult {
  results: DeliveryDetail[];
}

export interface DeliveryDetail {
  token: string;
  type: PushChannel;
  status: "sent" | "failed" | "skipped";
  reason?: string;
  errorCode?: string;
}

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

const QUIET_HOURS_START = 22;
const QUIET_HOURS_END = 8;
const DEDUP_WINDOW_HOURS = 24;
const MAX_SUBSCRIPTIONS_PER_USER = 25;
const DEFAULT_TTL_SECONDS = 86_400;
const SEND_BATCH_SIZE = 100;

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
    "[push] VAPID keys are not fully configured; web push delivery disabled.",
  );
}

export function validateSubscription(
  subscription: unknown,
): subscription is PushSubscription {
  if (!subscription || typeof subscription !== "object") return false;

  const endpoint = (subscription as { endpoint?: unknown }).endpoint;
  const keys = (subscription as { keys?: unknown }).keys as
    | { auth?: unknown; p256dh?: unknown }
    | undefined;

  return (
    typeof endpoint === "string" &&
    !!endpoint.trim() &&
    keys !== undefined &&
    typeof keys.auth === "string" &&
    typeof keys.p256dh === "string" &&
    !!keys.auth.trim() &&
    !!keys.p256dh.trim()
  );
}

export async function sendPushNotification(
  subscription: PushSubscription | PushToken | string,
  payload: PushNotificationPayload,
): Promise<PushResult> {
  const result = await sendBulkPush([subscription], payload);
  return {
    success: result.success,
    successCount: result.successCount,
    failureCount: result.failureCount,
    invalidTokens: result.invalidTokens,
    quietHours: result.quietHours,
    errors: result.errors,
  };
}

export async function sendBulkPush(
  subscriptions: Array<PushSubscription | PushToken | string>,
  payload: PushNotificationPayload,
): Promise<BulkPushResult> {
  const errors: string[] = [];
  const normalized = subscriptions
    .map((subscription) => normalizeToPushToken(subscription))
    .filter(Boolean) as PushToken[];

  const tokens = dedupeTokens(normalized);
  if (tokens.length === 0) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      results: [],
      errors: ["No push tokens provided"],
    };
  }

  const userConfig = await getUserPushConfig(payload.userId);

  const quietHoursActive =
    userConfig.quietHoursEnabled &&
    isQuietHours(
      payload.timezone || userConfig.timezone,
      payload.quietHoursStart ?? userConfig.quietHoursStart,
      payload.quietHoursEnd ?? userConfig.quietHoursEnd,
    );

  if (quietHoursActive) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
      quietHours: true,
      results: [],
      errors: ["Quiet hours active"],
    };
  }

  if (payload.userId && payload.campaignId) {
    try {
      const duplicate = await checkPushDeduplication(
        payload.userId,
        payload.campaignId,
      );
      if (duplicate) {
        return {
          success: true,
          successCount: 0,
          failureCount: 0,
          invalidTokens: [],
          results: [],
        };
      }
    } catch (error) {
      errors.push("Failed to check push deduplication");
      console.error("[push] deduplication check failed", error);
    }
  }

  const results: DeliveryDetail[] = [];
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  const webTokens = tokens.filter((token) => token.type === "web");
  const deviceTokens = tokens.filter((token) => token.type !== "web");

  if (webTokens.length > 0) {
    const webResult = await sendWebPushBatch(webTokens, payload);
    successCount += webResult.successCount;
    failureCount += webResult.failureCount;
    invalidTokens.push(...webResult.invalidTokens);
    results.push(...webResult.details);
  }

  if (deviceTokens.length > 0) {
    const fcmResult = await sendFCMBatch(deviceTokens, payload);
    successCount += fcmResult.successCount;
    failureCount += fcmResult.failureCount;
    invalidTokens.push(...fcmResult.invalidTokens);
    results.push(...fcmResult.details);
  }

  if (payload.userId && invalidTokens.length > 0) {
    const uniqueInvalid = Array.from(new Set(invalidTokens));
    await removeInvalidTokens(payload.userId, uniqueInvalid).catch((error) => {
      console.error("[push] Failed to remove invalid tokens", error);
      errors.push("Failed to prune invalid tokens");
    });
    invalidTokens.splice(0, invalidTokens.length, ...uniqueInvalid);
  }

  if (payload.userId && payload.campaignId) {
    await logPushSent(
      payload.userId,
      payload.campaignId,
      {
        successCount,
        failureCount,
        invalidTokens,
        errors,
      },
      payload.variant,
    ).catch((error) => {
      console.error("[push] Failed to log push notification", error);
      errors.push("Failed to log push notification");
    });

    await markPushSent(payload.userId, payload.campaignId).catch((error) => {
      console.error("[push] Failed to mark push deduplication key", error);
      errors.push("Failed to mark deduplication key");
    });
  }

  const success = successCount > 0 || failureCount === 0;

  return {
    success,
    successCount,
    failureCount,
    invalidTokens: Array.from(new Set(invalidTokens)),
    results,
    quietHours: false,
    errors: errors.length ? errors : undefined,
  };
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

  const result = await sendBulkPush(tokens, {
    title,
    body,
    image,
    deeplink,
    data,
    userId,
    campaignId,
    variant,
  });

  return {
    success: result.success,
    successCount: result.successCount,
    failureCount: result.failureCount,
    invalidTokens: result.invalidTokens,
    quietHours: result.quietHours,
    errors: result.errors,
  };
}

export async function getActiveSubscriptions(
  userId: string,
): Promise<PushSubscription[]> {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  const userData = userDoc.data() ?? {};
  const pushTokens = (userData.pushTokens as PushToken[]) || [];

  return pushTokens
    .filter((token) => token.type === "web")
    .map((token) => parseSubscriptionToken(token.token))
    .filter((subscription): subscription is PushSubscription =>
      Boolean(subscription) && validateSubscription(subscription),
    );
}

export async function saveSubscription(
  userId: string,
  subscription: PushSubscription | string,
  type: PushChannel = "web",
  deviceId?: string,
): Promise<void> {
  const tokenString =
    typeof subscription === "string"
      ? subscription
      : serializeSubscription(subscription);

  const userRef = adminDb.collection("users").doc(userId);

  await adminDb.runTransaction(async (transaction: any) => {
    const snapshot = await transaction.get(userRef);
    const existingData = snapshot.data?.() ?? snapshot.data?.call?.(snapshot) ?? {};
    const currentTokens: PushToken[] = Array.isArray(existingData.pushTokens)
      ? (existingData.pushTokens as PushToken[])
      : [];

    const filtered = currentTokens.filter(
      (token) => token.token !== tokenString && token.deviceId !== deviceId,
    );

    const nextTokens = [
      {
        token: tokenString,
        type,
        ...(deviceId ? { deviceId } : {}),
      },
      ...filtered,
    ].slice(0, MAX_SUBSCRIPTIONS_PER_USER);

    const updateData = {
      pushTokens: nextTokens,
      pushTokensUpdatedAt: FieldValue.serverTimestamp(),
    };

    if (snapshot.exists) {
      await transaction.update(userRef, updateData);
    } else {
      await transaction.set(userRef, updateData);
    }
  });
}

export async function removeInvalidToken(
  userId: string,
  subscription: PushSubscription | string,
): Promise<void> {
  const tokenString =
    typeof subscription === "string"
      ? subscription
      : serializeSubscription(subscription);

  await removeInvalidTokens(userId, [tokenString]);
}

async function removeInvalidTokens(
  userId: string,
  invalidTokens: string[],
): Promise<void> {
  if (invalidTokens.length === 0) return;

  const userRef = adminDb.collection("users").doc(userId);

  await adminDb.runTransaction(async (transaction: any) => {
    const snapshot = await transaction.get(userRef);
    const existingData = snapshot.data?.() ?? snapshot.data?.call?.(snapshot) ?? {};
    const currentTokens: PushToken[] = Array.isArray(existingData.pushTokens)
      ? (existingData.pushTokens as PushToken[])
      : [];

    const validTokens = currentTokens.filter(
      (token) => !invalidTokens.includes(token.token),
    );

    const updateData = {
      pushTokens: validTokens,
      pushTokensUpdatedAt: FieldValue.serverTimestamp(),
    };

    if (snapshot.exists) {
      await transaction.update(userRef, updateData);
    } else {
      await transaction.set(userRef, updateData);
    }
  });
}

async function sendWebPushBatch(
  tokens: PushToken[],
  payload: PushNotificationPayload,
): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  details: DeliveryDetail[];
}> {
  const pushPayload = buildWebPushPayload(payload);

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];
  const details: DeliveryDetail[] = [];

  const batches = chunk(tokens, SEND_BATCH_SIZE);

  for (const batch of batches) {
    const sendPromises = batch.map(async ({ token }) => {
      const subscription = parseSubscriptionToken(token);

      if (!subscription) {
        invalidTokens.push(token);
        failureCount += 1;
        details.push({
          token,
          type: "web",
          status: "skipped",
          reason: "invalid-subscription",
        });
        return;
      }

      try {
        await webpush.sendNotification(subscription, pushPayload, {
          TTL: DEFAULT_TTL_SECONDS,
          urgency: "normal",
        });
        successCount += 1;
        details.push({ token, type: "web", status: "sent" });
      } catch (error: any) {
        failureCount += 1;
        const errorCode = error?.statusCode || error?.code;
        const isGone = errorCode === 404 || errorCode === 410;

        if (isGone) {
          invalidTokens.push(token);
        }

        details.push({
          token,
          type: "web",
          status: "failed",
          reason: isGone ? "invalid-subscription" : "send-error",
          errorCode: errorCode ? String(errorCode) : undefined,
        });
      }
    });

    await Promise.allSettled(sendPromises);
  }

  return { successCount, failureCount, invalidTokens, details };
}

async function sendFCMBatch(
  tokens: PushToken[],
  payload: PushNotificationPayload,
): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  details: DeliveryDetail[];
}> {
  const messaging = getMessaging();
  const batches = chunk(tokens, SEND_BATCH_SIZE);

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];
  const details: DeliveryDetail[] = [];

  for (const batch of batches) {
    const tokenStrings = batch.map((token) => token.token);
    const message = buildFcmMessage(payload);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenStrings,
        ...message,
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((resp, index) => {
        const token = tokenStrings[index];

        if (resp.success) {
          details.push({ token, type: "fcm", status: "sent" });
          return;
        }

        const errorCode = resp.error?.code;

        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(token);
        }

        details.push({
          token,
          type: "fcm",
          status: "failed",
          reason: invalidTokens.includes(token)
            ? "invalid-token"
            : "send-error",
          errorCode,
        });
      });
    } catch (error: any) {
      console.error("FCM send error", error);
      failureCount += batch.length;
      tokenStrings.forEach((token) =>
        details.push({ token, type: "fcm", status: "failed", reason: "send-error" }),
      );
    }
  }

  return { successCount, failureCount, invalidTokens, details };
}

async function getUserPushConfig(userId?: string): Promise<{
  timezone?: string;
  quietHoursEnabled: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}> {
  if (!userId) {
    return { quietHoursEnabled: false };
  }

  const userDoc = await adminDb.collection("users").doc(userId).get();
  const data = userDoc.data() ?? {};

  return {
    timezone: typeof data.timezone === "string" ? (data.timezone as string) : undefined,
    quietHoursEnabled: Boolean(data.pushQuietHoursEnabled),
    quietHoursStart:
      typeof data.pushQuietHoursStart === "number"
        ? (data.pushQuietHoursStart as number)
        : undefined,
    quietHoursEnd:
      typeof data.pushQuietHoursEnd === "number"
        ? (data.pushQuietHoursEnd as number)
        : undefined,
  };
}

async function checkPushDeduplication(
  userId: string,
  campaignId: string,
): Promise<boolean> {
  const key = `${userId}_${campaignId}`;
  const doc = await adminDb.collection("pushDeduplication").doc(key).get();

  if (!doc.exists) return false;

  const data = doc.data();
  const sentAt = toDate(data?.sentAt);
  if (!sentAt) return false;

  const hoursSinceSent = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceSent < DEDUP_WINDOW_HOURS;
}

async function markPushSent(userId: string, campaignId: string): Promise<void> {
  const key = `${userId}_${campaignId}`;
  await adminDb.collection("pushDeduplication").doc(key).set({
    userId,
    campaignId,
    sentAt: FieldValue.serverTimestamp(),
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
  quietHoursStart?: number,
  quietHoursEnd?: number,
): boolean {
  const start =
    typeof quietHoursStart === "number" ? quietHoursStart : QUIET_HOURS_START;
  const end = typeof quietHoursEnd === "number" ? quietHoursEnd : QUIET_HOURS_END;

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

function buildWebPushPayload(payload: PushNotificationPayload): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icons/notification-icon.png",
    badge: "/icons/badge-icon.png",
    image: payload.image,
    data: {
      url: payload.deeplink || "/",
      ...(payload.data ?? {}),
    },
  });
}

function buildFcmMessage(payload: PushNotificationPayload) {
  return {
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.image ? { imageUrl: payload.image } : {}),
    },
    data: {
      ...(payload.deeplink ? { deeplink: payload.deeplink } : {}),
      ...(payload.data ?? {}),
    },
    android: {
      priority: "high" as const,
      notification: {
        channelId: "promotions",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
      ttl: `${DEFAULT_TTL_SECONDS}s`,
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
}

function dedupeTokens(tokens: PushToken[]): PushToken[] {
  const seen = new Set<string>();

  return tokens.filter((token) => {
    if (!token.token) return false;
    const key = `${token.type}:${token.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeToPushToken(
  subscription: PushSubscription | PushToken | string,
  fallbackType: PushChannel = "web",
): PushToken | null {
  if (isPushToken(subscription)) return subscription;

  if (validateSubscription(subscription)) {
    return { token: serializeSubscription(subscription), type: "web" };
  }

  if (typeof subscription === "string") {
    const parsed = parseSubscriptionToken(subscription);
    if (parsed && validateSubscription(parsed)) {
      return { token: serializeSubscription(parsed), type: "web" };
    }

    return {
      token: subscription,
      type: fallbackType === "web" ? "fcm" : fallbackType,
    };
  }

  return null;
}

function parseSubscriptionToken(token: string): PushSubscription | null {
  try {
    const parsed = JSON.parse(token);
    if (validateSubscription(parsed)) {
      return parsed as PushSubscription;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function serializeSubscription(subscription: PushSubscription): string {
  return JSON.stringify({
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      auth: subscription.keys.auth,
      p256dh: subscription.keys.p256dh,
    },
  });
}

function isPushToken(value: unknown): value is PushToken {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    "token" in (value as Record<string, unknown>) &&
    "type" in (value as Record<string, unknown>)
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0 || !Number.isFinite(size)) return [items];

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return null;
}

export type { PushNotificationParams as DeprecatedPushNotificationParams };
