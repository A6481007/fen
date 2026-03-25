import { Skeleton } from "@/components/ui/skeleton";
import Container from "@/components/Container";

export default function WishlistSkeleton() {
  return (
    <Container className="my-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-4 flex flex-col gap-3"
          >
            <Skeleton className="h-32 w-full rounded-md mb-2" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
