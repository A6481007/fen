"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  RefreshCw,
  UserCheck,
  Crown,
  Building2,
  LayoutDashboard,
  Inbox,
  Star,
  Megaphone,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardOverviewSkeleton } from "@/components/admin/SkeletonLoaders";
import Link from "next/link";
import { BANNERS_ENABLED } from "@/lib/featureFlags";
import { normalizePath } from "@/lib/nav-active";
import {
  type BackofficeRole,
  type BackofficePermission,
} from "@/config/authz";
import {
  defaultFeatureFlags,
  type FeatureFlagsState,
} from "@/config/nav-config";
import { getAdminQuickActions, type QuickAction } from "@/lib/admin/quickActions";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
  usersChange: number;
  productsChange: number;
}

interface AccountRequestsSummary {
  pendingPremiumCount: number;
  pendingBusinessCount: number;
  totalPendingRequests: number;
  recentRequests: number;
}

interface AdminDashboardOverviewProps {
  isAdmin?: boolean;
  staffRoles?: BackofficeRole[];
  permissions?: BackofficePermission[];
  featureFlags?: FeatureFlagsState;
}

const AdminDashboardOverview = ({
  isAdmin = false,
  staffRoles = [],
  permissions = [],
  featureFlags = defaultFeatureFlags,
}: AdminDashboardOverviewProps) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accountRequests, setAccountRequests] =
    useState<AccountRequestsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);
  const [queueCounts, setQueueCounts] = useState<{
    pendingOrders: number | null;
    pendingAccountRequests: number | null;
    unreadContacts: number | null;
    pendingReviews: number | null;
    promotionsEnding: number | null;
    bannersSwitching: number | null;
  }>({
    pendingOrders: null,
    pendingAccountRequests: null,
    unreadContacts: null,
    pendingReviews: null,
    promotionsEnding: null,
    bannersSwitching: null,
  });
  const [queueErrors, setQueueErrors] = useState<Partial<Record<string, string>>>({});

  const fetchStatsBundle = async () => {
    const [statsResponse, requestsResponse] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/account-requests-summary"),
    ]);

    if (!statsResponse.ok || !requestsResponse.ok) {
      throw new Error(
        `HTTP error! stats: ${statsResponse.status}, requests: ${requestsResponse.status}`
      );
    }

    const [statsData, requestsData] = await Promise.all([
      statsResponse.json(),
      requestsResponse.json(),
    ]);

    if (statsData.error || requestsData.error) {
      throw new Error(statsData.error || requestsData.error);
    }

    return { statsData, requestsData };
  };

  const fetchQueueData = async () => {
    const errors: Partial<Record<string, string>> = {};

    const safeJson = async (promise: Promise<Response>) => {
      const res = await promise;
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    };

    let pendingReviews: number | null = null;
    try {
      const data = await safeJson(fetch("/api/admin/reviews?status=pending", { cache: "no-store" }));
      pendingReviews = Array.isArray(data) ? data.length : Array.isArray(data?.reviews) ? data.reviews.length : data?.total ?? null;
    } catch (_err) {
      errors.pendingReviews = t("admin.dashboardOverview.queue.errors.pendingReviews");
      pendingReviews = null;
    }

    let pendingOrders: number | null = null;
    try {
      const data = await safeJson(fetch("/api/admin/orders?status=pending&limit=1", { cache: "no-store" }));
      pendingOrders = typeof data?.totalCount === "number" ? data.totalCount : null;
    } catch (_err) {
      errors.pendingOrders = t("admin.dashboardOverview.queue.errors.pendingOrders");
      pendingOrders = null;
    }

    const promotionsEnding = 0;
    const unreadContacts = 0;
    const bannersSwitching =
      featureFlags.banners || BANNERS_ENABLED ? 0 : null;

    return {
      counts: {
        pendingOrders,
        pendingAccountRequests: null,
        unreadContacts,
        pendingReviews,
        promotionsEnding,
        bannersSwitching,
      },
      errors,
    };
  };

  const fetchDashboard = async () => {
    try {
      setError(null);
      setQueueErrors({});
      setLoading(true);

      const [statsBundle, queueBundle] = await Promise.allSettled([
        fetchStatsBundle(),
        fetchQueueData(),
      ]);

      if (statsBundle.status === "fulfilled") {
        setStats(statsBundle.value.statsData);
        setAccountRequests(statsBundle.value.requestsData);
      } else {
        throw statsBundle.reason;
      }

      if (queueBundle.status === "fulfilled") {
        setQueueCounts({
          ...queueBundle.value.counts,
          pendingAccountRequests:
            statsBundle.status === "fulfilled"
              ? statsBundle.value.requestsData?.totalPendingRequests ?? queueBundle.value.counts.pendingAccountRequests
              : queueBundle.value.counts.pendingAccountRequests,
        });
        setQueueErrors(queueBundle.value.errors);
      } else {
        setQueueCounts((prev) => ({
          pendingOrders: prev.pendingOrders ?? null,
          pendingAccountRequests:
            statsBundle.status === "fulfilled"
              ? statsBundle.value.requestsData?.totalPendingRequests ?? null
              : prev.pendingAccountRequests ?? null,
          unreadContacts: prev.unreadContacts ?? 0,
          pendingReviews: prev.pendingReviews ?? null,
          promotionsEnding: prev.promotionsEnding ?? 0,
          bannersSwitching: prev.bannersSwitching ?? (featureFlags.banners || BANNERS_ENABLED ? 0 : null),
        }));
        setQueueErrors({ general: t("admin.dashboardOverview.queue.errors.general") });
      }
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError(
        err instanceof Error
          ? err.message
          : t("admin.dashboardOverview.errors.fetchFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("adminRecentRoutes");
      if (!stored) return;
      const parsed = JSON.parse(stored) as string[];
      const sanitized = parsed.map(normalizePath).filter(Boolean).slice(0, 8);
      setRecentHrefs(sanitized);
    } catch {
      setRecentHrefs([]);
    }
  }, []);

  const statCards = [
    {
      titleKey: "admin.dashboardOverview.stats.totalRevenue",
      value: stats?.totalRevenue || 0,
      change: stats?.revenueChange || 0,
      icon: DollarSign,
      format: "currency",
      color: "from-green-500 to-emerald-600",
      href: "/admin/analytics",
    },
    {
      titleKey: "admin.dashboardOverview.stats.totalOrders",
      value: stats?.totalOrders || 0,
      change: stats?.ordersChange || 0,
      icon: ShoppingCart,
      format: "number",
      color: "from-blue-500 to-cyan-600",
      href: "/admin/orders",
    },
    {
      titleKey: "admin.dashboardOverview.stats.totalUsers",
      value: stats?.totalUsers || 0,
      change: stats?.usersChange || 0,
      icon: Users,
      format: "number",
      color: "from-purple-500 to-pink-600",
      href: "/admin/users",
    },
    {
      titleKey: "admin.dashboardOverview.stats.totalProducts",
      value: stats?.totalProducts || 0,
      change: stats?.productsChange || 0,
      icon: Package,
      format: "number",
      color: "from-orange-500 to-red-600",
      href: "/admin/products",
    },
  ];

  type QueueCard = {
    titleKey: string;
    descriptionKey: string;
    value: number | string | null;
    href: string;
    icon: React.ElementType;
    tone: "info" | "alert" | "success";
    featureFlagged?: boolean;
    errorKey?: string;
  };

  const queueCards: QueueCard[] = [
    {
      titleKey: "admin.dashboardOverview.queue.orders.title",
      descriptionKey: "admin.dashboardOverview.queue.orders.description",
      value: queueCounts.pendingOrders,
      href: "/admin/orders",
      icon: ShoppingCart,
      tone: "info",
      errorKey: "pendingOrders",
    },
    {
      titleKey: "admin.dashboardOverview.queue.pendingRequests.title",
      descriptionKey: "admin.dashboardOverview.queue.pendingRequests.description",
      value: queueCounts.pendingAccountRequests,
      href: "/admin/account-requests",
      icon: UserCheck,
      tone: "alert",
      errorKey: "pendingAccountRequests",
    },
    {
      titleKey: "admin.dashboardOverview.queue.contacts.title",
      descriptionKey: "admin.dashboardOverview.queue.contacts.description",
      value: queueCounts.unreadContacts,
      href: "/admin/comms/contacts",
      icon: Inbox,
      tone: "info",
      errorKey: "unreadContacts",
    },
    {
      titleKey: "admin.dashboardOverview.queue.reviews.title",
      descriptionKey: "admin.dashboardOverview.queue.reviews.description",
      value: queueCounts.pendingReviews,
      href: "/admin/reviews",
      icon: Star,
      tone: "info",
      errorKey: "pendingReviews",
    },
    {
      titleKey: "admin.dashboardOverview.queue.promotions.title",
      descriptionKey: "admin.dashboardOverview.queue.promotions.description",
      value: queueCounts.promotionsEnding,
      href: "/admin/promotions",
      icon: Megaphone,
      tone: "alert",
      errorKey: "promotionsEnding",
    },
    {
      titleKey: "admin.dashboardOverview.queue.banners.title",
      descriptionKey: "admin.dashboardOverview.queue.banners.description",
      value: queueCounts.bannersSwitching,
      href: "/admin/marketing/banners",
      icon: LayoutDashboard,
      tone: "info",
      featureFlagged: true,
      errorKey: "bannersSwitching",
    },
  ]
    .filter((card) =>
      card.featureFlagged ? featureFlags.banners || BANNERS_ENABLED : true
    ) as QueueCard[];

  const quickActions: QuickAction[] = useMemo(
    () =>
      getAdminQuickActions({
        isAdmin,
        staffRoles,
        permissions,
        featureFlags,
        limit: 12,
      }),
    [featureFlags, isAdmin, permissions, staffRoles]
  );
  const quickActionTitleMap: Record<string, string> = {
    Analytics: "admin.dashboardOverview.quickActions.items.analytics",
    "Account Requests":
      "admin.dashboardOverview.quickActions.items.accountRequests",
    Orders: "admin.dashboardOverview.quickActions.items.orders",
    Users: "admin.dashboardOverview.quickActions.items.users",
    Products: "admin.dashboardOverview.quickActions.items.products",
    Promotions: "admin.dashboardOverview.quickActions.items.promotions",
    Deals: "admin.dashboardOverview.quickActions.items.deals",
    Insights: "admin.dashboardOverview.quickActions.items.insights",
    News: "admin.dashboardOverview.quickActions.items.news",
    Events: "admin.dashboardOverview.quickActions.items.events",
    Catalogs: "admin.dashboardOverview.quickActions.items.catalogs",
    Downloads: "admin.dashboardOverview.quickActions.items.downloads",
    Reviews: "admin.dashboardOverview.quickActions.items.reviews",
    "Contact Inbox":
      "admin.dashboardOverview.quickActions.items.contactInbox",
    Subscriptions: "admin.dashboardOverview.quickActions.items.subscriptions",
  };
  const translateQuickActionTitle = (title: string) =>
    t(quickActionTitleMap[title] || title);

  const directorySections = [
    {
      titleKey: "admin.dashboardOverview.directory.section.content",
      items: [
        {
          labelKey: "admin.dashboardOverview.directory.links.manageInsights",
          href: "/admin/content/insights",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.createInsight",
          href: "/admin/content/insights/new",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.catalogs",
          href: "/admin/content/catalogs",
        },
      ],
    },
    {
      titleKey: "admin.dashboardOverview.directory.section.marketing",
      items: [
        {
          labelKey: "admin.dashboardOverview.directory.links.promotions",
          href: "/admin/marketing/promotions",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.deals",
          href: "/admin/marketing/deals",
        },
        ...(BANNERS_ENABLED
          ? [
              {
                labelKey: "admin.dashboardOverview.directory.links.banners",
                href: "/admin/marketing/banners",
              },
            ]
          : []),
      ],
    },
    {
      titleKey: "admin.dashboardOverview.directory.section.operations",
      items: [
        {
          labelKey: "admin.dashboardOverview.directory.links.orders",
          href: "/admin/orders",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.reviews",
          href: "/admin/reviews",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.products",
          href: "/admin/products",
        },
      ],
    },
    {
      titleKey: "admin.dashboardOverview.directory.section.accounts",
      items: [
        {
          labelKey: "admin.dashboardOverview.directory.links.users",
          href: "/admin/users",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.accountRequests",
          href: "/admin/account-requests",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.employees",
          href: "/admin/employees",
        },
      ],
    },
    {
      titleKey: "admin.dashboardOverview.directory.section.communications",
      items: [
        {
          labelKey: "admin.dashboardOverview.directory.links.contacts",
          href: "/admin/comms/contacts",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.notifications",
          href: "/admin/notifications",
        },
        {
          labelKey: "admin.dashboardOverview.directory.links.subscriptions",
          href: "/admin/subscriptions",
        },
      ],
    },
  ];

  const formatValue = (value: number, format: string) => {
    if (format === "currency") {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  const deriveRecentLabel = (href: string) => {
    const parts = href.split("/").filter(Boolean);
    const tail = parts[parts.length - 1] || href;
    return tail.replace(/[-_]/g, " ");
  };

  if (loading) {
    return <DashboardOverviewSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t("admin.dashboardOverview.errors.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchDashboard} className="bg-red-600 hover:bg-red-700">
              {t("admin.dashboardOverview.errors.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-3">
          <h1 className="md:text-3xl font-bold text-brand-black-strong flex items-center gap-3">
            <Activity className="w-8 h-8 text-brand-text-main" />
            {t("admin.dashboardOverview.title")}
          </h1>
          <Button onClick={fetchDashboard} variant="outline" size="sm" className="ml-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("admin.dashboardOverview.refresh")}
          </Button>
        </div>
        <p className="text-brand-text-muted text-sm md:text-lg">
          {t("admin.dashboardOverview.subtitle")}
        </p>
      </div>

      {/* Row 1: Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;

          return (
            <motion.div
              key={stat.titleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link href={stat.href}>
                <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-brand-text-main/20 hover:border-brand-text-main/40 overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-brand-text-muted flex items-center justify-between">
                      {t(stat.titleKey)}
                      <Icon className="w-4 h-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold text-brand-black-strong">
                      {formatValue(stat.value, stat.format)}
                    </div>
                    <div className="flex items-center gap-2">
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4 text-success-base" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                      <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                        {isPositive ? "+" : ""}
                        {stat.change}%
                      </Badge>
                      <span className="text-xs text-brand-text-muted">
                        {t("admin.dashboardOverview.vsLastMonth")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Row 2: Action Required queue */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-black-strong">
              {t("admin.dashboardOverview.actionRequired.title")}
            </h2>
            <p className="text-sm text-brand-text-muted">
              {t("admin.dashboardOverview.actionRequired.subtitle")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchDashboard}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("admin.dashboardOverview.refresh")}
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {queueCards.map((card, idx) => {
            const Icon = card.icon;
            const isNumber = typeof card.value === "number";
            const description =
              (card.errorKey ? queueErrors[card.errorKey] : undefined) ??
              t(card.descriptionKey);
            const toneClass =
              card.tone === "alert"
                ? "bg-red-50 border-red-100"
                : card.tone === "success"
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-slate-50 border-slate-100";

            return (
              <motion.div
                key={card.titleKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
              >
                <Link href={card.href}>
                  <Card className={`h-full border transition hover:shadow-lg ${toneClass}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-9 w-9 rounded-lg bg-white text-brand-black-strong flex items-center justify-center shadow-sm">
                            <Icon className="h-4 w-4" />
                          </span>
                          <p className="font-semibold text-brand-black-strong">
                            {t(card.titleKey)}
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-brand-text-muted" />
                      </div>
                      <div className="text-xl font-semibold text-brand-black-strong">
                        {isNumber
                          ? card.value
                          : t("admin.dashboardOverview.queue.emptyValue")}
                      </div>
                      <p className="text-sm text-brand-text-muted">{description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Today / Next 7 days */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-brand-text-main/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-brand-black-strong">
              <Calendar className="w-5 h-5 text-brand-text-main" />
              {t("admin.dashboardOverview.schedule.title")}
            </CardTitle>
            <p className="text-sm text-brand-text-muted">
              {t("admin.dashboardOverview.schedule.subtitle")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
              {t("admin.dashboardOverview.schedule.empty")}
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-text-main/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-brand-black-strong">
              <Clock className="w-5 h-5 text-brand-text-main" />
              {t("admin.dashboardOverview.publishing.title")}
            </CardTitle>
            <p className="text-sm text-brand-text-muted">
              {t("admin.dashboardOverview.publishing.subtitle")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
              {t("admin.dashboardOverview.publishing.empty")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Requests Summary */}
      {accountRequests && accountRequests.totalPendingRequests > 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-brand-black-strong mb-2">
              {t("admin.dashboardOverview.accountRequests.title")}
            </h2>
            <p className="text-brand-text-muted">
              {t("admin.dashboardOverview.accountRequests.subtitle")}
            </p>
          </div>

          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-900 mb-1">
                    {accountRequests.pendingPremiumCount}
                  </div>
                  <p className="text-sm text-amber-700">
                    {t("admin.dashboardOverview.accountRequests.premium")}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mb-1">
                    {accountRequests.pendingBusinessCount}
                  </div>
                  <p className="text-sm text-blue-700">
                    {t("admin.dashboardOverview.accountRequests.dealer")}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-success-base mb-1">
                    {accountRequests.recentRequests}
                  </div>
                  <p className="text-sm text-success-base">
                    {t("admin.dashboardOverview.accountRequests.thisWeek")}
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link href="/admin/account-requests">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    <UserCheck className="w-4 h-4 mr-2" />
                    {t("admin.dashboardOverview.accountRequests.cta")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row 4: Quick Actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-black-strong">
            {t("admin.dashboardOverview.quickActions.title")}
          </h2>
          <span className="text-xs text-brand-text-muted">
            {t("admin.dashboardOverview.quickActions.autoDerived")}
          </span>
        </div>
        {quickActions.length === 0 ? (
          <div className="text-sm text-brand-text-muted">
            {t("admin.dashboardOverview.quickActions.empty")}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                >
                  <Link href={action.href}>
                    <Card className="h-full border-slate-200 hover:border-brand-text-main/40 hover:shadow-md transition">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-brand-text-main/10 text-brand-black-strong flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-brand-black-strong truncate">
                            {translateQuickActionTitle(action.title)}
                          </p>
                          <span className="text-xs text-brand-text-muted">
                            {t("admin.dashboardOverview.quickActions.instant")}
                          </span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-brand-text-muted ml-auto" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 5: Pinned & Recent */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-black-strong">
            {t("admin.dashboardOverview.recent.title")}
          </h2>
          <span className="text-xs text-brand-text-muted">
            {t("admin.dashboardOverview.recent.subtitle", { count: 8 })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {recentHrefs.length > 0 ? (
            recentHrefs.map((href) => (
              <Link key={href} href={href}>
                <Badge
                  variant="secondary"
                  className="px-3 py-2 text-sm bg-slate-100 hover:bg-brand-text-main/10 text-brand-black-strong"
                >
                  {deriveRecentLabel(href)}
                </Badge>
              </Link>
            ))
          ) : (
            <div className="text-sm text-brand-text-muted">
              {t("admin.dashboardOverview.recent.empty")}
            </div>
          )}
        </div>
      </div>

      {/* Row 6: Collapsed directory accordion */}
      <div className="space-y-2">
        <details className="rounded-lg border border-slate-200 bg-white" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-brand-black-strong flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-brand-text-main" />
            {t("admin.dashboardOverview.directory.title")}
          </summary>
          <div className="grid gap-4 px-4 pb-4 md:grid-cols-2 lg:grid-cols-3">
            {directorySections.map((section) => (
              <div key={section.titleKey} className="space-y-2">
                <p className="text-xs uppercase tracking-[0.08em] text-brand-text-muted">
                  {t(section.titleKey)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {section.items.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Badge
                        variant="outline"
                        className="text-sm border-slate-200 hover:border-brand-text-main hover:text-brand-black-strong"
                      >
                        {t(link.labelKey)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default AdminDashboardOverview;
