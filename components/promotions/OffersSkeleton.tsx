import React from "react";

type OffersSkeletonProps = {
  variant?: "strip" | "card";
};

export function OffersSkeleton({ variant = "strip" }: OffersSkeletonProps) {
  if (variant === "strip") {
    return <div className="h-12 animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-6 w-48 rounded bg-gray-100" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-40 rounded-lg bg-gray-100" />
        <div className="h-40 rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}
