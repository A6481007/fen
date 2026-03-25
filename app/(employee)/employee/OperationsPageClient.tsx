"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OperationsView = "quotations" | "reviews" | "placeholder";

type Props = {
  view: OperationsView;
};

const viewCopy: Record<OperationsView, { title: string; description: string }> = {
  quotations: {
    title: "Quotations",
    description: "Review and follow up on quotation requests in one place.",
  },
  reviews: {
    title: "Reviews",
    description: "Moderate recent customer reviews and respond quickly.",
  },
  placeholder: {
    title: "Operations",
    description: "Choose a workspace to get started.",
  },
};

export default function OperationsPageClient({ view }: Props) {
  const { title, description } = viewCopy[view];

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      {view === "placeholder" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DestinationCard
            title="Orders"
            description="Pick, pack, and monitor fulfilment progress."
            href="/employee/orders"
          />
          <DestinationCard
            title="Packing"
            description="See packing queue and assign handlers."
            href="/employee/packing"
          />
          <DestinationCard
            title="Deliveries"
            description="Track deliveries and proof of receipt."
            href="/employee/deliveries"
          />
          <DestinationCard
            title="Warehouse"
            description="Check stock movements and cycle counts."
            href="/employee/warehouse"
          />
          <DestinationCard
            title="Payments"
            description="Review payment statuses and follow-ups."
            href="/employee/payments"
          />
          <DestinationCard
            title="Quotations"
            description="Access quotation drafts and approvals."
            href="/employee/operations/quotations"
          />
          <DestinationCard
            title="Reviews"
            description="Moderate and reply to customer reviews."
            href="/employee/operations/reviews"
          />
        </div>
      )}

      {view !== "placeholder" && (
        <Card className="p-6 text-sm text-slate-700">
          <p className="mb-4">This section is coming soon.</p>
          <Button asChild size="sm">
            <Link href="/employee/operations">Back to operations hub</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

function DestinationCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Card className="flex flex-col gap-2 border-slate-200 p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>Open</Link>
        </Button>
      </div>
    </Card>
  );
}
