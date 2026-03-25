import Link from "next/link";

import { Button } from "@/components/ui/button";

type InsightCTAProps = {
  ctaType: "contact" | "rfq" | "product" | "pdf";
  label: string;
  href?: string;
  variant?: "default" | "outline" | "secondary";
  solutionId?: string;
  products?: Array<{
    product?: {
      _id?: string | null;
      sku?: string | null;
      name?: string | null;
    } | null;
  }> | null;
  insightId?: string;
  insightSlug?: string;
  insightTitle?: string;
  locale?: string;
  kind?: "solutions" | "knowledge";
  productSkus?: string[];
};

const buildFallbackHref = ({
  ctaType,
  href,
  insightSlug,
  insightTitle,
}: Pick<InsightCTAProps, "ctaType" | "href" | "insightSlug" | "insightTitle">) => {
  if (href) return href;
  if (ctaType === "rfq") {
    const subject = encodeURIComponent(insightTitle ? `Quote request: ${insightTitle}` : "Quote request");
    const ref = insightSlug ? `&ref=${encodeURIComponent(insightSlug)}` : "";
    return `/contact?subject=${subject}${ref}`;
  }
  return "/contact";
};

const InsightCTA = ({
  ctaType,
  label,
  href,
  variant = "default",
  insightSlug,
  insightTitle,
}: InsightCTAProps) => {
  const resolvedHref = buildFallbackHref({
    ctaType,
    href,
    insightSlug,
    insightTitle,
  });

  return (
    <Button asChild variant={variant} className="rounded-full">
      <Link href={resolvedHref}>{label}</Link>
    </Button>
  );
};

export default InsightCTA;
