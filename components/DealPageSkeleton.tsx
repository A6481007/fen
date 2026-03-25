import Container from "@/components/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DealPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-surface-0">
      {/* Breadcrumb Skeleton */}
      <Container className="pt-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-12" />
          <span className="text-gray-400">/</span>
          <Skeleton className="h-4 w-20" />
        </div>
      </Container>

      {/* Hero Section Skeleton */}
      <Container className="py-8 sm:py-12">
        <Card className="border border-border bg-surface-1">
          <CardContent className="p-6 sm:p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
              <div className="flex-1 space-y-4 sm:space-y-6">
                {/* Badges */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded" />
                </div>

                {/* Title and Description */}
                <div>
                  <Skeleton className="h-8 sm:h-10 md:h-12 lg:h-14 w-full max-w-md mb-2 sm:mb-4" />
                  <Skeleton className="h-4 w-full max-w-2xl mb-2" />
                  <Skeleton className="h-4 w-3/4 max-w-xl" />
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[1, 2, 3].map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-lg border border-border bg-surface-0 p-3 sm:p-4 ${
                        index === 2 ? "col-span-2 sm:col-span-1" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-6 sm:h-8 w-12" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Countdown Timer Skeleton */}
              <div className="lg:flex-shrink-0">
                <div className="rounded-xl border border-border bg-surface-0 p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Skeleton className="w-4 h-4 sm:w-5 sm:h-5" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {[1, 2, 3, 4].map((item) => (
                        <div
                          key={item}
                          className="flex flex-col items-center rounded-lg border border-border bg-surface-0 p-2 sm:p-3"
                        >
                          <Skeleton className="h-6 sm:h-8 w-8 mb-1" />
                          <Skeleton className="h-3 w-6" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>

      {/* Deal Features Skeleton */}
      <Container className="py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="p-4 sm:p-6">
              <CardContent className="p-0 text-center space-y-3">
                <Skeleton className="w-12 h-12 mx-auto rounded-full" />
                <Skeleton className="h-5 w-32 mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>

      {/* Products Section Header Skeleton */}
      <Container className="py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
            <Skeleton className="h-8 sm:h-10 w-48" />
            <Skeleton className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <Skeleton className="h-4 w-full max-w-2xl mx-auto mb-2" />
          <Skeleton className="h-4 w-3/4 max-w-xl mx-auto" />
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
            <Card key={item} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Product Image */}
                <Skeleton className="w-full h-48 sm:h-52" />

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  {/* Brand */}
                  <Skeleton className="h-3 w-16" />

                  {/* Title */}
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Skeleton key={star} className="w-4 h-4" />
                    ))}
                    <Skeleton className="h-3 w-8 ml-1" />
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-10" />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>

      {/* Call to Action Skeleton */}
      <Container className="py-8 sm:py-12">
        <Card className="border border-border bg-surface-1">
          <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
            <Skeleton className="h-8 sm:h-10 w-80 mx-auto mb-4" />
            <Skeleton className="h-4 w-full max-w-2xl mx-auto mb-2" />
            <Skeleton className="h-4 w-3/4 max-w-xl mx-auto mb-6" />
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Skeleton className="h-11 w-full sm:w-40" />
              <Skeleton className="h-11 w-full sm:w-36" />
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
};

export default DealPageSkeleton;
