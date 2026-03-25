import { NextResponse } from "next/server";
import { getPricingSettings } from "@/sanity/queries";

export async function GET() {
  const settings = await getPricingSettings();
  return NextResponse.json({
    dealerDiscountPercent: settings.dealerDiscountPercent ?? 0,
    showDealerDiscount: Boolean(settings.showDealerDiscount),
    dealerFreeShippingEnabled: Boolean(settings.dealerFreeShippingEnabled),
    premiumFreeShippingEnabled: Boolean(settings.premiumFreeShippingEnabled),
    dealerBenefits: {
      enabled: Boolean(settings.showDealerBenefits),
      titleApply: settings.dealerBenefitsTitleApply ?? "Dealer Account Benefits",
      titlePending:
        settings.dealerBenefitsTitlePending ??
        "Dealer Account Benefits (Upon Approval)",
      titleActive: settings.dealerBenefitsTitleActive ?? "Active Dealer Benefits",
      items: settings.dealerBenefits ?? [],
    },
    premiumBenefits: {
      enabled: Boolean(settings.showPremiumBenefits),
      titleActive: settings.premiumBenefitsTitleActive ?? "Premium Benefits",
      items: settings.premiumBenefits ?? [],
    },
  });
}
