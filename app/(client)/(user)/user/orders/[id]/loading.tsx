import { OrderDetailsSkeleton } from "@/components/OrderSkeletons";

export default function OrderDetailsLoading() {
  return (
    <div className="w-full">
      <OrderDetailsSkeleton />
    </div>
  );
}
