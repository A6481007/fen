import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export type PersonalizedOffer = {
  campaignId: string;
  name: string;
  description?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  discountSummary?: string;
  eligibilityReason?: string;
  variant?: string | null;
};

type PersonalizedOffersProps = {
  offers: PersonalizedOffer[];
  context?: string;
};

export function PersonalizedOffers({ offers, context = "promotion-page" }: PersonalizedOffersProps) {
  if (!offers.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Personalized for you</p>
          <h2 className="text-lg font-bold text-gray-900">Exclusive offers</h2>
        </div>
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
          {context}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {offers.map((offer) => (
          <Card
            key={offer.campaignId}
            className="border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 shadow-sm"
          >
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    {offer.variant ? `Variant: ${offer.variant}` : "Eligible"}
                  </p>
                  <h3 className="text-base font-semibold text-gray-900">{offer.name}</h3>
                </div>
                {offer.discountSummary ? (
                  <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700">
                    {offer.discountSummary}
                  </Badge>
                ) : null}
              </div>

              {offer.description ? (
                <p className="text-sm text-gray-600">{offer.description}</p>
              ) : null}

              {offer.eligibilityReason ? (
                <p className="text-xs font-medium text-emerald-700">
                  {offer.eligibilityReason}
                </p>
              ) : null}

              {offer.ctaLink && (
                <Button asChild size="sm" className="w-fit">
                  <Link href={offer.ctaLink}>{offer.ctaText || "Shop now"}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default PersonalizedOffers;
