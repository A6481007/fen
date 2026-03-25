import Container from "@/components/Container";
import { Skeleton } from "@/components/ui/skeleton";

const CategoryDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-surface-0">
      <Container className="py-10">
        {/* Breadcrumb Skeleton */}
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-12" />
            <div className="h-4 w-4 bg-gray-200 rounded opacity-50" />
            <Skeleton className="h-4 w-20" />
            <div className="h-4 w-4 bg-gray-200 rounded opacity-50" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Category Header Section Skeleton */}
        <div className="mb-8 rounded-xl border border-border bg-surface-0 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left Side - Category Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                {/* Category Image Skeleton */}
                <Skeleton className="flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-xl" />

                <div className="flex-1">
                  <Skeleton className="h-8 lg:h-9 w-48 mb-2" />

                  {/* Category Stats */}
                  <div className="flex items-center gap-4 mb-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>

                  {/* Category Description */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-32" />
                <div className="h-4 w-px bg-gray-300" />
                <Skeleton className="h-9 w-40 rounded-full" />
              </div>
            </div>

            {/* Right Side - Quick Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 15 }).map((_, index) => {
            const delay = index * 80;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-border bg-surface-0"
                style={{ animationDelay: `${delay}ms` }}
              >
                {/* Product Image Skeleton */}
                <div className="relative aspect-square bg-surface-1">
                  <Skeleton className="w-full h-full rounded-none" />

                  {/* Sale Badge (some items) */}
                  {index % 5 === 0 && (
                    <div className="absolute top-2 left-2">
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                  )}

                  {/* Wishlist Button */}
                  <div className="absolute top-2 right-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>

                {/* Product Content */}
                <div className="p-4">
                  {/* Brand */}
                  <Skeleton className="h-3 w-16 mb-2" />

                  {/* Product Title */}
                  <div className="mb-3 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-3 w-3 rounded-full" />
                    ))}
                    <Skeleton className="h-3 w-8 ml-2" />
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-10" />
                  </div>

                  {/* Add to Cart Button */}
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Skeleton */}
        <div className="mt-12 flex justify-center">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-10 rounded" />
            <span className="px-2 text-gray-400">...</span>
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-10 rounded" />
          </div>
        </div>

        {/* Related Categories Skeleton */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border p-4 text-center"
              >
                <Skeleton className="h-12 w-12 rounded-lg mx-auto mb-3" />
                <Skeleton className="h-4 w-20 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Section Skeleton */}
        <div className="mt-12 rounded-xl border border-border bg-surface-0 p-6 lg:p-8 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <Skeleton className="h-7 lg:h-8 w-80 mx-auto" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-96 mx-auto" />
              <Skeleton className="h-4 w-72 mx-auto" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Skeleton className="h-12 w-48 rounded-full" />
              <Skeleton className="h-12 w-36 rounded-full" />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default CategoryDetailSkeleton;
