import { useCallback, useState } from "react";
import { useClient, useDocumentOperation, DocumentActionProps } from "sanity";
import { CheckmarkIcon, CloseIcon, PublishIcon } from "@sanity/icons";

// Approve Order Action
export function ApproveOrderAction(props: DocumentActionProps) {
  const { id, type, published, draft, onComplete } = props;
  const client = useClient({ apiVersion: "2023-10-01" });
  const [isRunning, setIsRunning] = useState(false);

  const doc = draft || published;
  const canApprove = doc?.status === "pending" || doc?.status === "address_confirmed";

  const handle = useCallback(async () => {
    if (!doc) return;

    setIsRunning(true);

    try {
      const now = new Date().toISOString();

      await client
        .patch(id)
        .set({
          status: "order_confirmed",
          orderConfirmedAt: now,
          orderConfirmedBy: "admin@studio", // Replace with actual user
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "order_confirmed",
            changedBy: "admin@studio",
            changedByRole: "admin",
            changedAt: now,
            notes: "Order confirmed via quick action",
          },
        ])
        .commit();

      onComplete();
    } catch (error) {
      console.error("Failed to approve order:", error);
    }

    setIsRunning(false);
  }, [client, id, doc, onComplete]);

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
  const [isRunning, setIsRunning] = useState(false);

  const doc = draft || published;
  const canPack = doc?.status === "order_confirmed";

  const handle = useCallback(async () => {
    if (!doc) return;

    setIsRunning(true);

    try {
      const now = new Date().toISOString();

      await client
        .patch(id)
        .set({
          status: "packed",
          packedAt: now,
          packedBy: "admin@studio",
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "packed",
            changedBy: "admin@studio",
            changedByRole: "packer",
            changedAt: now,
            notes: "Marked as packed via quick action",
          },
        ])
        .commit();

      onComplete();
    } catch (error) {
      console.error("Failed to mark as packed:", error);
    }

    setIsRunning(false);
  }, [client, id, doc, onComplete]);

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
  const [isRunning, setIsRunning] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const doc = draft || published;
  const canCancel =
    doc?.status !== "delivered" &&
    doc?.status !== "completed" &&
    doc?.status !== "cancelled";

  const handle = useCallback(async () => {
    if (!doc) return;

    setIsRunning(true);

    try {
      const now = new Date().toISOString();

      await client
        .patch(id)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: "admin@studio",
          cancellationReason: "Cancelled via admin action",
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "cancelled",
            changedBy: "admin@studio",
            changedByRole: "admin",
            changedAt: now,
            notes: "Order cancelled via admin action",
          },
        ])
        .commit();

      onComplete();
    } catch (error) {
      console.error("Failed to cancel order:", error);
    }

    setIsRunning(false);
  }, [client, id, doc, onComplete]);

  if (!canCancel) return null;

  return {
    label: isRunning ? "Cancelling..." : "❌ Cancel Order",
    icon: CloseIcon,
    tone: "critical",
    disabled: isRunning,
    onHandle: handle,
  };
}
