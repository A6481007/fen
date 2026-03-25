import "server-only";

import { sendPromoPush, type PushToken } from "./pushAdapter";
import {
  sendPromoSMS,
  type SMSTemplate,
  isQuietHours as isSmsQuietHours,
  checkRateLimits as checkSmsRateLimits,
} from "./smsAdapter";
import { sendMail as sendPromoEmail } from "../emailService";
import { adminDb, FieldValue, Timestamp } from "../firebaseAdmin";
import { getPromotionByCampaignId } from "@/sanity/queries";

export type Channel = "email" | "sms" | "push";
export type MessageType = "promotion" | "abandonment" | "winback";
export type MessagePriority = "urgent" | "high" | "normal" | "low";

export interface MessageRecipient {
  userId: string;
  email?: string;
  phone?: string;
  pushTokens?: PushToken[];
  preferences: {
    emailOptIn: boolean;
    smsOptIn: boolean;
    pushOptIn: boolean;
    preferredChannel?: Channel;
  };
  segment: string;
  timezone?: string;
  firstName?: string;
}

export interface MessageMetadata {
  deeplink?: string;
  variantKey?: string;
  templateOverride?: Partial<SMSTemplate>;
  [key: string]: unknown;
}

export interface SendMessageParams {
  campaignId: string;
  recipients: MessageRecipient[];
  messageType: MessageType;
  dryRun?: boolean;
  forceChannel?: Channel;
  priority?: MessagePriority;
  enqueue?: boolean;
  metadata?: MessageMetadata;
}

export interface MessageParams {
  campaignId: string;
  recipient: MessageRecipient;
  messageType: MessageType;
  dryRun?: boolean;
  forceChannel?: Channel;
  priority?: MessagePriority;
  enqueue?: boolean;
  metadata?: MessageMetadata;
  campaign?: Campaign;
  historyOverride?: MessageHistoryEntry[];
  skipQueue?: boolean;
}

export interface MessageSendResult {
  userId: string;
  campaignId: string;
  channel: Channel | null;
  status: "sent" | "queued" | "skipped" | "error";
  reason?: string;
  quietHours?: boolean;
  queued: boolean;
  dryRun: boolean;
  priority: MessagePriority;
  attempt: number;
}

export interface MessageResult {
  totalRecipients: number;
  sent: { email: number; sms: number; push: number };
  queued: { email: number; sms: number; push: number };
  skipped: {
    noConsent: number;
    frequencyCapped: number;
    noContactInfo: number;
    quietHours: number;
    rateLimited: number;
  };
  errors: number;
  dryRun: boolean;
  details: MessageSendResult[];
}

interface FrequencyCapConfig {
  maxPerUserPerDay: number;
  maxPerUserPerWeek: number;
  maxPerCampaignPerUser: number;
  maxPerChannelPerDay: Record<Channel, number>;
  lookbackDays: number;
}

interface FrequencyCapCounts {
  daily: number;
  weekly: number;
  channelDaily: number;
  campaign: number;
}

export interface FrequencyCapResult {
  allowed: boolean;
  reason?: string;
  counts: FrequencyCapCounts;
}

interface ChannelAvailability {
  allowed: boolean;
  reason?: string;
  quietHours?: boolean;
  rateLimited?: boolean;
  frequency?: FrequencyCapCounts;
}

export interface MessageHistoryEntry {
  campaignId?: string | null;
  channel?: Channel | null;
  sentAt?: Date | null;
}

interface MessageQueueItem extends MessageParams {
  queueId: string;
  enqueuedAt: number;
  priority: MessagePriority;
  attempts: number;
}

type Campaign = NonNullable<
  Awaited<ReturnType<typeof getPromotionByCampaignId>>
>;

const FREQUENCY_CAP: FrequencyCapConfig = {
  maxPerUserPerDay: 5,
  maxPerUserPerWeek: 15,
  maxPerCampaignPerUser: 2,
  maxPerChannelPerDay: {
    email: 4,
    sms: 2,
    push: 3,
  },
  lookbackDays: 7,
};

