"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function CheckoutSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in-0 duration-500">
      {/* Left Column - Cart Items and Address */}
      <div className="lg:col-span-2 space-y-6">
        {/* Cart Items Section */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" /> {/* "Your Items" title */}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Item 1 */}
            <div className="flex gap-4 p-4 border rounded-lg">
              <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex gap-4 p-4 border rounded-lg">
              <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex gap-4 p-4 border rounded-lg">
              <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Selection Section */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" /> {/* "Shipping Address" title */}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address Option 1 */}
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Skeleton className="w-4 h-4 rounded-full mt-1" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>

            {/* Address Option 2 */}
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Skeleton className="w-4 h-4 rounded-full mt-1" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-52" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Section */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" /> {/* "Payment Method" title */}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Option 1 */}
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="w-6 h-6" />
              <Skeleton className="h-4 w-32" />
            </div>

            {/* Payment Option 2 */}
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="w-6 h-6" />
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Order Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <Skeleton className="h-6 w-32" /> {/* "Order Summary" title */}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subtotal */}
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>

            {/* Discount */}
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>

            {/* Shipping */}
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>

            {/* Tax */}
            <div className="flex justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>

            <div className="space-y-3 pt-4">
              {/* Place Order Button */}
              <Skeleton className="h-12 w-full rounded-md" />

              {/* Pay Now Button */}
              <Skeleton className="h-12 w-full rounded-md" />
            </div>

            {/* Additional Info */}
            <div className="pt-4 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CheckoutHeaderSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-8" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}

export function OrderCheckoutSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in-0 duration-500">
      {/* Left Column - Order Details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Order Info Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" /> {/* Order number */}
                <Skeleton className="h-4 w-32" /> {/* Date */}
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />{" "}
              {/* Status badge */}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Items */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" /> {/* Items title */}
              {/* Item 1 */}
              <div className="flex gap-3 p-3 border rounded-lg">
                <Skeleton className="w-16 h-16 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex justify-between items-center mt-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
              {/* Item 2 */}
              <div className="flex gap-3 p-3 border rounded-lg">
                <Skeleton className="w-16 h-16 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <div className="flex justify-between items-center mt-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" /> {/* Payment method title */}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="w-6 h-6" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Payment Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <Skeleton className="h-6 w-36" /> {/* Payment summary title */}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>
            <Separator />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-12 w-full rounded-md mt-6" />{" "}
            {/* Pay button */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
