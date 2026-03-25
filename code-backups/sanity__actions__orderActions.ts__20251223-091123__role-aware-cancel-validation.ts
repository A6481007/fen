import { useCallback, useState } from "react";
import {
  useClient,
  useDocumentOperation,
  useCurrentUser,
  DocumentActionProps,
} from "sanity";
import { CheckmarkIcon, CloseIcon, PublishIcon } from "@sanity/icons";

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
      const actor = user?.email || user?.name || "admin@studio";

      patch.execute?.([
        {
          set: {
            status: "order_confirmed",
            orderConfirmedAt: now,
            orderConfirmedBy: actor,
          },
        },
      ]);

      await client
        .patch(id)
        .set({
          status: "order_confirmed",
          orderConfirmedAt: now,
          orderConfirmedBy: actor,
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "order_confirmed",
            changedBy: actor,
            changedByRole: "admin",
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
      const actor = user?.email || user?.name || "admin@studio";

      patch.execute?.([
        {
          set: {
            status: "packed",
            packedAt: now,
            packedBy: actor,
          },
        },
      ]);

      await client
        .patch(id)
        .set({
          status: "packed",
          packedAt: now,
          packedBy: actor,
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "packed",
            changedBy: actor,
            changedByRole: "packer",
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
      const actor = user?.email || user?.name || "admin@studio";

      patch.execute?.([
        {
          set: {
            status: "cancelled",
            cancelledAt: now,
            cancelledBy: actor,
            cancellationReason: "Cancelled via admin action",
          },
        },
      ]);

      await client
        .patch(id)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: actor,
          cancellationReason: "Cancelled via admin action",
        })
        .append("statusHistory", [
          {
            _type: "object",
            _key: `status-${Date.now()}`,
            status: "cancelled",
            changedBy: actor,
            changedByRole: "admin",
            changedAt: now,
            notes: "Order cancelled via admin action",
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
    dialog: showDialog
      ? {
          type: "confirm",
          tone: "critical",
          message: "Are you sure you want to cancel this order?",
          onCancel: () => setShowDialog(false),
          onConfirm: () => {
            setShowDialog(false);
            handle();
          },
        }
      : undefined,
  };
}
