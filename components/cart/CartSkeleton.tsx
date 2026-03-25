import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function CartItemSkeleton() {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex gap-4">
        {/* Product Image Skeleton */}
        <div className="w-24 h-24 flex-shrink-0">
          <Skeleton className="w-full h-full rounded-md" />
        </div>

        {/* Product Details Skeleton */}
        <div className="flex-1">
          <div className="flex justify-between">
            <div className="flex-1">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <div className="flex gap-2 mt-1">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-6 w-20 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Stock Status Skeleton */}
          <Skeleton className="h-5 w-24 mt-2" />

          {/* Controls Skeleton */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-16 ml-4" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderSummarySkeleton() {
  return (
    <div className="border rounded-lg p-6">
      <Skeleton className="h-7 w-32 mb-4" />
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Separator />
        <div className="flex justify-between">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <div className="mt-6">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function AddressSelectorSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="border rounded-lg p-3">
          <div className="flex items-start gap-3">
            <Skeleton className="w-4 h-4 rounded-full mt-1" />
            <div className="flex-1">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
        <div className="border rounded-lg p-3 opacity-50">
          <div className="flex items-start gap-3">
            <Skeleton className="w-4 h-4 rounded-full mt-1" />
            <div className="flex-1">
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CartSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Cart Items Skeleton */}
      <div className="lg:col-span-2 space-y-4">
        <CartItemSkeleton />
        <CartItemSkeleton />
        <CartItemSkeleton />
      </div>

      {/* Sidebar Skeleton */}
      <div className="space-y-6">
        <OrderSummarySkeleton />
        <AddressSelectorSkeleton />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    </div>
  );
}