const CHANNEL_ORDER: Record<MessageType, Channel[]> = {
  abandonment: ["sms", "push", "email"],
  promotion: ["push", "email", "sms"],
  winback: ["email", "push", "sms"],
};

const CHANNEL_FALLBACK_ORDER: Channel[] = ["push", "sms", "email"];
const PRIORITY_WEIGHT: Record<MessagePriority, number> = {
  urgent: 3,
  high: 2,
  normal: 1,
  low: 0,
};

const DEFAULT_BATCH_SIZE = 50;
const QUEUE_BATCH_SIZE = 25;
const MAX_QUEUE_ATTEMPTS = 3;
const CHANNELS: Channel[] = ["email", "sms", "push"];

const SEGMENT_CHANNEL_OVERRIDES: Partial<Record<string, Channel[]>> = {};

const messageQueue: MessageQueueItem[] = [];

/**
 * Unified orchestrator entry point for batch messaging.
 */
export async function sendPromotionMessages(
  params: SendMessageParams,
): Promise<MessageResult> {
  const {
    campaignId,
    recipients,
    messageType,
    dryRun = false,
    forceChannel,
    priority = "normal",
    enqueue = false,
    metadata,
  } = params;

  const campaign = await loadCampaign(campaignId);

  const result: MessageResult = {
    totalRecipients: recipients.length,
    sent: { email: 0, sms: 0, push: 0 },
    queued: { email: 0, sms: 0, push: 0 },
    skipped: {
      noConsent: 0,
      frequencyCapped: 0,
      noContactInfo: 0,
      quietHours: 0,
      rateLimited: 0,
    },
    errors: 0,
    dryRun,
    details: [],
  };

  const batches = chunkRecipients(recipients, DEFAULT_BATCH_SIZE);
  const historyCache = new Map<string, MessageHistoryEntry[]>();

  for (const batch of batches) {
    for (const recipient of batch) {
      const history =
        historyCache.get(recipient.userId) ??
        (await loadMessageHistory(recipient.userId));
      historyCache.set(recipient.userId, history);

      const outcome = await sendPromotionalMessage({
        campaignId,
        recipient,
        messageType,
        dryRun,
        forceChannel,
        priority,
        enqueue,
        metadata,
        campaign,
        historyOverride: history,
      });

      if (outcome.channel && outcome.status === "sent") {
        result.sent[outcome.channel] += 1;
      }
      if (outcome.channel && outcome.status === "queued") {
        result.queued[outcome.channel] += 1;
      }
      if (outcome.status === "skipped") {
        if (outcome.reason === "noConsent") {
          result.skipped.noConsent += 1;
        } else if (outcome.reason === "frequencyCap") {
          result.skipped.frequencyCapped += 1;
        } else if (outcome.reason === "noContactInfo") {
          result.skipped.noContactInfo += 1;
        } else if (outcome.reason === "quietHours") {
          result.skipped.quietHours += 1;
        } else if (outcome.reason === "rateLimited") {
          result.skipped.rateLimited += 1;
        }
      }
      if (outcome.status === "error") {
        result.errors += 1;
      }

      result.details.push(outcome);
    }
  }

  await logCampaignSendResults(campaignId, result);
  return result;
}

/**
 * Send a single promotional message. Supports dry-run, frequency capping, and optional queueing.
 */
