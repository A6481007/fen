import "server-only";

import twilio, { validateRequest, type Twilio } from "twilio";

import { FieldValue, adminDb } from "../firebaseAdmin";

type TemplateVariantKey = "control" | "variantA" | "variantB";

export interface SMSTemplate {
  body: string;
  variantA?: string;
  variantB?: string;
}

export interface SMSVariables {
  firstName?: string;
  discount?: string;
  link?: string;
  expiresAt?: string;
  timezone?: string;
  variantKey?: TemplateVariantKey;
  [key: string]: string | undefined;
}

export interface SendSMSParams {
  userId: string;
  phone: string;
  campaignId: string;
  template: SMSTemplate;
  variables: SMSVariables;
  deeplink?: string;
  variantKey?: TemplateVariantKey;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rateLimited?: boolean;
  quietHours?: boolean;
}

export interface RateLimitConfig {
  maxPerUserPerDay: number;
  maxPerUserPerCampaign: number;
  quietHoursStart: number;
  quietHoursEnd: number;
}

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

type MessageCreateOptions = Parameters<Twilio["messages"]["create"]>[0];

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxPerUserPerDay: 3,
  maxPerUserPerCampaign: 1,
  quietHoursStart: 22,
  quietHoursEnd: 8,
};

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

const twilioClient: Twilio | null =
  twilioAccountSid && twilioAuthToken
    ? twilio(twilioAccountSid, twilioAuthToken)
    : null;

if (!twilioClient) {
  console.warn(
    "[sms] Twilio credentials are not configured. SMS sending is disabled.",
  );
}

