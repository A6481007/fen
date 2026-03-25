"use client";

import React, { useState, useEffect, useCallback } from "react";
import "@/app/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarIcon, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import ReviewSidebar from "./ReviewSidebar";
import { getProductReviewsAPI, markReviewHelpfulAPI } from "@/lib/reviewAPI";
import { canUserReviewProduct } from "@/actions/reviewActions";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";

interface Review {
  _id: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: {
      asset: {
        url: string;
      };
    };
  };
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

const ProductReviews = React.memo(({ productId, productName }: ProductReviewsProps) => {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState({
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0,
  });
  const [canReview, setCanReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [isReviewSidebarOpen, setIsReviewSidebarOpen] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const data = await getProductReviewsAPI(productId);
      if (data) {
        setReviews(data.reviews);
        setAverageRating(data.averageRating);
        setTotalReviews(data.totalReviews);
        setRatingDistribution(data.ratingDistribution);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error(
        t("client.productPage.reviews.toast.loadError", {
          defaultValue: "Failed to load reviews",
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [productId, t]);

  const checkCanReview = useCallback(async () => {
    if (!isSignedIn) {
      setCanReview(false);
      return;
    }

    try {
      const result = await canUserReviewProduct(productId);
      setCanReview(result.canReview);
      setHasPurchased(result.hasPurchased);
      setHasReviewed(result.hasAlreadyReviewed);
    } catch (error) {
      console.error("Error checking review eligibility:", error);
    }
  }, [productId, isSignedIn]);

  useEffect(() => {
    loadReviews();
    checkCanReview();
  }, [loadReviews, checkCanReview]);

  const handleMarkHelpful = useCallback(
    async (reviewId: string) => {
      if (!isSignedIn) {
        toast.error(
          t("client.productPage.reviews.toast.signInHelpful", {
            defaultValue: "Please sign in to mark reviews as helpful",
          })
        );
        return;
      }

      try {
        const result = await markReviewHelpfulAPI(reviewId);
        if (result.success) {
          await loadReviews();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Error marking review as helpful:", error);
        toast.error(
          t("client.productPage.reviews.toast.updateError", {
            defaultValue: "Failed to update review",
          })
        );
      }
    },
    [isSignedIn, loadReviews, t]
  );

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  const ratingData = [
    { stars: 5, count: ratingDistribution.fiveStars },
    { stars: 4, count: ratingDistribution.fourStars },
    { stars: 3, count: ratingDistribution.threeStars },
    { stars: 2, count: ratingDistribution.twoStars },
    { stars: 1, count: ratingDistribution.oneStar },
  ];

  const handleOpenReviewSidebar = useCallback(() => {
    if (!isSignedIn) {
      toast.error(
        t("client.productPage.reviews.toast.signInWrite", {
          defaultValue: "Please sign in to write a review",
        })
      );
      return;
    }
    setIsReviewSidebarOpen(true);
  }, [isSignedIn, t]);

  const handleCloseReviewSidebar = useCallback(() => {
    setIsReviewSidebarOpen(false);
  }, []);

  const handleReviewSubmitted = useCallback(() => {
    loadReviews();
    checkCanReview();
  }, [loadReviews, checkCanReview]);

  if (isLoading) {
    return (
      <div className="mt-12">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {t("client.productPage.reviews.loading", {
              defaultValue: "Loading reviews...",
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-brand-black-strong">
            {t("client.productPage.reviews.title", {
              defaultValue: "Customer Reviews",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-4xl font-bold text-brand-black-strong">{averageRating.toFixed(1)}</span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, index) => (
                    <StarIcon
                      key={index}
                      size={20}
                      className={`${
                        index < Math.floor(averageRating)
                          ? "text-brand-text-main fill-brand-text-main"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-gray-600">
                {totalReviews === 0
                  ? t("client.productPage.reviews.none", { defaultValue: "No reviews yet" })
                  : t("client.productPage.reviews.basedOn", {
                      defaultValue: "Based on {{count}} reviews",
                      count: totalReviews,
                    })}
              </p>
              {isSignedIn ? (
                canReview ? (
                  <Button
                    onClick={handleOpenReviewSidebar}
                    className="mt-4 bg-brand-black-strong hover:bg-brand-text-main text-white"
                    size="sm"
                  >
                    {t("client.productPage.reviews.write", {
                      defaultValue: "Write a Review",
                    })}
                  </Button>
                ) : hasReviewed ? (
                  <p className="mt-4 text-sm text-gray-500">
                    {t("client.productPage.reviews.alreadyReviewed", {
                      defaultValue: "You have already reviewed this product",
                    })}
                  </p>
                ) : null
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  {t("client.productPage.reviews.signInToWrite", {
                    defaultValue: "Sign in to write a review",
                  })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              {ratingData.map((rating) => {
                const percentage = totalReviews > 0 ? (rating.count / totalReviews) * 100 : 0;
                return (
                  <div key={rating.stars} className="flex items-center gap-2">
                    <span className="text-sm w-8">{rating.stars}★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-text-main rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{rating.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-brand-black-strong">
                  {t("client.productPage.reviews.recent", {
                    defaultValue: "Recent Reviews ({{count}})",
                    count: totalReviews,
                  })}
                </h3>
                {reviews.length > 3 && (
                  <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
                    {showAll
                      ? t("client.productPage.reviews.showLess", { defaultValue: "Show Less" })
                      : t("client.productPage.reviews.viewAll", { defaultValue: "View All Reviews" })}
                  </Button>
                )}
              </div>

              {displayedReviews.map((review) => (
                <div key={review._id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={review.user?.profileImage?.asset?.url}
                        alt={`${review.user?.firstName} ${review.user?.lastName}`}
                      />
                      <AvatarFallback className="bg-brand-text-main/10 text-brand-black-strong">
                        {review.user?.firstName?.[0]}
                        {review.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-brand-black-strong">
                          {review.user?.firstName} {review.user?.lastName}
                        </h4>
                        {review.isVerifiedPurchase && (
                          <Badge className="bg-success-highlight text-success-base hover:bg-success-highlight text-xs">
                            {t("client.productPage.reviews.verifiedPurchase", {
                              defaultValue: "Verified Purchase",
                            })}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, index) => (
                            <StarIcon
                              key={index}
                              size={14}
                              className={`${
                                index < review.rating
                                  ? "text-brand-text-main fill-brand-text-main"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h5 className="font-medium mb-2">{review.title}</h5>
                      <p className="text-gray-700 mb-3 leading-relaxed">{review.content}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <button
                          onClick={() => handleMarkHelpful(review._id)}
                          className="flex items-center gap-1 hover:text-brand-text-main transition-colors disabled:opacity-50"
                          disabled={!isSignedIn}
                        >
                          <ThumbsUp size={14} />
                          {t("client.productPage.reviews.helpful", {
                            defaultValue: "Helpful ({{count}})",
                            count: review.helpful,
                          })}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {t("client.productPage.reviews.emptyPrompt", {
                  defaultValue: "No reviews yet. Be the first to review this product!",
                })}
              </p>
              {isSignedIn && canReview && (
                <Button onClick={handleOpenReviewSidebar} className="bg-brand-black-strong hover:bg-brand-text-main text-white">
                  {t("client.productPage.reviews.writeFirst", {
                    defaultValue: "Write the First Review",
                  })}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewSidebar
        productId={productId}
        productName={productName}
        isVerifiedPurchase={hasPurchased}
        isOpen={isReviewSidebarOpen}
        onClose={handleCloseReviewSidebar}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
});

ProductReviews.displayName = "ProductReviews";

export default ProductReviews;
