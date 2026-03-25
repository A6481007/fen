import type { PromotionAnalytics } from "@/lib/promotions/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type PromotionAnalyticsBarProps = {
  analytics?: PromotionAnalytics | null;
  showPublicStats?: boolean;
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function PromotionAnalyticsBar({ analytics, showPublicStats = false }: PromotionAnalyticsBarProps) {
  if (!showPublicStats) return null;

  const impressions = analytics?.impressions ?? 0;
  const clicks = analytics?.clicks ?? 0;
  const addToCarts = analytics?.addToCarts ?? 0;
  const conversions = analytics?.conversions ?? 0;
  const revenue = analytics?.totalRevenue ?? 0;
  const discount = analytics?.totalDiscountSpent ?? 0;
  const conversionRate = analytics?.conversionRate ?? 0;
  const averageOrderValue = analytics?.averageOrderValue ?? 0;

  const metrics = [
    { label: "Views", value: impressions.toLocaleString(), accent: "text-blue-600" },
    { label: "Clicks", value: clicks.toLocaleString(), accent: "text-emerald-600" },
    { label: "Add to Cart", value: addToCarts.toLocaleString(), accent: "text-orange-600" },
    { label: "Conversions", value: conversions.toLocaleString(), accent: "text-purple-600" },
    { label: "Conv. Rate", value: formatPercent(conversionRate), accent: "text-indigo-600" },
    { label: "Avg. Order", value: `$${averageOrderValue.toFixed(2)}`, accent: "text-teal-600" },
    { label: "Revenue", value: `$${revenue.toFixed(2)}`, accent: "text-green-700" },
    { label: "Discount Spent", value: `$${discount.toFixed(2)}`, accent: "text-red-600" },
  ];

  return (
    <Card className="border border-gray-100 bg-white/80 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live performance</p>
            <p className="text-base font-semibold text-gray-900">Campaign snapshot</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Live
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {metric.label}
              </p>
              <p className={`text-lg font-bold ${metric.accent}`}>{metric.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PromotionAnalyticsBar;
