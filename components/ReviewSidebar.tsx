"use client";

import React, { useState, useCallback } from "react";
import "@/app/i18n";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarIcon, Loader2, Star } from "lucide-react";
import { submitReviewAPI } from "@/lib/reviewAPI";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ReviewSidebarProps {
  productId: string;
  productName: string;
  isVerifiedPurchase?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

const ReviewSidebar = React.memo(
  ({
    productId,
    productName,
    isVerifiedPurchase,
    isOpen,
    onClose,
    onReviewSubmitted,
  }: ReviewSidebarProps) => {
    const { t } = useTranslation();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = useCallback(() => {
      setRating(0);
      setHoverRating(0);
      setTitle("");
      setContent("");
    }, []);

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
          toast.error(
            t("client.productPage.reviewSidebar.validation.rating", {
              defaultValue: "Please select a rating",
            })
          );
          return;
        }

        if (title.trim().length < 5) {
          toast.error(
            t("client.productPage.reviewSidebar.validation.title", {
              defaultValue: "Title must be at least 5 characters",
            })
          );
          return;
        }

        if (content.trim().length < 20) {
          toast.error(
            t("client.productPage.reviewSidebar.validation.content", {
              defaultValue: "Review must be at least 20 characters",
            })
          );
          return;
        }

        setIsSubmitting(true);

        try {
          const result = await submitReviewAPI({
            productId,
            rating,
            title: title.trim(),
            content: content.trim(),
          });

          if (result.success) {
            toast.success(result.message);
            resetForm();
            onClose();
            if (onReviewSubmitted) {
              onReviewSubmitted();
            }
          } else {
            toast.error(result.message);
          }
        } catch (error) {
          toast.error(
            t("client.productPage.reviewSidebar.submitFailed", {
              defaultValue: "Failed to submit review. Please try again.",
            })
          );
          console.error("Error submitting review:", error);
        } finally {
          setIsSubmitting(false);
        }
      },
      [rating, title, content, productId, onClose, onReviewSubmitted, resetForm, t]
    );

    const handleRatingClick = useCallback((value: number) => {
      setRating(value);
    }, []);

    const handleRatingHover = useCallback((value: number) => {
      setHoverRating(value);
    }, []);

    const handleRatingLeave = useCallback(() => {
      setHoverRating(0);
    }, []);

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!open && !isSubmitting) {
          onClose();
          setTimeout(resetForm, 300);
        }
      },
      [isSubmitting, onClose, resetForm]
    );

    const titleLength = title.length;
    const contentLength = content.length;
    const isTitleValid = titleLength >= 5;
    const isContentValid = contentLength >= 20;

    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-brand-black-strong">
              <Star className="w-5 h-5" />
              {t("client.productPage.reviewSidebar.title", { defaultValue: "Write a Review" })}
            </SheetTitle>
            <SheetDescription className="text-left">
              {t("client.productPage.reviewSidebar.subtitle", {
                defaultValue: "Share your experience with {{productName}}",
                productName,
              })}
            </SheetDescription>
            {isVerifiedPurchase && (
              <div className="bg-green-50 border border-success-highlight rounded-md p-3 mt-2">
                <p className="text-sm text-success-base font-medium">
                  {t("client.productPage.reviewSidebar.verified", {
                    defaultValue: "This will be marked as a verified purchase",
                  })}
                </p>
              </div>
            )}
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-180px)] mt-6">
            <div className="flex-1 space-y-6 overflow-y-auto px-4">
              <div className="space-y-3">
                <Label htmlFor="rating" className="text-base font-semibold text-brand-black-strong">
                  {t("client.productPage.reviewSidebar.rating.label", { defaultValue: "Your Rating" })}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleRatingClick(value)}
                        onMouseEnter={() => handleRatingHover(value)}
                        onMouseLeave={handleRatingLeave}
                        className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-text-main focus:ring-offset-2 rounded"
                        aria-label={t("client.productPage.reviewSidebar.rating.aria", {
                          defaultValue: "Rate {{count}} stars",
                          count: value,
                        })}
                        disabled={isSubmitting}
                      >
                        <StarIcon
                          size={40}
                          className={`${
                            value <= (hoverRating || rating)
                              ? "text-brand-text-main fill-brand-text-main"
                              : "text-gray-300"
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-text-main transition-all duration-300"
                          style={{ width: `${(rating / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-brand-black-strong min-w-[80px]">
                        {t("client.productPage.reviewSidebar.rating.value", {
                          defaultValue: "{{count}} stars",
                          count: rating,
                        })}
                      </span>
                    </div>
                  )}
                  {rating === 0 && (
                    <p className="text-sm text-gray-500">
                      {t("client.productPage.reviewSidebar.rating.hint", {
                        defaultValue: "Click to rate this product",
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold text-brand-black-strong">
                  {t("client.productPage.reviewSidebar.titleField.label", {
                    defaultValue: "Review Title",
                  })}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder={t("client.productPage.reviewSidebar.titleField.placeholder", {
                    defaultValue: "Sum up your experience in a few words",
                  })}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                  className={`border-gray-300 focus:border-brand-text-main ${
                    titleLength > 0 && !isTitleValid ? "border-red-300" : ""
                  }`}
                />
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs ${
                      titleLength > 0 && !isTitleValid
                        ? "text-red-500"
                        : titleLength >= 5
                        ? "text-success-base"
                        : "text-gray-500"
                    }`}
                  >
                    {titleLength < 5
                      ? t("client.productPage.reviewSidebar.titleField.remaining", {
                          defaultValue: "{{count}} more characters needed",
                          count: 5 - titleLength,
                        })
                      : t("client.productPage.reviewSidebar.titleField.ok", {
                          defaultValue: "Title looks good",
                        })}
                  </p>
                  <p className="text-xs text-gray-500">{titleLength}/100</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-base font-semibold text-brand-black-strong">
                  {t("client.productPage.reviewSidebar.contentField.label", {
                    defaultValue: "Your Review",
                  })}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  placeholder={t("client.productPage.reviewSidebar.contentField.placeholder", {
                    defaultValue:
                      "Tell us more about your experience with this product... What did you like? What could be improved?",
                  })}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={1000}
                  rows={8}
                  required
                  disabled={isSubmitting}
                  className={`border-gray-300 focus:border-brand-text-main resize-none ${
                    contentLength > 0 && !isContentValid ? "border-red-300" : ""
                  }`}
                />
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs ${
                      contentLength > 0 && !isContentValid
                        ? "text-red-500"
                        : contentLength >= 20
                        ? "text-success-base"
                        : "text-gray-500"
                    }`}
                  >
                    {contentLength < 20
                      ? t("client.productPage.reviewSidebar.contentField.remaining", {
                          defaultValue: "{{count}} more characters needed",
                          count: 20 - contentLength,
                        })
                      : t("client.productPage.reviewSidebar.contentField.ok", {
                          defaultValue: "Review is detailed enough",
                        })}
                  </p>
                  <p className="text-xs text-gray-500">{contentLength}/1000</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
                <h4 className="text-sm font-semibold text-blue-900">
                  {t("client.productPage.reviewSidebar.guidelines.title", {
                    defaultValue: "Review Guidelines",
                  })}
                </h4>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>
                    {t("client.productPage.reviewSidebar.guidelines.honest", {
                      defaultValue: "Be honest and constructive in your feedback",
                    })}
                  </li>
                  <li>
                    {t("client.productPage.reviewSidebar.guidelines.focus", {
                      defaultValue: "Focus on your experience with the product",
                    })}
                  </li>
                  <li>
                    {t("client.productPage.reviewSidebar.guidelines.approval", {
                      defaultValue: "Your review will be published after admin approval",
                    })}
                  </li>
                  <li>
                    {t("client.productPage.reviewSidebar.guidelines.respectful", {
                      defaultValue: "Avoid offensive language or personal attacks",
                    })}
                  </li>
                </ul>
              </div>
            </div>

            <SheetFooter className="mt-6 pt-6 border-t flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {t("client.productPage.reviewSidebar.cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || !isTitleValid || !isContentValid}
                  className="w-full sm:flex-1 bg-brand-black-strong hover:bg-brand-text-main text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("client.productPage.reviewSidebar.submitting", {
                        defaultValue: "Submitting...",
                      })}
                    </>
                  ) : (
                    t("client.productPage.reviewSidebar.submit", {
                      defaultValue: "Submit Review",
                    })
                  )}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    );
  }
);

ReviewSidebar.displayName = "ReviewSidebar";

export default ReviewSidebar;
