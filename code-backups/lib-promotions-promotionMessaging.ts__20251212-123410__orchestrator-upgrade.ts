import "server-only";

import { sendPromoPush, type PushToken } from "./pushAdapter";
import { sendPromoSMS, type SMSTemplate } from "./smsAdapter";
import { sendMail as sendPromoEmail } from "../emailService";
import { adminDb, FieldValue } from "../firebaseAdmin";
import { getPromotionByCampaignId } from "@/sanity/queries";

type Channel = "email" | "sms" | "push";

interface MessageRecipient {
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

interface SendMessageParams {
  campaignId: string;
  recipients: MessageRecipient[];
  messageType: "promotion" | "abandonment" | "winback";
  dryRun?: boolean;
  forceChannel?: Channel;
}

interface MessageResult {
  totalRecipients: number;
  sent: {
    email: number;
    sms: number;
    push: number;
  };
  skipped: {
    noConsent: number;
    frequencyCapped: number;
    noContactInfo: number;
    quietHours: number;
  };
  errors: number;
  dryRun: boolean;
}

interface FrequencyCapConfig {
  maxPerUserPerDay: number;
  maxPerUserPerWeek: number;
  maxPerCampaignPerUser: number;
}

type Campaign = NonNullable<
  Awaited<ReturnType<typeof getPromotionByCampaignId>>
>;

const FREQUENCY_CAP: FrequencyCapConfig = {
  maxPerUserPerDay: 3,
  maxPerUserPerWeek: 10,
  maxPerCampaignPerUser: 2,
};

const CHANNEL_FALLBACK_ORDER: Channel[] = ["push", "sms", "email"];
const DEFAULT_BATCH_SIZE = 50;

const SEGMENT_CHANNEL_OVERRIDES: Partial<Record<string, Channel[]>> = {};

/**
 * Main orchestration function for sending promotional messages.
 */
export async function sendPromotionMessages(
  params: SendMessageParams,
): Promise<MessageResult> {
  const { campaignId, recipients, messageType, dryRun = false, forceChannel } =
    params;

  const result: MessageResult = {
    totalRecipients: recipients.length,
    sent: { email: 0, sms: 0, push: 0 },
    skipped: { noConsent: 0, frequencyCapped: 0, noContactInfo: 0, quietHours: 0 },
    errors: 0,
    dryRun,
  };

  const campaign = await getPromotionByCampaignId(campaignId);
  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const batches = chunkRecipients(recipients, DEFAULT_BATCH_SIZE);

  for (const batch of batches) {
    for (const recipient of batch) {
      try {
        const capCheck = await checkFrequencyCaps(recipient.userId, campaignId);
        if (!capCheck.allowed) {
          result.skipped.frequencyCapped++;
          continue;
        }

        const channel = forceChannel || selectChannel(recipient);
        if (!channel) {
          result.skipped.noConsent++;
          continue;
        }

        if (!hasContactInfo(recipient, channel)) {
          result.skipped.noContactInfo++;
          continue;
        }

        const variables = buildMessageVariables(recipient, campaign);

        if (dryRun) {
          console.log(
            `[DRY RUN][${campaignId}] Would send ${channel} to ${recipient.userId}`,
          );
          result.sent[channel]++;
          continue;
        }

        const sendResult = await sendViaChannel(
          channel,
          recipient,
          campaignId,
          variables,
          messageType,
        );

        if (sendResult.success) {
          result.sent[channel]++;
          await recordMessageSent(recipient.userId, campaignId, channel);
        } else if (sendResult.quietHours) {
          result.skipped.quietHours++;
        } else {
          result.errors++;
        }
      } catch (error) {
        console.error(
          `[promotions][${campaignId}] Error sending to ${recipient.userId}`,
          error,
        );
        result.errors++;
      }
    }
  }

  await logCampaignSendResults(campaignId, result);

  return result;
}

/**
 * Select best channel for recipient.
 */
function selectChannel(recipient: MessageRecipient): Channel | null {
  const segmentFallback =
    SEGMENT_CHANNEL_OVERRIDES[recipient.segment] || CHANNEL_FALLBACK_ORDER;

  if (recipient.preferences.preferredChannel) {
    const preferred = recipient.preferences.preferredChannel;
    if (hasConsent(recipient, preferred) && hasContactInfo(recipient, preferred)) {
      return preferred;
    }
  }

  for (const channel of segmentFallback) {
    if (hasConsent(recipient, channel) && hasContactInfo(recipient, channel)) {
      return channel;
    }
  }

  return null;
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

async function checkFrequencyCaps(
  userId: string,
  campaignId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const historyQuery = await adminDb
    .collection("users")
    .doc(userId)
    .collection("messageHistory")
    .where("sentAt", ">=", weekAgo)
    .get();

  const messages = historyQuery.docs.map((doc) => doc.data());

  const todayCount = messages.filter((message) => {
    const sentAt = message.sentAt?.toDate?.();
    return (
      sentAt instanceof Date &&
      sentAt.toISOString().split("T")[0] === today
    );
  }).length;

  if (todayCount >= FREQUENCY_CAP.maxPerUserPerDay) {
    return { allowed: false, reason: "Daily cap reached" };
  }

  if (messages.length >= FREQUENCY_CAP.maxPerUserPerWeek) {
    return { allowed: false, reason: "Weekly cap reached" };
  }

  const campaignCount = messages.filter(
    (message) => message.campaignId === campaignId,
  ).length;
  if (campaignCount >= FREQUENCY_CAP.maxPerCampaignPerUser) {
    return { allowed: false, reason: "Campaign cap reached for user" };
  }

  return { allowed: true };
}

function buildMessageVariables(
  recipient: MessageRecipient,
  campaign: Campaign,
): Record<string, string> {
  return {
    firstName: recipient.firstName || "there",
    discount: formatDiscount(campaign.discountType, campaign.discountValue),
    campaignName: campaign.name,
    expiresAt: new Date(campaign.endDate).toLocaleDateString(),
    link: `${process.env.NEXT_PUBLIC_APP_URL}/promotions/${campaign.campaignId}`,
    timezone: recipient.timezone || "UTC",
  };
}

async function sendViaChannel(
  channel: Channel,
  recipient: MessageRecipient,
  campaignId: string,
  variables: Record<string, string>,
  messageType: SendMessageParams["messageType"],
): Promise<{ success: boolean; quietHours?: boolean }> {
  switch (channel) {
    case "sms": {
      const smsTemplate: SMSTemplate = {
        body: `Hey ${variables.firstName}! ${variables.discount} off with our ${variables.campaignName}. Shop now: ${variables.link}`,
      };
      const smsResult = await sendPromoSMS({
        userId: recipient.userId,
        phone: recipient.phone as string,
        campaignId,
        template: smsTemplate,
        variables,
        deeplink: variables.link,
      });
      return { success: smsResult.success, quietHours: smsResult.quietHours };
    }

    case "push": {
      const pushResult = await sendPromoPush({
        userId: recipient.userId,
        tokens: recipient.pushTokens as PushToken[],
        campaignId,
        title: `${variables.discount} - ${variables.campaignName}`,
        body: `Don't miss out! Offer ends ${variables.expiresAt}`,
        deeplink: variables.link,
      });

      const quietHours =
        Array.isArray(pushResult.errors) &&
        pushResult.errors.some((error) =>
          error.toLowerCase().includes("quiet hours"),
        );

      return { success: pushResult.success, quietHours };
    }

    case "email": {
      const emailResult = await sendPromoEmail({
        email: recipient.email as string,
        subject: `${variables.discount} off - ${variables.campaignName}`,
        text: [
          `Hi ${variables.firstName},`,
          "",
          `Good news! ${variables.discount} with ${variables.campaignName}.`,
          `Use the link: ${variables.link}`,
          `Offer ends ${variables.expiresAt}.`,
        ].join("\n"),
      });
      return { success: emailResult.success };
    }

    default:
      return { success: false };
  }
}

async function recordMessageSent(
  userId: string,
  campaignId: string,
  channel: Channel,
): Promise<void> {
  await adminDb
    .collection("users")
    .doc(userId)
    .collection("messageHistory")
    .add({
      campaignId,
      channel,
      sentAt: FieldValue.serverTimestamp(),
    });
}

async function logCampaignSendResults(
  campaignId: string,
  result: MessageResult,
): Promise<void> {
  await adminDb
    .collection("promotions")
    .doc(campaignId)
    .collection("sendLogs")
    .add({
      ...result,
      timestamp: FieldValue.serverTimestamp(),
    });
}

function formatDiscount(type: string | null, value: number): string {
  switch (type) {
    case "percentage":
      return `${value}% OFF`;
    case "fixed":
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