export async function sendPromotionalMessage(
  params: MessageParams,
): Promise<MessageSendResult> {
  const {
    campaignId,
    recipient,
    messageType,
    dryRun = false,
    forceChannel,
    priority = "normal",
    enqueue = false,
    metadata,
    campaign: providedCampaign,
    historyOverride,
    skipQueue = false,
  } = params;

  const campaign = providedCampaign ?? (await loadCampaign(campaignId));
  const history = historyOverride ?? (await loadMessageHistory(recipient.userId));

  const channelAvailability: Partial<Record<Channel, ChannelAvailability>> = {};

  for (const channel of CHANNELS) {
    const capResult = await checkFrequencyCap(
      recipient.userId,
      channel,
      campaignId,
      history,
    );

    channelAvailability[channel] = {
      allowed: capResult.allowed,
      reason: capResult.reason,
      frequency: capResult.counts,
    };
  }

  if (recipient.preferences.smsOptIn && hasContactInfo(recipient, "sms")) {
    const smsRateLimit = await checkSmsRateLimit(recipient.userId, campaignId);
    if (smsRateLimit && !smsRateLimit.allowed) {
      channelAvailability.sms = {
        ...(channelAvailability.sms ?? { allowed: false }),
        allowed: false,
        reason: smsRateLimit.reason ?? "SMS rate limited",
        rateLimited: true,
      };
    }
  }

  const selectedChannel = selectChannel(recipient, messageType, {
    availability: channelAvailability,
    priority,
    forceChannel,
  });

  const baseResult: MessageSendResult = {
    userId: recipient.userId,
    campaignId,
    channel: selectedChannel,
    status: "skipped",
    reason: undefined,
    quietHours: false,
    queued: false,
    dryRun,
    priority,
    attempt: 1,
  };

  if (!selectedChannel) {
    const blockedByFrequency = CHANNELS.some(
      (channel) =>
        hasConsent(recipient, channel) &&
        hasContactInfo(recipient, channel) &&
        channelAvailability[channel]?.allowed === false,
    );

    const smsOnlyQuietHours =
      hasConsent(recipient, "sms") &&
      hasContactInfo(recipient, "sms") &&
      isSmsQuietHours(recipient.timezone);

    const reason = blockedByFrequency
      ? channelAvailability.sms?.rateLimited === true
        ? "rateLimited"
        : "frequencyCap"
      : smsOnlyQuietHours
        ? "quietHours"
        : "noConsent";

    await logMessageEvent(campaignId, {
      ...baseResult,
      reason,
      status: "skipped",
      messageType,
    });
    return { ...baseResult, reason };
  }

  if (!hasContactInfo(recipient, selectedChannel)) {
    await logMessageEvent(campaignId, {
      ...baseResult,
      reason: "noContactInfo",
      status: "skipped",
      messageType,
    });
    return { ...baseResult, reason: "noContactInfo" };
  }

  const availability = channelAvailability[selectedChannel];
  if (availability && availability.allowed === false) {
    const reason =
      availability.rateLimited === true ? "rateLimited" : "frequencyCap";
    await logMessageEvent(campaignId, {
      ...baseResult,
      reason,
      status: "skipped",
      messageType,
    });
    return { ...baseResult, reason };
  }

  const quietHours =
    selectedChannel === "sms" && isSmsQuietHours(recipient.timezone);
  if (quietHours) {
    await logMessageEvent(campaignId, {
      ...baseResult,
      reason: "quietHours",
      status: "skipped",
      quietHours: true,
      messageType,
    });
    return { ...baseResult, reason: "quietHours", quietHours: true };
  }

  if (enqueue && !skipQueue) {
    await queueMessage({ ...params, priority, campaign, historyOverride });
    await logMessageEvent(campaignId, {
      ...baseResult,
      status: "queued",
      queued: true,
      messageType,
    });
    return {
      ...baseResult,
      status: "queued",
      queued: true,
    };
  }

  const variables = buildMessageVariables(recipient, campaign, metadata);

  if (dryRun) {
    await logMessageEvent(campaignId, {
      ...baseResult,
      status: "sent",
      dryRun: true,
      messageType,
    });
    return { ...baseResult, status: "sent" };
  }

  try {
    const sendResult = await sendViaChannel(
      selectedChannel,
      recipient,
      campaignId,
      variables,
      messageType,
      metadata,
    );

    if (sendResult.success) {
      await recordMessageSent(recipient.userId, campaignId, selectedChannel, {
        messageType,
        priority,
      });
      await logMessageEvent(campaignId, {
        ...baseResult,
        status: "sent",
        messageType,
      });
      return { ...baseResult, status: "sent" };
    }

    if (sendResult.quietHours) {
      await logMessageEvent(campaignId, {
        ...baseResult,
        reason: "quietHours",
        status: "skipped",
        quietHours: true,
        messageType,
      });
      return { ...baseResult, reason: "quietHours", quietHours: true };
    }

    await logMessageEvent(campaignId, {
      ...baseResult,
      reason: sendResult.error ?? "sendFailed",
      status: "error",
      messageType,
    });
    return { ...baseResult, status: "error", reason: sendResult.error };
  } catch (error) {
    console.error(
      `[promotions][${campaignId}] Error sending to ${recipient.userId}`,
      error,
    );
    await logMessageEvent(campaignId, {
      ...baseResult,
      status: "error",
      reason: "exception",
      messageType,
    });
    return { ...baseResult, status: "error", reason: "exception" };
  }
}

