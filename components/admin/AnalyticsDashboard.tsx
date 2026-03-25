// Analytics Dashboard Component for viewing comprehensive e-commerce analytics
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  Users,
  RefreshCw,
  Award,
  Heart,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface BestSeller {
  productId: string;
  name: string;
  category: string;
  salesCount: number;
  revenue: number;
  imageUrl: string | null;
}

interface AnalyticsData {
  bestSellers: BestSeller[];
  analytics: {
    timeframe: string;
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    averageOrderValue: number;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState("monthly");

  const fetchAnalytics = async (selectedTimeframe: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/best-sellers?timeframe=${selectedTimeframe}&limit=10`
      );
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t("admin.analytics.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("admin.analytics.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t("admin.analytics.weekly")}</SelectItem>
              <SelectItem value="monthly">{t("admin.analytics.monthly")}</SelectItem>
              <SelectItem value="yearly">{t("admin.analytics.yearly")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => fetchAnalytics(timeframe)}
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.analytics.totalRevenue")}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.analytics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("admin.analytics.timeframeRevenue", {
                  timeframe: t(`admin.analytics.timeframe.${timeframe}`),
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.analytics.totalOrders")}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.analytics.totalOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("admin.analytics.timeframeOrders", {
                  timeframe: t(`admin.analytics.timeframe.${timeframe}`),
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.analytics.avgOrderValue")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.analytics.averageOrderValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("admin.analytics.perOrderAverage")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.analytics.productsSold")}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.bestSellers.reduce((sum, p) => sum + p.salesCount, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("admin.analytics.totalUnitsSold")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Best Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t("admin.analytics.bestSellingProducts", {
              timeframe: t(`admin.analytics.timeframe.${timeframe}`),
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : data?.bestSellers.length ? (
            <div className="space-y-4">
              {data.bestSellers.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full font-bold">
                    {index + 1}
                  </div>

                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.category}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(product.revenue)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("admin.analytics.unitsSold", {
                        count: product.salesCount,
                      })}
                    </div>
                  </div>

                  <Badge variant="secondary">#{index + 1}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.analytics.noSalesData")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
