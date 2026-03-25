import Container from "@/components/Container";
import { Skeleton } from "@/components/ui/skeleton";

const CategoryPageSkeleton = () => {
  // Generate different widths for more realistic skeleton
  const randomWidths = ["w-16", "w-20", "w-24", "w-28", "w-32", "w-36", "w-40"];

  const getRandomWidth = () =>
    randomWidths[Math.floor(Math.random() * randomWidths.length)];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-background-subtle via-white to-brand-border">
      <Container className="py-10">
        {/* Breadcrumb Skeleton */}
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-12" />
            <div className="h-4 w-4 bg-gray-200 rounded opacity-50" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Header Skeleton */}
        <div className="text-center mb-10">
          <Skeleton className="h-9 lg:h-11 w-72 lg:w-80 mx-auto mb-3" />
          <div className="flex flex-col items-center space-y-2 mb-6">
            <Skeleton className="h-4 lg:h-5 w-80 lg:w-96 mx-auto" />
            <Skeleton className="h-4 lg:h-5 w-60 lg:w-72 mx-auto" />
          </div>

          {/* View All Products Button Skeleton */}
          <div className="flex justify-center">
            <Skeleton className="h-12 w-48 rounded-full" />
          </div>
        </div>

        {/* Category Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, index) => {
            const delay = index * 100; // Stagger the animation
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                style={{ animationDelay: `${delay}ms` }}
              >
                {/* Image Skeleton */}
                <div className="relative h-24 sm:h-28 lg:h-32 bg-gradient-to-br from-brand-border/30 to-brand-background-subtle/30">
                  <Skeleton className="w-full h-full rounded-none" />

                  {/* Featured Badge Skeleton (show on some items) */}
                  {index % 4 === 0 && (
                    <div className="absolute top-1.5 left-1.5">
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  )}

                  {/* Product Count Skeleton */}
                  <div className="absolute top-1.5 right-1.5">
                    <Skeleton className="h-5 w-6 rounded-full" />
                  </div>
                </div>

                {/* Content Skeleton */}
                <div className="p-3 lg:p-4">
                  {/* Title and Arrow */}
                  <div className="flex items-start justify-between mb-1.5">
                    <Skeleton className={`h-4 lg:h-5 ${getRandomWidth()}`} />
                    <Skeleton className="h-3.5 w-3.5 lg:h-4 lg:w-4 rounded flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <div className="mb-2 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4 hidden lg:block" />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <Skeleton className={`h-3 ${getRandomWidth()} max-w-16`} />
                    {index % 3 === 0 && (
                      <Skeleton className="h-4 w-8 rounded" />
                    )}
                  </div>
                </div>

                {/* Bottom border skeleton */}
                <div className="absolute bottom-0 left-0 w-full h-0.5">
                  <Skeleton className="w-full h-full rounded-none" />
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Products CTA Skeleton */}
        <div className="mt-10">
          <div className="bg-gradient-to-r from-brand-text-main/10 via-brand-red-accent/5 to-brand-text-main/10 rounded-xl p-6 border border-brand-text-main/20 text-center">
            <Skeleton className="h-6 lg:h-7 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-80 mx-auto mb-4" />
            <Skeleton className="h-10 w-40 rounded-full mx-auto" />
          </div>
        </div>

        {/* Additional Info Section Skeleton */}
        <div className="mt-12">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 lg:p-8 shadow-md border border-gray-100/50">
            <div className="text-center space-y-4">
              <Skeleton className="h-6 lg:h-7 w-64 lg:w-80 mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-80 lg:w-96 mx-auto" />
                <Skeleton className="h-4 w-60 lg:w-72 mx-auto" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Skeleton className="h-9 w-32 rounded-full" />
                <Skeleton className="h-9 w-36 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Floating skeleton elements for extra realism */}
        <div className="fixed top-4 right-4 opacity-20">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </Container>
    </div>
  );
};

export default CategoryPageSkeleton;
