import Container from "@/components/Container";
import {
  CheckoutHeaderSkeleton,
  CheckoutSkeleton,
} from "@/components/checkout/CheckoutSkeleton";

export default function CheckoutLoading() {
  return (
    <Container className="py-6">
      <div className="space-y-6">
        {/* Header Skeleton */}
        <CheckoutHeaderSkeleton />

        {/* Checkout Content Skeleton */}
        <CheckoutSkeleton />
      </div>
    </Container>
  );
}
