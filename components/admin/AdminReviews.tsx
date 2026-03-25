"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StarIcon,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Check,
  RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getReviewsByStatusAPI,
  approveReviewAPI,
  rejectReviewAPI,
  AdminReview,
} from "@/lib/adminReviewAPI";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { buildProductPath } from "@/lib/paths";

const AdminReviews: React.FC = React.memo(() => {
  const { t, i18n } = useTranslation();
  const [pendingReviews, setPendingReviews] = useState<AdminReview[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<AdminReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const formatDate = (dateString?: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

  const loadPendingReviews = useCallback(async () => {
    try {
      const data = await getReviewsByStatusAPI("pending");
      setPendingReviews(data.reviews);
    } catch (error) {
      console.error("Error loading pending reviews:", error);
      toast.error(t("admin.reviews.toast.loadPendingFailed"));
    }
  }, [t]);

  const loadApprovedReviews = useCallback(async () => {
    try {
      const data = await getReviewsByStatusAPI("approved");
      setApprovedReviews(data.reviews);
    } catch (error) {
      console.error("Error loading approved reviews:", error);
      toast.error(t("admin.reviews.toast.loadApprovedFailed"));
    }
  }, [t]);

  const loadAllReviews = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadPendingReviews(), loadApprovedReviews()]);
    setIsLoading(false);
  }, [loadPendingReviews, loadApprovedReviews]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadPendingReviews(), loadApprovedReviews()]);
      toast.success(t("admin.reviews.toast.refreshed"));
    } catch (error) {
      console.error("Error refreshing reviews:", error);
      toast.error(t("admin.reviews.toast.refreshFailed"));
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPendingReviews, loadApprovedReviews, t]);

  useEffect(() => {
    loadAllReviews();
  }, [loadAllReviews]);

  const handleApprove = useCallback(
    async (reviewId: string) => {
      setProcessingId(reviewId);
      try {
        const result = await approveReviewAPI(reviewId);
        if (result.success) {
          toast.success(t("admin.reviews.toast.approved"));
          await loadAllReviews();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Error approving review:", error);
        toast.error(t("admin.reviews.toast.approveFailed"));
      } finally {
        setProcessingId(null);
      }
    },
    [loadAllReviews, t]
  );

  const handleReject = useCallback(
    async (reviewId: string) => {
      setProcessingId(reviewId);
      try {
        const result = await rejectReviewAPI(reviewId, rejectNotes);
        if (result.success) {
          toast.success(t("admin.reviews.toast.rejected"));
          setRejectNotes("");
          await loadAllReviews();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Error rejecting review:", error);
        toast.error(t("admin.reviews.toast.rejectFailed"));
      } finally {
        setProcessingId(null);
      }
    },
    [rejectNotes, loadAllReviews, t]
  );

  const renderReviewCard = useCallback(
    (review: AdminReview, isPending: boolean = true) => (
      <Card key={review._id} className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* User Avatar */}
            <Avatar className="h-12 w-12">
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
              {/* User Info & Product */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-brand-black-strong">
                    {review.user?.firstName} {review.user?.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">{review.user?.email}</p>
                  <Link
                    href={buildProductPath(review.product)}
                    className="text-sm text-brand-text-main hover:underline"
                    target="_blank"
                  >
                    {review.product?.name}
                  </Link>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {review.isVerifiedPurchase && (
                    <Badge className="bg-success-highlight text-success-base hover:bg-success-highlight">
                      {t("admin.reviews.verifiedPurchase")}
                    </Badge>
                  )}
                  {!isPending && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                      {t("admin.reviews.approvedBadge")}
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    {t("admin.reviews.submittedLabel", {
                      date: formatDate(review.createdAt),
                    })}
                  </span>
                  {review.approvedAt && (
                    <span className="text-xs text-gray-400">
                      {t("admin.reviews.approvedLabel", {
                        date: formatDate(review.approvedAt),
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, index) => (
                    <StarIcon
                      key={index}
                      size={16}
                      className={`${
                        index < review.rating
                          ? "text-brand-text-main fill-brand-text-main"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">
                  {t("admin.reviews.ratingOutOf", {
                    rating: review.rating,
                    max: 5,
                  })}
                </span>
              </div>

              {/* Review Content */}
              <h5 className="font-semibold mb-2">{review.title}</h5>
              <p className="text-gray-700 leading-relaxed mb-4">
                {review.content}
              </p>

              {/* Actions - Only show for pending reviews */}
              {isPending && (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleApprove(review._id)}
                    disabled={processingId === review._id}
                    className="bg-success-base hover:bg-success-base text-white"
                    size="sm"
                  >
                    <CheckCircle size={16} className="mr-1" />
                    {processingId === review._id
                      ? t("admin.reviews.processing")
                      : t("admin.reviews.approve")}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={processingId === review._id}
                      >
                        <XCircle size={16} className="mr-1" />
                        {t("admin.reviews.reject")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("admin.reviews.rejectTitle")}</DialogTitle>
                        <DialogDescription>
                          {t("admin.reviews.rejectDescription")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder={t("admin.reviews.rejectNotesPlaceholder")}
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setRejectNotes("")}
                          >
                            {t("admin.reviews.cancel")}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(review._id)}
                            disabled={processingId === review._id}
                          >
                            {processingId === review._id
                              ? t("admin.reviews.processing")
                              : t("admin.reviews.reject")}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye size={16} className="mr-1" />
                        {t("admin.reviews.preview")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{t("admin.reviews.previewTitle")}</DialogTitle>
                        <DialogDescription>
                          {t("admin.reviews.previewDescription")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="border rounded-lg p-4">
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
                                  {t("admin.reviews.verifiedPurchase")}
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
                              <span className="text-sm text-gray-600">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                            <h5 className="font-medium mb-2">{review.title}</h5>
                            <p className="text-gray-700 leading-relaxed">
                              {review.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              {!isPending && review.adminNotes && (
                <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                  <strong>{t("admin.reviews.adminNotesLabel")}:</strong>{" "}
                  {review.adminNotes}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    [processingId, rejectNotes, handleApprove, handleReject, t, formatDate]
  );

  const ReviewSkeleton = () => (
    <Card className="border-2 animate-pulse">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar Skeleton */}
          <div className="h-12 w-12 rounded-full bg-gray-200" />

          <div className="flex-1 space-y-3">
            {/* User Info Skeleton */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
                <div className="h-3 w-40 bg-gray-200 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-28 bg-gray-200 rounded-full" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Rating Skeleton */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 w-4 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="h-3 w-12 bg-gray-200 rounded" />
            </div>

            {/* Title Skeleton */}
            <div className="h-5 w-3/4 bg-gray-200 rounded" />

            {/* Content Skeleton */}
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-2/3 bg-gray-200 rounded" />
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex gap-3 pt-2">
              <div className="h-9 w-24 bg-gray-200 rounded" />
              <div className="h-9 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-brand-black-strong">
                {t("admin.reviews.title")}
              </CardTitle>
              <CardDescription>
                {t("admin.reviews.subtitle")}
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? t("admin.reviews.refreshing") : t("admin.reviews.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock size={16} />
                {t("admin.reviews.pendingTab", {
                  count: pendingReviews.length,
                })}
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <Check size={16} />
                {t("admin.reviews.approvedTab", {
                  count: approvedReviews.length,
                })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                </div>
              ) : pendingReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">
                    {t("admin.reviews.empty.pendingTitle")}
                  </p>
                  <p className="text-sm">
                    {t("admin.reviews.empty.pendingSubtitle")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReviews.map((review) =>
                    renderReviewCard(review, true)
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                </div>
              ) : approvedReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Check size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">
                    {t("admin.reviews.empty.approvedTitle")}
                  </p>
                  <p className="text-sm">
                    {t("admin.reviews.empty.approvedSubtitle")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedReviews.map((review) =>
                    renderReviewCard(review, false)
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

AdminReviews.displayName = "AdminReviews";

export default AdminReviews;
