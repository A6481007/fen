// Review Types
export interface Review {
  _id: string;
  product: {
    _ref: string;
  };
  user: {
    _ref: string;
  };
  rating: number;
  title: string;
  content: string;
  isVerifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  helpful: number;
  helpfulBy: Array<{
    _ref: string;
  }>;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ReviewWithDetails extends Omit<Review, "user" | "product"> {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    profileImage?: {
      asset: {
        url: string;
      };
    };
  };
  product?: {
    _id: string;
    name: string;
    slug: {
      current: string;
    };
  };
}

export interface ProductReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    fiveStars: number;
    fourStars: number;
    threeStars: number;
    twoStars: number;
    oneStar: number;
  };
}

export interface ReviewFormData {
  productId: string;
  rating: number;
  title: string;
  content: string;
}

export interface ReviewActionResponse {
  success: boolean;
  message: string;
  reviewId?: string;
  error?: string;
}

export interface CanReviewResponse {
  canReview: boolean;
  hasAlreadyReviewed: boolean;
  hasPurchased: boolean;
}
