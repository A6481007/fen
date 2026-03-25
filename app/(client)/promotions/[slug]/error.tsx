"use client";

import { useEffect } from "react";
import Container from "@/components/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PromotionError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[promotions] Failed to load promotion detail page", error);
  }, [error]);

  return (
    <main className="promotion-detail bg-gradient-to-b from-white via-slate-50 to-white">
      <Container className="py-12">
        <Card className="border border-red-100 bg-red-50/70 shadow-sm">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-xl font-bold text-red-800">We couldn&apos;t load this promotion</h1>
            <p className="text-sm text-red-700">
              Please try again. If the problem persists, the campaign may be unavailable.
            </p>
            <Button onClick={reset} variant="destructive" className="w-fit">
              Retry
            </Button>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
