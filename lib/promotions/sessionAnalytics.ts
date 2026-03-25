import { adminDb, FieldValue, Timestamp } from "@/lib/firebaseAdmin";
import type { UserAction } from "./analytics";

const ACTION_COUNT_FIELD: Record<UserAction, string> = {
  view: "viewCount",
  click: "clickCount",
  addToCart: "addToCartCount",
  purchase: "purchaseCount",
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildInteractionEntry = (
  action: UserAction,
  now: Timestamp,
  metadata?: Record<string, unknown>
) => {
  if (metadata && Object.keys(metadata).length > 0) {
    return { action, at: now, metadata };
  }

  return { action, at: now };
};

export async function trackSessionPromoInteraction(
  sessionId: string,
  campaignId: string,
  action: UserAction,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const docRef = adminDb.collection("promotions").doc(campaignId).collection("sessions").doc(sessionId);
  const interactionAt = Timestamp.now();
  const interactionEntry = buildInteractionEntry(action, interactionAt, metadata);
  const purchaseValue = action === "purchase" ? toNumber(metadata?.orderValue, 0) : 0;
  const purchaseDiscount = action === "purchase" ? toNumber(metadata?.discountAmount, 0) : 0;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);

      if (!snapshot.exists) {
        tx.set(docRef, {
          sessionId,
          campaignId,
          firstSeenAt: interactionAt,
          lastInteractionAt: interactionAt,
          interactions: [interactionEntry],
          purchased: action === "purchase",
          totalSpent: purchaseValue,
          totalDiscount: purchaseDiscount,
          viewCount: action === "view" ? 1 : 0,
          clickCount: action === "click" ? 1 : 0,
          addToCartCount: action === "addToCart" ? 1 : 0,
          purchaseCount: action === "purchase" ? 1 : 0,
        });
        return;
      }

      const updates: Record<string, unknown> = {
        lastInteractionAt: interactionAt,
        interactions: FieldValue.arrayUnion(interactionEntry),
      };

      const countField = ACTION_COUNT_FIELD[action];
      updates[countField] = FieldValue.increment(1);

      if (action === "purchase") {
        updates.purchased = true;
        updates.totalSpent = FieldValue.increment(purchaseValue);
        updates.totalDiscount = FieldValue.increment(purchaseDiscount);
      }

      tx.update(docRef, updates);
    });

    return true;
  } catch (error) {
    console.error(
      `[promotions][${campaignId}][session:${sessionId}] Failed to track interaction "${action}"`,
      error
    );
    return false;
  }
}
