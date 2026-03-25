// Promotions showcase section for homepage
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DealCountdown } from "@/components/DealCountdown";
import { Sparkles, ArrowRight, Tag, Clock, Zap, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface Promotion {
  _id: string;
  slug: string;
  name: string;
  type: string;
  discountType: string;
  discountValue: number;
  buyQuantity?: number;
  getQuantity?: number;
  heroImage?: any;
  thumbnailImage?: any;
  badgeLabel?: string;
  badgeColor?: string;
  heroMessage?: string;
  shortDescription?: string;
  ctaText?: string;
  endDate?: string;
  urgencyTrigger?: {
    showCountdown?: boolean;
    urgencyMessage?: string;
  };
}

interface Deal {
  _id: string;
  dealId: string;
  title: string;
  dealType: string;
  dealPrice: number;
  discountPercent: number;
  badge?: string;
  badgeColor?: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    price: number;
  };
  endDate?: string;
}

interface PromotionsShowcaseProps {
  promotions: Promotion[];
  deals: Deal[];
}

export function PromotionsShowcase({ promotions, deals }: PromotionsShowcaseProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Featured promotion (first one with hero image)
  const featuredPromotion = promotions.find((p) => p.heroImage);
  const otherPromotions = promotions
    .filter((p) => p._id !== featuredPromotion?._id)
    .slice(0, 3);
  const topDeals = deals.slice(0, 6);

  return (
    <section className="py-12 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header - Psychological hook */}
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4 gap-1">
            <Sparkles className="w-3 h-3" />
            Limited Time Offers
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Don't Miss These Deals
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Exclusive savings handpicked for you. These offers won't last long!
          </p>
        </div>

        {/* Featured Promotion - Full width hero */}
        {featuredPromotion && (
          <Link href={`/promotions/${featuredPromotion.slug}`} className="block mb-8 group">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="grid md:grid-cols-2 gap-6 p-6 md:p-10">
                <div className="flex flex-col justify-center">
                  {featuredPromotion.badgeLabel && (
                    <Badge
                      className="w-fit mb-4 text-sm"
                      style={{ backgroundColor: featuredPromotion.badgeColor }}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      {featuredPromotion.badgeLabel}
                    </Badge>
                  )}

                  <h3 className="text-2xl md:text-4xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {featuredPromotion.name}
                  </h3>

                  {featuredPromotion.heroMessage && (
                    <p className="text-lg text-muted-foreground mb-4">
                      {featuredPromotion.heroMessage}
                    </p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap mb-6">
                    <DiscountBadge promotion={featuredPromotion} size="lg" />

                    {mounted &&
                      featuredPromotion.urgencyTrigger?.showCountdown &&
                      featuredPromotion.endDate && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <Clock className="w-4 h-4" />
                          <DealCountdown endDate={featuredPromotion.endDate} />
                        </div>
                      )}
                  </div>

                  <Button size="lg" className="w-fit group-hover:translate-x-1 transition-transform">
                    {featuredPromotion.ctaText || "Shop Now"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {featuredPromotion.heroImage && (
                  <div className="relative aspect-[4/3] md:aspect-auto">
                    <Image
                      src={urlFor(featuredPromotion.heroImage).width(600).height(400).url()}
                      alt={featuredPromotion.name}
                      fill
                      className="object-cover rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Secondary Promotions Grid */}
        {otherPromotions.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {otherPromotions.map((promo) => (
              <PromotionCard key={promo._id} promotion={promo} />
            ))}
          </div>
        )}

        {/* Deals Section */}
        {topDeals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Today's Best Deals
              </h3>
              <Link href="/deals" className="text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topDeals.map((deal) => (
                <DealCard key={deal._id} deal={deal} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  return (
    <Link href={`/promotions/${promotion.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow group overflow-hidden">
        <div className="relative aspect-video">
          {promotion.thumbnailImage || promotion.heroImage ? (
            <Image
              src={urlFor(promotion.thumbnailImage || promotion.heroImage).width(400).height(225).url()}
              alt={promotion.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Gift className="w-12 h-12 text-primary/40" />
            </div>
          )}

          {promotion.badgeLabel && (
            <Badge className="absolute top-3 left-3" style={{ backgroundColor: promotion.badgeColor }}>
              {promotion.badgeLabel}
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <h4 className="font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {promotion.name}
          </h4>

          {promotion.shortDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {promotion.shortDescription}
            </p>
          )}

          <DiscountBadge promotion={promotion} />
        </CardContent>
      </Card>
    </Link>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link href={`/products/${deal.product.slug}`}>
      <Card className="h-full hover:shadow-md transition-shadow group">
        <div className="relative aspect-square">
          {deal.product.imageUrl ? (
            <Image src={deal.product.imageUrl} alt={deal.product.name} fill className="object-cover rounded-t-lg" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Tag className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          {deal.discountPercent > 0 && (
            <Badge
              className="absolute top-2 right-2 text-xs"
              style={{ backgroundColor: deal.badgeColor || "#EF4444" }}
            >
              {deal.discountPercent}% OFF
            </Badge>
          )}
        </div>

        <CardContent className="p-3">
          <h5 className="text-sm font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {deal.title || deal.product.name}
          </h5>

          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">${deal.dealPrice}</span>
            {deal.product.price > deal.dealPrice && (
              <span className="text-xs text-muted-foreground line-through">${deal.product.price}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function DiscountBadge({ promotion, size = "default" }: { promotion: Promotion; size?: "default" | "lg" }) {
  const sizeClasses = size === "lg" ? "text-lg py-1.5 px-3" : "text-sm py-1 px-2";

  if (promotion.discountType === "percentage") {
    return (
      <Badge variant="secondary" className={cn("bg-green-100 text-green-800", sizeClasses)}>
        {promotion.discountValue}% OFF
      </Badge>
    );
  }

  if (promotion.discountType === "fixed") {
    return (
      <Badge variant="secondary" className={cn("bg-green-100 text-green-800", sizeClasses)}>
        Save ${promotion.discountValue}
      </Badge>
    );
  }

  if (promotion.discountType === "bxgy") {
    return (
      <Badge variant="secondary" className={cn("bg-purple-100 text-purple-800", sizeClasses)}>
        <Gift className="w-3 h-3 mr-1" />
        Buy {promotion.buyQuantity} Get {promotion.getQuantity} Free
      </Badge>
    );
  }

  if (promotion.discountType === "freeShipping") {
    return (
      <Badge variant="secondary" className={cn("bg-blue-100 text-blue-800", sizeClasses)}>
        Free Shipping
      </Badge>
    );
  }

  return null;
}
