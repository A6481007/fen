import Container from "@/components/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const BlogPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-background-subtle to-white">
      {/* Breadcrumb Skeleton */}
      <Container className="pt-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-12" />
          <span className="text-gray-400">/</span>
          <Skeleton className="h-4 w-16" />
        </div>
      </Container>

      {/* Hero Section Skeleton */}
      <Container className="py-8 sm:py-12">
        <Card className="bg-gradient-to-r from-gray-300 to-gray-400 border-0 shadow-xl">
          <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
            <div className="max-w-3xl mx-auto">
              {/* Badge and Icon */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Skeleton className="w-6 h-6 sm:w-8 sm:h-8" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>

              {/* Title */}
              <Skeleton className="h-8 sm:h-10 md:h-12 lg:h-14 w-80 mx-auto mb-4" />

              {/* Description */}
              <div className="space-y-2 mb-6">
                <Skeleton className="h-4 w-full max-w-2xl mx-auto" />
                <Skeleton className="h-4 w-3/4 max-w-xl mx-auto" />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md mx-auto">
                {[1, 2, 3].map((item, index) => (
                  <div
                    key={item}
                    className={`bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 ${
                      index === 2 ? "col-span-2 sm:col-span-1" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="w-4 h-4" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-6 sm:h-8 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>

      {/* Section Header Skeleton */}
      <Container className="py-8 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 sm:h-10 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>

        {/* Blog Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item, index) => (
            <Card
              key={item}
              className={`overflow-hidden border-0 shadow-lg ${
                index === 0 ? "md:col-span-2 lg:col-span-2" : ""
              }`}
            >
              {/* Image Skeleton */}
              <Skeleton
                className={`w-full ${
                  index === 0 ? "h-64 md:h-80" : "h-48 md:h-56"
                }`}
              />

              <CardContent className="p-4 sm:p-6">
                {/* Meta Information */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2 mb-3">
                  <Skeleton
                    className={`h-5 w-full ${
                      index === 0 ? "sm:h-6 md:h-7" : ""
                    }`}
                  />
                  <Skeleton
                    className={`h-5 w-3/4 ${
                      index === 0 ? "sm:h-6 md:h-7" : ""
                    }`}
                  />
                </div>

                {/* Excerpt (for featured post) */}
                {index === 0 && (
                  <div className="space-y-2 mb-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                )}

                {/* Separator */}
                <Skeleton className="h-px w-full my-3" />

                {/* Read More Link */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>

      {/* Newsletter Section Skeleton */}
      <Container className="py-8 sm:py-12">
        <Card className="bg-gradient-to-r from-gray-200 to-gray-300 border-0">
          <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <Skeleton className="w-12 h-12 mx-auto mb-4" />
              <Skeleton className="h-8 sm:h-10 w-64 mx-auto mb-4" />
              <div className="space-y-2 mb-6">
                <Skeleton className="h-4 w-full max-w-md mx-auto" />
                <Skeleton className="h-4 w-3/4 max-w-sm mx-auto" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                <Skeleton className="h-11 w-full sm:w-40" />
                <Skeleton className="h-11 w-full sm:w-36" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
};

export default BlogPageSkeleton;
