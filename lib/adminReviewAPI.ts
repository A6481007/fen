// Admin Review API Client Functions

export interface AdminReview {
  _id: string;
  rating: number;
  title: string;
  content: string;
  isVerifiedPurchase: boolean;
  helpful: number;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  adminNotes?: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    image?: string;
  };
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: {
      asset?: {
        url: string;
      };
    };
  };
}

export interface ReviewsByStatusResponse {
  success: boolean;
  reviews: AdminReview[];
  count: number;
}

export interface ReviewActionResponse {
  success: boolean;
  message: string;
  status: string;
}

/**
 * Get reviews by status (pending, approved, or rejected)
 */
export async function getReviewsByStatusAPI(
  status: "pending" | "approved" | "rejected"
): Promise<ReviewsByStatusResponse> {
  try {
    const response = await fetch(`/api/admin/reviews?status=${status}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch reviews");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching reviews by status:", error);
    throw error;
  }
}

/**
 * Approve a review
 */
export async function approveReviewAPI(
  reviewId: string,
  adminNotes?: string
): Promise<ReviewActionResponse> {
  try {
    const response = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reviewId,
        action: "approve",
        adminNotes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to approve review");
    }

    return await response.json();
  } catch (error) {
    console.error("Error approving review:", error);
    throw error;
  }
}

/**
 * Reject a review
 */
export async function rejectReviewAPI(
  reviewId: string,
  adminNotes?: string
): Promise<ReviewActionResponse> {
  try {
    const response = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reviewId,
        action: "reject",
        adminNotes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to reject review");
    }

    return await response.json();
  } catch (error) {
    console.error("Error rejecting review:", error);
    throw error;
  }
}
