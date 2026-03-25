"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import {
  User,
  Calendar,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface PremiumAccount {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  premiumStatus: string;
  premiumAppliedAt?: string;
  premiumApprovedBy?: string;
  premiumApprovedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  membershipType: string;
}

export default function PremiumAccountsAdmin() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [accounts, setAccounts] = useState<PremiumAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPremiumAccounts();
  }, []);

  const fetchPremiumAccounts = async () => {
    try {
      const response = await fetch("/api/admin/premium-accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else {
        toast.error(t("client.userAdmin.premiumAccounts.toast.fetchFailed"));
      }
    } catch (error) {
      console.error("Error fetching premium accounts:", error);
      toast.error(t("client.userAdmin.premiumAccounts.toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (
    accountId: string,
    approve: boolean,
    reason?: string
  ) => {
    setProcessing(accountId);
    try {
      const response = await fetch("/api/admin/premium-accounts/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          approve,
          adminEmail: user?.emailAddresses?.[0]?.emailAddress,
          reason,
        }),
      });

      if (response.ok) {
        toast.success(
          t("client.userAdmin.premiumAccounts.toast.updated", {
            status: approve
              ? t("client.userAdmin.premiumAccounts.status.approved")
              : t("client.userAdmin.premiumAccounts.status.rejected"),
          })
        );
        fetchPremiumAccounts(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.error ||
            t("client.userAdmin.premiumAccounts.toast.updateFailed")
        );
      }
    } catch (error) {
      console.error("Error updating premium account:", error);
      toast.error(t("client.userAdmin.premiumAccounts.toast.updateFailed"));
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (account: PremiumAccount) => {
    switch (account.premiumStatus) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("client.userAdmin.premiumAccounts.status.active")}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            {t("client.userAdmin.premiumAccounts.status.pending")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {t("client.userAdmin.premiumAccounts.status.rejected")}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
            <User className="w-3 h-3 mr-1" />
            {t("client.userAdmin.premiumAccounts.status.none")}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t("client.userAdmin.premiumAccounts.title")}
        </h1>
        <p className="text-gray-600">
          {t("client.userAdmin.premiumAccounts.subtitle")}
        </p>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("client.userAdmin.premiumAccounts.empty.title")}
            </h3>
            <p className="text-gray-500">
              {t("client.userAdmin.premiumAccounts.empty.subtitle")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card
              key={account._id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Crown className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {account.firstName && account.lastName
                          ? `${account.firstName} ${account.lastName}`
                          : account.email}
                      </CardTitle>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {account.email}
                        </div>
                        {account.premiumAppliedAt && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {t("client.userAdmin.premiumAccounts.applied")}{" "}
                            {new Date(
                              account.premiumAppliedAt
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(account)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      {t("client.userAdmin.premiumAccounts.membership.label")}{" "}
                      <span className="font-medium capitalize">
                        {account.membershipType}
                      </span>
                    </p>
                    {account.premiumApprovedBy && (
                      <p className="text-sm text-gray-600">
                        {t("client.userAdmin.premiumAccounts.processedBy")}{" "}
                        <span className="font-medium">
                          {account.premiumApprovedBy}
                        </span>
                      </p>
                    )}
                    {account.premiumApprovedAt && (
                      <p className="text-sm text-gray-600">
                        {t("client.userAdmin.premiumAccounts.processedAt")}{" "}
                        <span className="font-medium">
                          {new Date(
                            account.premiumApprovedAt
                          ).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                    {account.rejectionReason && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {t("client.userAdmin.premiumAccounts.reason")}{" "}
                        {account.rejectionReason}
                      </p>
                    )}
                  </div>

                  {account.premiumStatus === "pending" && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleApproval(
                            account._id,
                            false,
                            t(
                              "client.userAdmin.premiumAccounts.rejectionReason.default"
                            )
                          )
                        }
                        disabled={processing === account._id}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t("client.userAdmin.premiumAccounts.actions.reject")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproval(account._id, true)}
                        disabled={processing === account._id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t("client.userAdmin.premiumAccounts.actions.approve")}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