export async function sendPromoSMS(
  params: SendSMSParams,
): Promise<SMSResult> {
  const { userId, phone, campaignId, template, variables, deeplink } = params;

  if (!twilioClient) {
    return {
      success: false,
      error: "Twilio credentials are not configured.",
    };
  }

  if (isQuietHours(variables.timezone)) {
    return { success: false, quietHours: true, error: "Quiet hours active." };
  }

  const rateLimitResult = await checkRateLimits(userId, campaignId);
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      rateLimited: true,
      error: rateLimitResult.reason || "Rate limit exceeded.",
    };
  }

  const variantKey = params.variantKey ?? variables.variantKey;
  const body = buildMessageBody(template, variables, deeplink, variantKey);

  const messageOptionsResult = buildMessageOptions(phone, body);
  if (!messageOptionsResult.ok) {
    return { success: false, error: messageOptionsResult.error };
  }

  try {
    const message = await twilioClient.messages.create(
      messageOptionsResult.options,
    );

    await logSMSSent(
      userId,
      campaignId,
      message.sid,
      body,
      variantKey ?? "control",
    ).catch((error) => {
      console.error(
        `[sms][${campaignId}] Failed to log sent message ${message.sid}`,
        error,
      );
    });

    await updateRateLimitCounters(userId, campaignId).catch((error) => {
      console.error(
        `[sms][${campaignId}] Failed to update rate limit counters`,
        error,
      );
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    const errorMessage = toErrorMessage(error);
    console.error(
      `[sms][${campaignId}] SMS send error for user ${userId}`,
      errorMessage,
    );

    await logSMSFailed(userId, campaignId, errorMessage).catch((logError) => {
      console.error(
        `[sms][${campaignId}] Failed to log SMS failure`,
        logError,
      );
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

function isQuietHours(userTimezone?: string): boolean {
  const now = new Date();
  const { quietHoursStart, quietHoursEnd } = RATE_LIMIT_CONFIG;

  let userTime = now;
  if (userTimezone) {
    try {
      userTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
    } catch (error) {
      console.warn(
        `[sms] Invalid timezone "${userTimezone}", using server timezone.`,
        error,
      );
    }
  }

  const hour = userTime.getHours();

  if (quietHoursStart > quietHoursEnd) {
    return hour >= quietHoursStart || hour < quietHoursEnd;
  }

  return hour >= quietHoursStart && hour < quietHoursEnd;
}

async function checkRateLimits(
  userId: string,
  campaignId: string,
): Promise<RateLimitResult> {
  const today = new Date().toISOString().split("T")[0];

  try {
    const dailyRef = adminDb
      .collection("smsRateLimits")
      .doc(`${userId}_${today}`);

    const campaignRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("smsHistory")
      .doc(campaignId);

    const [dailyDoc, campaignDoc] = await Promise.all([
      dailyRef.get(),
      campaignRef.get(),
    ]);

    const dailyCount = toNumber(dailyDoc.data()?.count);
    if (dailyCount >= RATE_LIMIT_CONFIG.maxPerUserPerDay) {
      return { allowed: false, reason: "Daily SMS limit reached." };
    }

    const campaignCount = toNumber(campaignDoc.data()?.count);
    if (campaignCount >= RATE_LIMIT_CONFIG.maxPerUserPerCampaign) {
      return { allowed: false, reason: "Campaign SMS limit reached for user." };
    }

    return { allowed: true };
  } catch (error) {
    console.error(
      `[sms][${campaignId}] Rate limit check failed for user ${userId}`,
      error,
    );
    return { allowed: false, reason: "Rate limit check failed." };
  }
}

async function updateRateLimitCounters(
  userId: string,
  campaignId: string,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const timestamp = FieldValue.serverTimestamp();

  const batch = adminDb.batch();

  const dailyRef = adminDb.collection("smsRateLimits").doc(`${userId}_${today}`);
  batch.set(
    dailyRef,
    {
      count: FieldValue.increment(1),
      lastSent: timestamp,
    },
    { merge: true },
  );

  const campaignRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("smsHistory")
    .doc(campaignId);
  batch.set(
    campaignRef,
    {
      count: FieldValue.increment(1),
      lastSent: timestamp,
    },
    { merge: true },
  );

  await batch.commit();
}

function buildMessageBody(
  template: SMSTemplate,
  variables: SMSVariables,
  deeplink?: string,
  variantKey?: TemplateVariantKey,
): string {
  const templateBody = selectTemplateBody(template, variantKey);

  const replacements: Record<string, string | undefined> = {
    ...variables,
    link: deeplink ?? variables.link,
  };

  return Object.entries(replacements).reduce((current, [key, value]) => {
    if (typeof value !== "string") {
      return current;
    }

    const pattern = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g");
    return current.replace(pattern, value);
  }, templateBody);
}

function selectTemplateBody(
  template: SMSTemplate,
  variantKey?: TemplateVariantKey,
): string {
  if (variantKey === "variantA" && template.variantA) {
    return template.variantA;
  }

  if (variantKey === "variantB" && template.variantB) {
    return template.variantB;
  }

  return template.body;
}

function buildMessageOptions(
  phone: string,
  body: string,
):
  | { ok: true; options: MessageCreateOptions }
  | { ok: false; error: string } {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!messagingServiceSid && !fromNumber) {
    return {
      ok: false,
      error:
        "Twilio sender configuration missing. Provide TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID.",
    };
  }

  const statusCallback = buildStatusCallbackUrl();
  const baseOptions: MessageCreateOptions = {
    body,
    to: phone,
    ...(statusCallback ? { statusCallback } : {}),
  };

  if (messagingServiceSid) {
    return {
      ok: true,
      options: {
        ...baseOptions,
        messagingServiceSid,
      },
    };
  }

  return {
    ok: true,
    options: {
      ...baseOptions,
      from: fromNumber,
    },
  };
}

function buildStatusCallbackUrl(): string | undefined {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || null;

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, "")}/api/webhooks/twilio/status`;
}

async function logSMSSent(
  userId: string,
  campaignId: string,
  messageId: string,
  body: string,
  variantKey: TemplateVariantKey,
): Promise<void> {
  const timestamp = FieldValue.serverTimestamp();

  await adminDb
    .collection("promotions")
    .doc(campaignId)
    .collection("outbound")
    .doc(messageId)
    .set({
      type: "sms",
      userId,
      campaignId,
      messageId,
      body: body.substring(0, 320),
      variant: variantKey,
      status: "sent",
      sentAt: timestamp,
      statusUpdatedAt: timestamp,
    });
}

async function logSMSFailed(
  userId: string,
  campaignId: string,
  error: string,
): Promise<void> {
  await adminDb
    .collection("promotions")
    .doc(campaignId)
    .collection("outbound")
    .add({
      type: "sms",
      userId,
      campaignId,
      status: "failed",
      error,
      failedAt: FieldValue.serverTimestamp(),
    });
}

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string | string[]>,
): boolean {
  if (!twilioAuthToken) {
    return false;
  }

  return validateRequest(twilioAuthToken, signature, url, params);
}

export async function handleStatusCallback(
  messageId: string,
  status: string,
  errorCode?: string,
): Promise<void> {
  const normalizedStatus = status.toLowerCase();
  const derivedStatus = mapDeliveryStatus(normalizedStatus);
  const timestamp = FieldValue.serverTimestamp();

  const messagesQuery = await adminDb
    .collectionGroup("outbound")
    .where("messageId", "==", messageId)
    .limit(1)
    .get();

  if (messagesQuery.empty) {
    console.warn(`[sms] Unable to find outbound message ${messageId}`);
    return;
  }

  const doc = messagesQuery.docs[0];
  await doc.ref.update({
    status: derivedStatus,
    rawStatus: normalizedStatus,
    errorCode: errorCode || null,
    statusUpdatedAt: timestamp,
  });
}

function mapDeliveryStatus(status: string): "sent" | "delivered" | "failed" {
  if (status === "delivered") {
    return "delivered";
  }

  if (status === "failed" || status === "undelivered") {
    return "failed";
  }

  return "sent";
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeRegExp(value: string): string {
  return value.replace(
    /[\\-\\[\\]\\/\\{\\}\\(\\)\\*\\+\\?\\.\\\\\\^\\$\\|]/g,
    "\\$&",
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Failed to send SMS.";
}

export { RATE_LIMIT_CONFIG };