/**
 * Channel selection with preference, rate limits, quiet hours, and message-type priority.
 */
export function selectChannel(
  recipient: MessageRecipient,
  messageType: MessageType,
  options: {
    availability?: Partial<Record<Channel, ChannelAvailability>>;
    priority?: MessagePriority;
  forceChannel?: Channel;
  } = {},
): Channel | null {
  const availability = options.availability ?? {};
  const quietHoursSms = isSmsQuietHours(recipient.timezone);
  let smsBlockedByQuietHours = false;

  if (options.forceChannel) {
    const forced = options.forceChannel;
    if (
      hasConsent(recipient, forced) &&
      hasContactInfo(recipient, forced)
    ) {
      if (forced === "sms" && quietHoursSms) {
        smsBlockedByQuietHours = true;
      } else {
        return forced;
      }
    }
  }

  const priorityOrder =
    options.priority === "urgent"
      ? ["sms", "push", "email"]
      : options.priority === "high"
        ? ["push", "sms", "email"]
        : CHANNEL_ORDER[messageType] ?? CHANNEL_FALLBACK_ORDER;

  const segmentOrder =
    SEGMENT_CHANNEL_OVERRIDES[recipient.segment] ?? CHANNEL_FALLBACK_ORDER;

  const orderedCandidates = uniqueChannels([
    recipient.preferences.preferredChannel,
    ...priorityOrder,
    ...segmentOrder,
    ...CHANNEL_FALLBACK_ORDER,
  ]);

  for (const channel of orderedCandidates) {
    if (!channel) continue;
    if (!hasConsent(recipient, channel)) continue;
    if (!hasContactInfo(recipient, channel)) continue;
    const availabilityStatus = availability[channel];
    if (availabilityStatus && availabilityStatus.allowed === false) continue;
    if (channel === "sms" && quietHoursSms) {
      smsBlockedByQuietHours = true;
      continue;
    }
    return channel;
  }

  if (smsBlockedByQuietHours) {
    return "sms";
  }

  return null;
}

/**
 * Cross-channel and per-channel frequency cap checks.
 */
export async function checkFrequencyCap(
  userId: string,
  channel: Channel,
  campaignId?: string,
  historyOverride?: MessageHistoryEntry[],
): Promise<FrequencyCapResult> {
  const history = historyOverride ?? (await loadMessageHistory(userId));
  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];
  const windowStart = new Date(
    now.getTime() - FREQUENCY_CAP.lookbackDays * 24 * 60 * 60 * 1000,
  );

  const entries = history.filter((entry) => {
    const sentAt = entry.sentAt;
    return sentAt instanceof Date && sentAt >= windowStart;
  });

  const daily = entries.filter((entry) => {
    const sentAt = entry.sentAt;
    return (
      sentAt instanceof Date && sentAt.toISOString().split("T")[0] === todayKey
    );
  }).length;

  const weekly = entries.length;
  const channelDaily = entries.filter(
    (entry) =>
      entry.channel === channel &&
      entry.sentAt instanceof Date &&
      entry.sentAt.toISOString().split("T")[0] === todayKey,
  ).length;

  const campaignCount = campaignId
    ? entries.filter((entry) => entry.campaignId === campaignId).length
    : 0;

  let reason: string | undefined;

  if (daily >= FREQUENCY_CAP.maxPerUserPerDay) {
    reason = "Daily cap reached";
  } else if (channelDaily >= FREQUENCY_CAP.maxPerChannelPerDay[channel]) {
    reason = `${channel} daily cap reached`;
  } else if (weekly >= FREQUENCY_CAP.maxPerUserPerWeek) {
    reason = "Weekly cap reached";
  } else if (
    campaignId &&
    campaignCount >= FREQUENCY_CAP.maxPerCampaignPerUser
  ) {
    reason = "Campaign cap reached";
  }

  return {
    allowed: !reason,
    reason,
    counts: {
      daily,
      weekly,
      channelDaily,
      campaign: campaignCount,
    },
  };
}

