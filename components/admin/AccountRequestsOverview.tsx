import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface AccountRequestsOverviewProps {
  stats: {
    totalPremiumRequests: number;
    totalBusinessRequests: number;
    pendingPremiumRequests: number;
    pendingBusinessRequests: number;
    approvedPremiumRequests: number;
    approvedBusinessRequests: number;
    rejectedPremiumRequests: number;
    rejectedBusinessRequests: number;
  };
}

export default function AccountRequestsOverview({
  stats,
}: AccountRequestsOverviewProps) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Premium Requests Overview */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-amber-800">
            {t("admin.accountRequestsOverview.premium.title")}
          </CardTitle>
          <Crown className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold text-amber-900">
            {stats.totalPremiumRequests}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700">
                {t("admin.accountRequestsOverview.labels.pending")}
              </span>
              <Badge
                variant="secondary"
                className="bg-amber-200 text-amber-800 text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                {stats.pendingPremiumRequests}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700">
                {t("admin.accountRequestsOverview.labels.approved")}
              </span>
              <Badge className="bg-success-highlight text-success-base text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {stats.approvedPremiumRequests}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700">
                {t("admin.accountRequestsOverview.labels.rejected")}
              </span>
              <Badge
                variant="destructive"
                className="bg-red-100 text-red-800 text-xs"
              >
                <XCircle className="w-3 h-3 mr-1" />
                {stats.rejectedPremiumRequests}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dealer Requests Overview */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-blue-800">
            {t("admin.accountRequestsOverview.dealer.title")}
          </CardTitle>
          <Building2 className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold text-blue-900">
            {stats.totalBusinessRequests}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-700">
                {t("admin.accountRequestsOverview.labels.pending")}
              </span>
              <Badge
                variant="secondary"
                className="bg-blue-200 text-blue-800 text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                {stats.pendingBusinessRequests}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-700">
                {t("admin.accountRequestsOverview.labels.approved")}
              </span>
              <Badge className="bg-success-highlight text-success-base text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {stats.approvedBusinessRequests}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-700">
                {t("admin.accountRequestsOverview.labels.rejected")}
              </span>
              <Badge
                variant="destructive"
                className="bg-red-100 text-red-800 text-xs"
              >
                <XCircle className="w-3 h-3 mr-1" />
                {stats.rejectedBusinessRequests}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Benefits Info */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 sm:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("admin.accountRequestsOverview.benefits.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-purple-900 text-sm">
                  {t("admin.accountRequestsOverview.benefits.premiumTitle")}
                </span>
              </div>
              <ul className="text-xs text-purple-700 space-y-1 pl-1">
                <li>
                  • {t("admin.accountRequestsOverview.benefits.premiumItem1")}
                </li>
                <li>
                  • {t("admin.accountRequestsOverview.benefits.premiumItem2")}
                </li>
                <li>
                  • {t("admin.accountRequestsOverview.benefits.premiumItem3")}
                </li>
                <li>
                  • {t("admin.accountRequestsOverview.benefits.premiumItem4")}
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-purple-900 text-sm">
                  {t("admin.accountRequestsOverview.benefits.dealerTitle")}
                </span>
              </div>
              <ul className="text-xs text-purple-700 space-y-1 pl-1">
                <li>
                  • {t("admin.accountRequestsOverview.benefits.dealerItem1")}
                </li>
                <li>
                  • {t("admin.accountRequestsOverview.benefits.dealerItem2")}
                </li>
                <li>
                  • {t("admin.accountRequestsOverview.benefits.dealerItem3")}
                </li>
                <li>
                  • {t("admin.accountRequestsOverview.benefits.dealerItem4")}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
