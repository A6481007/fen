"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

type PromotionAnalyticsNoticeProps = {
  kind: "notFound" | "inactive";
  isPromotion?: boolean;
};

export function PromotionAnalyticsNotice({
  kind,
  isPromotion = true,
}: PromotionAnalyticsNoticeProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
      {kind === "notFound" ? (
        <>
          {t("admin.promotions.analytics.notices.unavailable")}{" "}
          <Link href="/admin/marketing/promotions" className="underline">
            {t("admin.promotions.analytics.notices.backToPromotions")}
          </Link>{" "}
          <span className="text-slate-400">|</span>{" "}
          <Link href="/admin/marketing/deals" className="underline">
            {t("admin.promotions.analytics.notices.backToDeals")}
          </Link>
        </>
      ) : (
        <>
          {t("admin.promotions.analytics.notices.activeOrScheduledOnly")}{" "}
          <Link
            href={isPromotion ? "/admin/marketing/promotions" : "/admin/marketing/deals"}
            className="underline"
          >
            {isPromotion
              ? t("admin.promotions.analytics.notices.backToPromotions")
              : t("admin.promotions.analytics.notices.backToDeals")}
          </Link>
        </>
      )}
    </div>
  );
}

export default PromotionAnalyticsNotice;
