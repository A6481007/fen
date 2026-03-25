import Container from "@/components/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PromotionCardSkeleton = () => (
  <Card className="h-full overflow-hidden border border-gray-100 shadow-sm">
    <div className="h-40 bg-gray-100" />
    <CardContent className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-10 w-28 rounded-full" />
    </CardContent>
  </Card>
);

const PromotionLoading = () => (
  <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
    <Container className="space-y-8 py-10 lg:space-y-10 lg:py-14">
      <Card className="overflow-hidden border border-gray-100">
        <CardContent className="space-y-4 p-6 sm:p-10">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-3/5" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <Skeleton className="h-12 w-full rounded-xl" />
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <PromotionCardSkeleton key={index} />
        ))}
      </section>
    </Container>
  </main>
);

export default PromotionLoading;
