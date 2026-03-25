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
  Building2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface BusinessAccount {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isBusiness: boolean;
  businessApprovedBy?: string;
  businessApprovedAt?: string;
  createdAt: string;
  membershipType: string;
}

export default function BusinessAccountsAdmin() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessAccounts();
  }, []);

  const fetchBusinessAccounts = async () => {
    try {
      const response = await fetch("/api/admin/business-accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else {
        toast.error(t("client.userAdmin.businessAccounts.toast.fetchFailed"));
      }
    } catch (error) {
      console.error("Error fetching dealer accounts:", error);
      toast.error(t("client.userAdmin.businessAccounts.toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (accountId: string, approve: boolean) => {
    setProcessing(accountId);
    try {
      const response = await fetch("/api/admin/business-accounts/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          approve,
          adminEmail: user?.emailAddresses?.[0]?.emailAddress,
        }),
      });

      if (response.ok) {
        toast.success(
          t("client.userAdmin.businessAccounts.toast.updated", {
            status: approve
              ? t("client.userAdmin.businessAccounts.status.approved")
              : t("client.userAdmin.businessAccounts.status.rejected"),
          })
        );
        fetchBusinessAccounts(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.error ||
            t("client.userAdmin.businessAccounts.toast.updateFailed")
        );
      }
    } catch (error) {
      console.error("Error updating dealer account:", error);
      toast.error(t("client.userAdmin.businessAccounts.toast.updateFailed"));
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (account: BusinessAccount) => {
    if (account.isBusiness && account.businessApprovedBy) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t("client.userAdmin.businessAccounts.status.approved")}
        </Badge>
      );
    } else if (account.isBusiness) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          {t("client.userAdmin.businessAccounts.status.pending")}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
          <User className="w-3 h-3 mr-1" />
          {t("client.userAdmin.businessAccounts.status.regular")}
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
          {t("client.userAdmin.businessAccounts.title")}
        </h1>
        <p className="text-gray-600">
          {t("client.userAdmin.businessAccounts.subtitle")}
        </p>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("client.userAdmin.businessAccounts.empty.title")}
            </h3>
            <p className="text-gray-500">
              {t("client.userAdmin.businessAccounts.empty.subtitle")}
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
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
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
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {t("client.userAdmin.businessAccounts.joined")}{" "}
                          {new Date(account.createdAt).toLocaleDateString()}
                        </div>
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
                      {t("client.userAdmin.businessAccounts.membership.label")}{" "}
                      <span className="font-medium capitalize">
                        {account.membershipType === "business"
                          ? t(
                              "client.userAdmin.businessAccounts.membership.dealer"
                            )
                          : account.membershipType}
                      </span>
                    </p>
                    {account.businessApprovedBy && (
                      <p className="text-sm text-gray-600">
                        {t("client.userAdmin.businessAccounts.approvedBy")}{" "}
                        <span className="font-medium">
                          {account.businessApprovedBy}
                        </span>
                      </p>
                    )}
                    {account.businessApprovedAt && (
                      <p className="text-sm text-gray-600">
                        {t("client.userAdmin.businessAccounts.approvedOn")}{" "}
                        <span className="font-medium">
                          {new Date(
                            account.businessApprovedAt
                          ).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                  </div>

                  {account.isBusiness && !account.businessApprovedBy && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproval(account._id, false)}
                        disabled={processing === account._id}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t("client.userAdmin.businessAccounts.actions.reject")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproval(account._id, true)}
                        disabled={processing === account._id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t("client.userAdmin.businessAccounts.actions.approve")}
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