/**
 * Enqueue a message for prioritized processing.
 */
export async function queueMessage(
  message: MessageParams,
  priority: MessagePriority = "normal",
): Promise<void> {
  const queueId = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  messageQueue.push({
    ...message,
    queueId,
    enqueuedAt: Date.now(),
    priority,
    attempts: 0,
  });

  await logMessageEvent(message.campaignId, {
    userId: message.recipient.userId,
    campaignId: message.campaignId,
    channel: null,
    status: "queued",
    queued: true,
    dryRun: Boolean(message.dryRun),
    priority,
    attempt: 0,
    messageType: message.messageType,
  });
}

/**
 * Drain the in-memory queue respecting priority.
 */
export async function processMessageQueue(
  limit = QUEUE_BATCH_SIZE,
): Promise<MessageSendResult[]> {
  const sorted = messageQueue.sort((a, b) => {
    const weightDiff =
      (PRIORITY_WEIGHT[b.priority ?? "normal"] ?? 0) -
      (PRIORITY_WEIGHT[a.priority ?? "normal"] ?? 0);
    if (weightDiff !== 0) return weightDiff;
    return a.enqueuedAt - b.enqueuedAt;
  });

  const toProcess = sorted.splice(0, Math.max(1, limit));
  const results: MessageSendResult[] = [];

  for (const item of toProcess) {
    const attempts = item.attempts + 1;
    const outcome = await sendPromotionalMessage({
      ...item,
      enqueue: false,
      skipQueue: true,
      priority: item.priority,
    });
    outcome.attempt = attempts;
    results.push(outcome);

    if (
      outcome.status === "error" &&
      attempts < MAX_QUEUE_ATTEMPTS &&
      item.queueId
    ) {
      messageQueue.push({
        ...item,
        attempts,
        enqueuedAt: Date.now(),
      });
    }
  }

  return results;
}

function hasConsent(recipient: MessageRecipient, channel: Channel): boolean {
  switch (channel) {
    case "email":
      return recipient.preferences.emailOptIn;
    case "sms":
      return recipient.preferences.smsOptIn;
    case "push":
      return recipient.preferences.pushOptIn;
    default:
      return false;
  }
}

function hasContactInfo(recipient: MessageRecipient, channel: Channel): boolean {
  switch (channel) {
    case "email":
      return Boolean(recipient.email);
    case "sms":
      return Boolean(recipient.phone);
    case "push":
      return (recipient.pushTokens?.length || 0) > 0;
    default:
      return false;
  }
}

async function checkSmsRateLimit(userId: string, campaignId: string) {
  try {
    const result = await checkSmsRateLimits(userId, campaignId);
    return result as { allowed: boolean; reason?: string };
  } catch (error) {
    console.error("[promotions] Failed to check SMS rate limits", error);
    return null;
  }
}

async function loadCampaign(campaignId: string): Promise<Campaign> {
  const campaign = await getPromotionByCampaignId(campaignId);
  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }
  return campaign;
}

async function loadMessageHistory(
  userId: string,
  lookbackDays: number = FREQUENCY_CAP.lookbackDays,
): Promise<MessageHistoryEntry[]> {
  try {
    const since = new Date(
      Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
    );
    const historyRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("messageHistory");

    const query =
      typeof (historyRef as { where?: unknown }).where === "function"
        ? (historyRef as any).where("sentAt", ">=", since)
        : historyRef;

    if (typeof query.get !== "function") {
      return [];
    }

    const historyQuery = await query.get();
    const docs = Array.isArray(historyQuery?.docs)
      ? historyQuery.docs
      : Array.isArray(historyQuery)
        ? historyQuery
        : [];

    return docs
      .map((doc: any) => {
        const data = typeof doc.data === "function" ? doc.data() : doc;
        return normalizeHistoryEntry(data);
      })
      .filter(Boolean) as MessageHistoryEntry[];
  } catch (error) {
    console.error(`[promotions][${userId}] Failed to load history`, error);
    return [];
  }
}

