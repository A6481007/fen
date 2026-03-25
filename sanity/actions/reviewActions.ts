"use client";

import { useCallback, useState } from "react";
import { useClient, DocumentActionProps } from "sanity";
import { CheckmarkIcon, CloseIcon } from "@sanity/icons";

export function ApproveReviewAction(props: DocumentActionProps) {
  const { id, published, draft, onComplete } = props;
  const client = useClient({ apiVersion: "2023-10-01" });
  const [isRunning, setIsRunning] = useState(false);

  const doc = draft || published;
  const canApprove = doc?.status === "pending";

  const handle = useCallback(async () => {
    if (!doc) return;

    setIsRunning(true);

    try {
      const now = new Date().toISOString();

      // Update review
      await client
        .patch(id)
        .set({
          status: "approved",
          approvedAt: now,
          approvedBy: "admin@studio",
        })
        .commit();

      // Update product rating stats
      const productId = (doc.product as any)?._ref;
      if (productId) {
        // Fetch all approved reviews for this product
        const reviews = await client.fetch(
          `*[_type == "review" && product._ref == $productId && status == "approved"]{rating}`,
          { productId }
        );

        const totalReviews = reviews.length;
        const avgRating =
          totalReviews > 0
            ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
            : 0;

        // Calculate distribution
        const distribution = {
          fiveStars: reviews.filter((r: any) => r.rating === 5).length,
          fourStars: reviews.filter((r: any) => r.rating === 4).length,
          threeStars: reviews.filter((r: any) => r.rating === 3).length,
          twoStars: reviews.filter((r: any) => r.rating === 2).length,
          oneStar: reviews.filter((r: any) => r.rating === 1).length,
        };

        // Update product
        await client
          .patch(productId)
          .set({
            averageRating: Math.round(avgRating * 10) / 10,
            totalReviews,
            ratingDistribution: distribution,
          })
          .commit();
      }

      onComplete();
    } catch (error) {
      console.error("Failed to approve review:", error);
    }

    setIsRunning(false);
  }, [client, id, doc, onComplete]);

  if (!canApprove) return null;

  return {
    label: isRunning ? "Approving..." : "✅ Approve Review",
    icon: CheckmarkIcon,
    tone: "positive",
    disabled: isRunning,
    onHandle: handle,
  };
}

export function RejectReviewAction(props: DocumentActionProps) {
  const { id, published, draft, onComplete } = props;
  const client = useClient({ apiVersion: "2023-10-01" });
  const [isRunning, setIsRunning] = useState(false);

  const doc = draft || published;
  const canReject = doc?.status === "pending";

  const handle = useCallback(async () => {
    if (!doc) return;

    setIsRunning(true);

    try {
      await client
        .patch(id)
        .set({
          status: "rejected",
          updatedAt: new Date().toISOString(),
        })
        .commit();

      onComplete();
    } catch (error) {
      console.error("Failed to reject review:", error);
    }

    setIsRunning(false);
  }, [client, id, doc, onComplete]);

  if (!canReject) return null;

  return {
    label: isRunning ? "Rejecting..." : "❌ Reject Review",
    icon: CloseIcon,
    tone: "critical",
    disabled: isRunning,
    onHandle: handle,
  };
}
