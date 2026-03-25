import { unstable_cache } from "next/cache";
import { client as sanityClient } from "@/sanity/lib/client";
import { getPricingSettings } from "@/sanity/queries";

const normalizeTaxRate = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1 ? value / 100 : value;
};

const resolveEnvTaxRate = () =>
  normalizeTaxRate(parseFloat(process.env.TAX_AMOUNT || "0") || 0);

const fetchPurchaseOrderVatPercent = async () => {
  try {
    const data = await sanityClient.fetch<{ vatPercent?: number } | null>(
      `*[_type == "purchaseOrderSettings"][0]{ vatPercent }`
    );
    return typeof data?.vatPercent === "number" ? data.vatPercent : undefined;
  } catch (error) {
    console.error("Failed to load purchase order VAT percent:", error);
    return undefined;
  }
};

const fetchPricingVatPercent = async () => {
  try {
    const settings = await getPricingSettings();
    return typeof settings?.vatPercent === "number"
      ? settings.vatPercent
      : undefined;
  } catch (error) {
    console.error("Failed to load pricing VAT percent:", error);
    return undefined;
  }
};

const resolveTaxRate = async () => {
  const purchaseVat = await fetchPurchaseOrderVatPercent();
  if (Number.isFinite(purchaseVat)) {
    return normalizeTaxRate(purchaseVat);
  }

  const pricingVat = await fetchPricingVatPercent();
  if (Number.isFinite(pricingVat)) {
    return normalizeTaxRate(pricingVat);
  }

  return resolveEnvTaxRate();
};

const getTaxRate = unstable_cache(resolveTaxRate, ["tax-rate"], {
  revalidate: 300,
});

export { getTaxRate };
