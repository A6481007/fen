import { Card, CardContent, CardHeader } from "./ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const OrdersPageSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-5">
        <Skeleton className="h-8 w-32 mb-2" /> {/* Title */}
        <Skeleton className="h-4 w-48" /> {/* Subtitle */}
      </div>

      {/* Orders List */}
      <Card className="overflow-hidden">
        <div className="p-4 space-y-6">
          {/* Order Skeleton 1 */}
          <div className="border rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" /> {/* Order number */}
                    <Skeleton className="h-4 w-32" /> {/* Date */}
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" /> {/* Status */}
                </div>

                <div className="space-y-3">
                  {/* Product items */}
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/3 space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-10 w-full rounded" /> {/* Button */}
              </div>
            </div>
          </div>

          {/* Order Skeleton 2 */}
          <div className="border rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-2/5" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/3 space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-10 w-full rounded" />
              </div>
            </div>
          </div>

          {/* Order Skeleton 3 */}
          <div className="border rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-18" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-2/5" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-22" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/3 space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <Skeleton className="h-10 w-full rounded" />
              </div>
            </div>
          </div>

          {/* Order Skeleton 4 */}
          <div className="border rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-38" />
                    <Skeleton className="h-4 w-30" />
                  </div>
                  <Skeleton className="h-6 w-18 rounded-full" />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/3 space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-26" />
                  <Skeleton className="h-5 w-22" />
                </div>
                <Skeleton className="h-10 w-full rounded" />
              </div>
            </div>
          </div>

          {/* Order Skeleton 5 */}
          <div className="border rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-42" />
                    <Skeleton className="h-4 w-34" />
                  </div>
                  <Skeleton className="h-6 w-22 rounded-full" />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-1/3 space-y-3">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-22" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-10 w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Pagination Skeleton */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-20" /> {/* Previous */}
          <Skeleton className="h-9 w-9" /> {/* Page 1 */}
          <Skeleton className="h-9 w-9" /> {/* Page 2 */}
          <Skeleton className="h-9 w-9" /> {/* Page 3 */}
          <Skeleton className="h-9 w-9" /> {/* Page 4 */}
          <Skeleton className="h-9 w-9" /> {/* Page 5 */}
          <Skeleton className="h-9 w-16" /> {/* Next */}
        </div>
      </div>
    </div>
  );
};

export const OrderDetailsSkeleton = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <Skeleton className="w-16 h-16 rounded-md" />
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-32 mb-2" />
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary & Address */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
