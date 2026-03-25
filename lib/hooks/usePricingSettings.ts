"use client";

import { useEffect, useState } from "react";

type BenefitItem = {
  text: string;
  enabled?: boolean;
};

type BenefitsBlock = {
  enabled: boolean;
  titleApply?: string;
  titlePending?: string;
  titleActive?: string;
  items: BenefitItem[];
};

type PricingSettingsClient = {
  dealerDiscountPercent: number;
  showDealerDiscount: boolean;
  dealerFreeShippingEnabled: boolean;
  premiumFreeShippingEnabled: boolean;
  dealerBenefits: BenefitsBlock;
  premiumBenefits: BenefitsBlock;
};

const DEFAULT_SETTINGS: PricingSettingsClient = {
  dealerDiscountPercent: 0,
  showDealerDiscount: false,
  dealerFreeShippingEnabled: false,
  premiumFreeShippingEnabled: false,
  dealerBenefits: {
    enabled: true,
    titleApply: "Dealer Account Benefits",
    titlePending: "Dealer Account Benefits (Upon Approval)",
    titleActive: "Active Dealer Benefits",
    items: [],
  },
  premiumBenefits: {
    enabled: true,
    titleActive: "Premium Benefits",
    items: [],
  },
};

let cachedSettings: PricingSettingsClient | null = null;
let pendingSettingsRequest: Promise<PricingSettingsClient> | null = null;

const normalizePercent = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, 100);
};

const normalizeBenefitItems = (items: unknown): BenefitItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { text } : null;
      }
      if (!item || typeof item !== "object") return null;
      const text =
        typeof (item as { text?: unknown }).text === "string"
          ? (item as { text: string }).text.trim()
          : "";
      if (!text) return null;
      const enabled =
        typeof (item as { enabled?: unknown }).enabled === "boolean"
          ? (item as { enabled: boolean }).enabled
          : true;
      return { text, enabled };
    })
    .filter((item): item is BenefitItem => Boolean(item));
};

const normalizeBenefitsBlock = (
  input: Partial<BenefitsBlock> | null | undefined,
  fallback: BenefitsBlock
): BenefitsBlock => ({
  enabled:
    typeof input?.enabled === "boolean" ? input.enabled : fallback.enabled,
  titleApply:
    typeof input?.titleApply === "string" && input.titleApply.trim()
      ? input.titleApply.trim()
      : fallback.titleApply,
  titlePending:
    typeof input?.titlePending === "string" && input.titlePending.trim()
      ? input.titlePending.trim()
      : fallback.titlePending,
  titleActive:
    typeof input?.titleActive === "string" && input.titleActive.trim()
      ? input.titleActive.trim()
      : fallback.titleActive,
  items:
    input?.items === undefined
      ? fallback.items
      : normalizeBenefitItems(input.items),
});

const normalizeSettings = (data: Partial<PricingSettingsClient>) => ({
  dealerDiscountPercent: normalizePercent(
    Number(data.dealerDiscountPercent ?? DEFAULT_SETTINGS.dealerDiscountPercent)
  ),
  showDealerDiscount:
    typeof data.showDealerDiscount === "boolean"
      ? data.showDealerDiscount
      : DEFAULT_SETTINGS.showDealerDiscount,
  dealerFreeShippingEnabled:
    typeof data.dealerFreeShippingEnabled === "boolean"
      ? data.dealerFreeShippingEnabled
      : DEFAULT_SETTINGS.dealerFreeShippingEnabled,
  premiumFreeShippingEnabled:
    typeof data.premiumFreeShippingEnabled === "boolean"
      ? data.premiumFreeShippingEnabled
      : DEFAULT_SETTINGS.premiumFreeShippingEnabled,
  dealerBenefits: normalizeBenefitsBlock(
    data.dealerBenefits,
    DEFAULT_SETTINGS.dealerBenefits
  ),
  premiumBenefits: normalizeBenefitsBlock(
    data.premiumBenefits,
    DEFAULT_SETTINGS.premiumBenefits
  ),
});

const fetchPricingSettings = async (): Promise<PricingSettingsClient> => {
  const response = await fetch("/api/pricing-settings", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    return DEFAULT_SETTINGS;
  }

  const data = await response.json();
  return normalizeSettings(data);
};

export const usePricingSettings = () => {
  const [settings, setSettings] = useState<PricingSettingsClient>(() =>
    cachedSettings ?? DEFAULT_SETTINGS
  );

  useEffect(() => {
    let active = true;

    if (cachedSettings) {
      setSettings(cachedSettings);
      return () => {
        active = false;
      };
    }

    const resolve = async () => {
      if (!pendingSettingsRequest) {
        pendingSettingsRequest = fetchPricingSettings()
          .then((value) => {
            cachedSettings = value;
            pendingSettingsRequest = null;
            return value;
          })
          .catch((error) => {
            console.error("Unable to resolve pricing settings:", error);
            pendingSettingsRequest = null;
            return DEFAULT_SETTINGS;
          });
      }

      const value = await pendingSettingsRequest;
      if (active) {
        setSettings(value);
      }
    };

    void resolve();

    return () => {
      active = false;
    };
  }, []);

  return settings;
};
