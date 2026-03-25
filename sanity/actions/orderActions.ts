"use client";

import { useCallback, useState } from "react";
import {
  useClient,
  useDocumentOperation,
  useCurrentUser,
  DocumentActionProps,
} from "sanity";
import { CheckmarkIcon, CloseIcon, PublishIcon } from "@sanity/icons";

const resolveUserIdentity = (user: ReturnType<typeof useCurrentUser>) => {
  const displayName = user?.email || user?.name || "admin@studio";
  const role = user?.roles?.[0]?.name || user?.roles?.[0] || "admin";

  return { displayName, role };
};

// Approve Order Action
export function ApproveOrderAction(props: DocumentActionProps) {
  const { id, type, published, draft, onComplete } = props;
  const client = useClient({ apiVersion: "2023-10-01" });
  const { patch } = useDocumentOperation(id, type);
  const user = useCurrentUser();
  const [isRunning, setIsRunning] = useState(false);

  const doc = draft || published;
  const canApprove = doc?.status === "pending" || doc?.status === "address_confirmed";

  const handle = useCallback(async () => {
    if (!doc) return;

    setIsRunning(true);

    try {
      const now = new Date().toISOString();
      const { displayName, role } = resolveUserIdentity(user);

      patch.execute?.([
        {
          set: {
            status: "order_confirmed",
            orderConfirmedAt: now,
            orderConfirmedBy: displayName,
          },
        },
      ]);

      await client
        .patch(id)
        .set({
          status: "order_confirmed",
          orderConfirmedAt: now,
          orderConfirmedBy: displayName,
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "order_confirmed",
            changedBy: displayName,
            changedByRole: role,
            changedAt: now,
            notes: "Order confirmed via quick action",
          },
        ])
        .commit();

      onComplete();
    } catch (error) {
      console.error("Failed to approve order:", error);
    } finally {
      setIsRunning(false);
    }
  }, [client, doc, id, onComplete, patch, user]);

  if (!canApprove) return null;

  return {
    label: isRunning ? "Confirming..." : "✅ Confirm Order",
    icon: CheckmarkIcon,
    tone: "positive",
    disabled: isRunning,
    onHandle: handle,
  };
}

// Mark as Packed Action
export function MarkAsPackedAction(props: DocumentActionProps) {
  const { id, type, published, draft, onComplete } = props;
  const client = useClient({ apiVersion: "2023-10-01" });
  const { patch } = useDocumentOperation(id, type);
  const user = useCurrentUser();
  const [isRunning, setIsRunning] = useState(false);

  const doc = draft || published;
  const canPack = doc?.status === "order_confirmed";

  const handle = useCallback(async () => {
    if (!doc) return;

    setIsRunning(true);

    try {
      const now = new Date().toISOString();
      const { displayName, role } = resolveUserIdentity(user);

      patch.execute?.([
        {
          set: {
            status: "packed",
            packedAt: now,
            packedBy: displayName,
          },
        },
      ]);

      await client
        .patch(id)
        .set({
          status: "packed",
          packedAt: now,
          packedBy: displayName,
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "packed",
            changedBy: displayName,
            changedByRole: role,
            changedAt: now,
            notes: "Marked as packed via quick action",
          },
        ])
        .commit();

      onComplete();
    } catch (error) {
      console.error("Failed to mark as packed:", error);
    } finally {
      setIsRunning(false);
    }
  }, [client, doc, id, onComplete, patch, user]);

  if (!canPack) return null;

  return {
    label: isRunning ? "Packing..." : "📦 Mark as Packed",
    icon: PublishIcon,
    tone: "primary",
    disabled: isRunning,
    onHandle: handle,
  };
}

// Cancel Order Action
export function CancelOrderAction(props: DocumentActionProps) {
  const { id, type, published, draft, onComplete } = props;
  const client = useClient({ apiVersion: "2023-10-01" });
  const { patch } = useDocumentOperation(id, type);
  const user = useCurrentUser();
  const [isRunning, setIsRunning] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showReasonWarning, setShowReasonWarning] = useState(false);
  const requireCancellationReason = true;

  const doc = draft || published;
  const canCancel =
    doc?.status !== "delivered" &&
    doc?.status !== "completed" &&
    doc?.status !== "cancelled";

  const handle = useCallback(async () => {
    if (!doc) return;

    const reasonFromDoc = doc?.cancellationReason?.trim();
    if (requireCancellationReason && !reasonFromDoc) {
      setShowReasonWarning(true);
      return;
    }

    setIsRunning(true);

    try {
      const now = new Date().toISOString();
      const { displayName, role } = resolveUserIdentity(user);
      const cancellationReason = reasonFromDoc || "Cancelled via admin action";

      patch.execute?.([
        {
          set: {
            status: "cancelled",
            cancelledAt: now,
            cancelledBy: displayName,
            cancellationReason,
          },
        },
      ]);

      await client
        .patch(id)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: displayName,
          cancellationReason,
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "cancelled",
            changedBy: displayName,
            changedByRole: role,
            changedAt: now,
            notes: cancellationReason,
          },
        ])
        .commit();

      onComplete();
    } catch (error) {
      console.error("Failed to cancel order:", error);
    } finally {
      setIsRunning(false);
    }
  }, [client, doc, id, onComplete, patch, user]);

  if (!canCancel) return null;

  return {
    label: isRunning ? "Cancelling..." : "❌ Cancel Order",
    icon: CloseIcon,
    tone: "critical",
    disabled: isRunning,
    onHandle: () => setShowDialog(true),
    dialog:
      showDialog || showReasonWarning
        ? {
            type: "confirm",
            tone: showReasonWarning ? "caution" : "critical",
            message: showReasonWarning
              ? "Please add a cancellation reason in the document before cancelling."
              : `Cancel this order?${doc?.cancellationReason ? ` Reason: ${doc.cancellationReason}` : ""}`,
            onCancel: () => {
              setShowDialog(false);
              setShowReasonWarning(false);
            },
            onConfirm: () => {
              setShowDialog(false);
              setShowReasonWarning(false);
              if (!showReasonWarning) {
                handle();
              }
            },
          }
        : undefined,
  };
}