function normalizeHistoryEntry(raw: any): MessageHistoryEntry {
  const sentAt = normalizeToDate(raw?.sentAt);
  const channel = raw?.channel as Channel | null | undefined;
  const campaignId = raw?.campaignId as string | null | undefined;

  return {
    sentAt,
    channel: channel ?? null,
    campaignId: campaignId ?? null,
  };
}

function normalizeToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === "object" && value && "toDate" in value) {
    const maybeDate = (value as { toDate?: () => unknown }).toDate?.();
    if (maybeDate instanceof Date && !Number.isNaN(maybeDate.getTime())) {
      return maybeDate;
    }
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function buildMessageVariables(
  recipient: MessageRecipient,
  campaign: Campaign,
  metadata?: MessageMetadata,
): Record<string, string> {
  return {
    firstName: recipient.firstName || "there",
    discount: formatDiscount(campaign.discountType, campaign.discountValue),
    campaignName: campaign.name,
    expiresAt: new Date(campaign.endDate).toLocaleDateString(),
    link:
      metadata?.deeplink ??
      `${process.env.NEXT_PUBLIC_APP_URL}/promotions/${campaign.campaignId}`,
    timezone: recipient.timezone || "UTC",
    variantKey: metadata?.variantKey ?? "control",
  };
}

async function sendViaChannel(
  channel: Channel,
  recipient: MessageRecipient,
  campaignId: string,
  variables: Record<string, string>,
  messageType: MessageType,
  metadata?: MessageMetadata,
): Promise<{ success: boolean; quietHours?: boolean; error?: string }> {
  switch (channel) {
    case "sms": {
      const smsTemplate: SMSTemplate = {
        body:
          metadata?.templateOverride?.body ??
          buildSmsBody(messageType, variables),
        variantA: metadata?.templateOverride?.variantA,
        variantB: metadata?.templateOverride?.variantB,
      };
      const smsResult = await sendPromoSMS({
        userId: recipient.userId,
        phone: recipient.phone as string,
        campaignId,
        template: smsTemplate,
        variables,
        deeplink: variables.link,
        variantKey: metadata?.variantKey,
      });
      return {
        success: smsResult.success,
        quietHours: smsResult.quietHours,
        error: smsResult.error,
      };
    }

    case "push": {
      const pushResult = await sendPromoPush({
        userId: recipient.userId,
        tokens: recipient.pushTokens as PushToken[],
        campaignId,
        title: `${variables.discount} - ${variables.campaignName}`,
        body: buildPushBody(messageType, variables),
        deeplink: variables.link,
        data: { variantKey: variables.variantKey },
      });

      const quietHours =
        Array.isArray(pushResult.errors) &&
        pushResult.errors.some((error) =>
          error.toLowerCase().includes("quiet hours"),
        );

      return {
        success: pushResult.success,
        quietHours,
        error: pushResult.errors?.[0],
      };
    }

    case "email": {
      const emailResult = await sendPromoEmail({
        email: recipient.email as string,
        subject: `${variables.discount} off - ${variables.campaignName}`,
        text: [
          `Hi ${variables.firstName},`,
          "",
          buildEmailBody(messageType, variables),
          `Use the link: ${variables.link}`,
          `Offer ends ${variables.expiresAt}.`,
        ].join("\n"),
      });
      return { success: emailResult.success };
    }

    default:
      return { success: false, error: "Unsupported channel" };
  }
}

function buildSmsBody(
  messageType: MessageType,
  variables: Record<string, string>,
): string {
  if (messageType === "abandonment") {
    return `Hi ${variables.firstName}, complete your cart for ${variables.discount} off. ${variables.link}`;
  }
  if (messageType === "winback") {
    return `We miss you, ${variables.firstName}. ${variables.discount} on your next order: ${variables.link}`;
  }
  return `Don't miss ${variables.campaignName}: ${variables.discount}. Shop now: ${variables.link}`;
}

function buildPushBody(
  messageType: MessageType,
  variables: Record<string, string>,
): string {
  if (messageType === "abandonment") {
    return `Your cart is waiting. Finish checkout before ${variables.expiresAt}.`;
  }
  if (messageType === "winback") {
    return `Come back for ${variables.discount}. Offer ends ${variables.expiresAt}.`;
  }
  return `Limited time: ${variables.discount}. Tap to shop.`;
}

function buildEmailBody(
  messageType: MessageType,
  variables: Record<string, string>,
): string {
  if (messageType === "abandonment") {
    return `We saved your cart. Finish checkout and enjoy ${variables.discount}.`;
  }
  if (messageType === "winback") {
    return `It's been a while! Here's ${variables.discount} to welcome you back.`;
  }
  return `Unlock ${variables.discount} on ${variables.campaignName}.`;
}

async function recordMessageSent(
  userId: string,
  campaignId: string,
  channel: Channel,
  extra?: { messageType?: MessageType; priority?: MessagePriority },
): Promise<void> {
  await adminDb
    .collection("users")
    .doc(userId)
    .collection("messageHistory")
    .add({
      campaignId,
      channel,
      sentAt: FieldValue.serverTimestamp(),
      messageType: extra?.messageType,
      priority: extra?.priority,
    });
}

async function logMessageEvent(
  campaignId: string,
  event: Partial<MessageSendResult> & { messageType?: MessageType },
): Promise<void> {
  try {
    const base = {
      ...event,
      timestamp: FieldValue.serverTimestamp?.() ?? new Date(),
    };
    const logRef = adminDb
      .collection("promotions")
      .doc(campaignId)
      .collection("messageEvents");

    if (typeof (logRef as { add?: unknown }).add === "function") {
      await (logRef as any).add(base);
      return;
    }

    if (typeof (logRef as { doc?: unknown }).doc === "function") {
      const docRef = (logRef as any).doc(
        `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      );
      if (typeof docRef.set === "function") {
        await docRef.set(base);
      }
    }
  } catch (error) {
    console.error("[promotions] Failed to log message event", error);
  }
}

async function logCampaignSendResults(
  campaignId: string,
  result: MessageResult,
): Promise<void> {
  try {
    await adminDb
      .collection("promotions")
      .doc(campaignId)
      .collection("sendLogs")
      .add({
        ...result,
        timestamp: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("[promotions] Failed to log campaign results", error);
  }
}

function formatDiscount(type: string | null, value: number): string {
  switch (type) {
    case "percentage":
      return `${value}% OFF`;
    case "fixed":
    case "fixed_amount":
    case "fixedAmount":
      return `$${value} OFF`;
    case "freeShipping":
      return "FREE SHIPPING";
    default:
      return `${value}% OFF`;
  }
}

function chunkRecipients<T>(recipients: T[], size: number): T[][] {
  if (size <= 0) {
    return [recipients];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < recipients.length; index += size) {
    chunks.push(recipients.slice(index, index + size));
  }
  return chunks;
}

function uniqueChannels(channels: Array<Channel | undefined>): Channel[] {
  const seen = new Set<Channel>();
  const ordered: Channel[] = [];
  for (const channel of channels) {
    if (!channel) continue;
    if (seen.has(channel)) continue;
    seen.add(channel);
    ordered.push(channel);
  }
  return ordered;
}

export async function sendCartAbandonmentSequence(
  userId: string,
  cartData: { cartId: string; cartValue: number; items: unknown[] },
): Promise<void> {
  console.log(`Queueing abandonment sequence for user ${userId}`, cartData);
}

export async function sendWinBackCampaign(
  userId: string,
  inactivityDays: number,
): Promise<void> {
  const discount = Math.min(25, Math.max(10, Math.floor(inactivityDays / 10)));
  console.log(`Sending win-back with ${discount}% off to user ${userId}`);
}

export type { MessageRecipient, SendMessageParams, MessageResult };
