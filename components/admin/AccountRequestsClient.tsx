"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import {
  Crown,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import AccountRequestsOverview from "@/components/admin/AccountRequestsOverview";

interface UserRequest {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  premiumStatus: string;
  businessStatus: string;
  premiumAppliedAt?: string;
  businessAppliedAt?: string;
  premiumApprovedAt?: string;
  businessApprovedAt?: string;
  rejectionReason?: string;
}

const ApprovedAccountsTable = ({
  premiumAccounts,
  businessAccounts,
  setCancelDialog,
}: {
  premiumAccounts: UserRequest[];
  businessAccounts: UserRequest[];
  setCancelDialog: (dialog: {
    isOpen: boolean;
    userId: string;
    type: "premium" | "business";
    userEmail: string;
  }) => void;
}) => {
  const { t } = useTranslation();
  const accountTypeLabels = {
    premium: t("admin.accountRequests.accountType.premium"),
    business: t("admin.accountRequests.accountType.dealer"),
  };
  const allApprovedAccounts = [
    ...premiumAccounts.map((account) => ({
      ...account,
      accountType: "premium" as const,
    })),
    ...businessAccounts.map((account) => ({
      ...account,
      accountType: "business" as const,
    })),
  ].sort((a, b) => {
    const dateA =
      a.accountType === "premium" ? a.premiumApprovedAt : a.businessApprovedAt;
    const dateB =
      b.accountType === "premium" ? b.premiumApprovedAt : b.businessApprovedAt;
    return new Date(dateB || "").getTime() - new Date(dateA || "").getTime();
  });

  if (allApprovedAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("admin.accountRequests.approved.emptyTitle")}
          </h3>
          <p className="text-gray-600 text-center">
            {t("admin.accountRequests.approved.emptySubtitle")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="w-5 h-5 text-success-base" />
          {t("admin.accountRequests.approved.title", {
            count: allApprovedAccounts.length,
          })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="font-semibold">
                  {t("admin.accountRequests.table.user")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("admin.accountRequests.table.accountType")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("admin.accountRequests.table.approvedDate")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("admin.accountRequests.table.status")}
                </TableHead>
                <TableHead className="font-semibold text-center">
                  {t("admin.accountRequests.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allApprovedAccounts.map((account) => {
                const approvedAt =
                  account.accountType === "premium"
                    ? account.premiumApprovedAt
                    : account.businessApprovedAt;

                return (
                  <TableRow
                    key={`${account._id}-${account.accountType}`}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            account.accountType === "premium"
                              ? "bg-amber-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {account.accountType === "premium" ? (
                            <Crown className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Building2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {account.firstName} {account.lastName}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {account.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge
                        className={
                          account.accountType === "premium"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {account.accountType === "premium" ? (
                          <Crown className="w-3 h-3 mr-1" />
                        ) : (
                          <Building2 className="w-3 h-3 mr-1" />
                        )}
                        {accountTypeLabels[account.accountType]}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4">
                      {approvedAt ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(approvedAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge className="bg-success-highlight text-success-base border-success-highlight">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t("admin.accountRequests.status.active")}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex gap-2 justify-center">
                        <Button
                          onClick={() => {
                            setCancelDialog({
                              isOpen: true,
                              userId: account._id,
                              type: account.accountType,
                              userEmail: account.email,
                            });
                          }}
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          {t("admin.accountRequests.actions.cancel")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {allApprovedAccounts.map((account) => {
            const approvedAt =
              account.accountType === "premium"
                ? account.premiumApprovedAt
                : account.businessApprovedAt;

            return (
              <Card
                key={`${account._id}-${account.accountType}`}
                className="border border-gray-200"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        account.accountType === "premium"
                          ? "bg-amber-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {account.accountType === "premium" ? (
                        <Crown className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Building2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {account.firstName} {account.lastName}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{account.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      <div className="text-gray-600">
                        {t("admin.accountRequests.labels.accountType")}
                      </div>
                      <Badge
                        className={
                          account.accountType === "premium"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                        }
                      >
                        {account.accountType === "premium" ? (
                          <Crown className="w-3 h-3 mr-1" />
                        ) : (
                          <Building2 className="w-3 h-3 mr-1" />
                        )}
                        {accountTypeLabels[account.accountType]}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-gray-600">
                        {t("admin.accountRequests.labels.approved")}
                      </div>
                      <div className="text-sm">
                        {approvedAt
                          ? new Date(approvedAt).toLocaleDateString()
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge className="bg-success-highlight text-success-base border-success-highlight">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t("admin.accountRequests.status.active")}
                    </Badge>
                    <Button
                      onClick={() => {
                        setCancelDialog({
                          isOpen: true,
                          userId: account._id,
                          type: account.accountType,
                          userEmail: account.email,
                        });
                      }}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      {t("admin.accountRequests.actions.cancel")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const RequestTable = ({
  users,
  type,
  handleApprove,
  setRejectDialog,
  actionLoading,
  getStatusBadge,
}: {
  users: UserRequest[];
  type: "premium" | "business";
  handleApprove: (userId: string, type: "premium" | "business") => void;
  setRejectDialog: (dialog: {
    isOpen: boolean;
    userId: string;
    type: "premium" | "business";
    userEmail: string;
  }) => void;
  actionLoading: string | null;
  getStatusBadge: (
    status: string,
    type: "premium" | "business"
  ) => React.ReactNode;
}) => {
  const { t } = useTranslation();
  const typeLabel = t(
    `admin.accountRequests.accountType.${type === "premium" ? "premium" : "dealer"}`
  );
  if (users.length === 0) {
    const Icon = type === "premium" ? Crown : Building2;
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Icon className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("admin.accountRequests.requests.emptyTitle", { type: typeLabel })}
          </h3>
          <p className="text-gray-600 text-center">
            {t("admin.accountRequests.requests.emptySubtitle", {
              type: typeLabel,
            })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          {type === "premium" ? (
            <Crown className="w-5 h-5 text-amber-600" />
          ) : (
            <Building2 className="w-5 h-5 text-blue-600" />
          )}
          {t("admin.accountRequests.requests.title", { type: typeLabel })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="font-semibold">
                  {t("admin.accountRequests.table.user")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("admin.accountRequests.table.appliedDate")}
                </TableHead>
                <TableHead className="font-semibold">
                  {t("admin.accountRequests.table.status")}
                </TableHead>
                <TableHead className="font-semibold text-center">
                  {t("admin.accountRequests.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const status =
                  type === "premium" ? user.premiumStatus : user.businessStatus;
                const appliedAt =
                  type === "premium"
                    ? user.premiumAppliedAt
                    : user.businessAppliedAt;

                return (
                  <TableRow
                    key={user._id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            type === "premium" ? "bg-amber-100" : "bg-blue-100"
                          }`}
                        >
                          {type === "premium" ? (
                            <Crown className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Building2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {appliedAt ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {t("admin.accountRequests.labels.applied", {
                            date: new Date(appliedAt).toLocaleDateString(),
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      {getStatusBadge(status, type)}
                      {status === "rejected" && user.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs max-w-xs">
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-red-700 line-clamp-2">
                              {user.rejectionReason}
                            </span>
                          </div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      {status === "pending" && (
                        <div className="flex gap-2 justify-center flex-wrap">
                          <Button
                            onClick={() => handleApprove(user._id, type)}
                            disabled={actionLoading === user._id}
                            size="sm"
                            className="bg-success-base hover:bg-success-base text-white"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {actionLoading === user._id
                              ? t("admin.accountRequests.actions.working")
                              : t("admin.accountRequests.actions.approve")}
                          </Button>
                          <Button
                            onClick={() =>
                              setRejectDialog({
                                isOpen: true,
                                userId: user._id,
                                type,
                                userEmail: user.email,
                              })
                            }
                            disabled={actionLoading === user._id}
                            variant="destructive"
                            size="sm"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {t("admin.accountRequests.actions.reject")}
                          </Button>
                        </div>
                      )}
                      {status !== "pending" && (
                        <div className="text-center text-sm text-gray-500">
                          {t("admin.accountRequests.actions.none")}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {users.map((user) => {
            const status =
              type === "premium" ? user.premiumStatus : user.businessStatus;
            const appliedAt =
              type === "premium"
                ? user.premiumAppliedAt
                : user.businessAppliedAt;

            return (
              <Card key={user._id} className="border border-gray-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        type === "premium" ? "bg-amber-100" : "bg-blue-100"
                      }`}
                    >
                      {type === "premium" ? (
                        <Crown className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Building2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                    {getStatusBadge(status, type)}
                  </div>

                  {appliedAt && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {t("admin.accountRequests.labels.applied", {
                        date: new Date(appliedAt).toLocaleDateString(),
                      })}
                    </div>
                  )}

                  {status === "rejected" && user.rejectionReason && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <div className="flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-red-700">
                          {user.rejectionReason}
                        </span>
                      </div>
                    </div>
                  )}

                  {status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleApprove(user._id, type)}
                        disabled={actionLoading === user._id}
                        size="sm"
                        className="flex-1 bg-success-base hover:bg-success-base text-white"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {actionLoading === user._id
                          ? t("admin.accountRequests.actions.working")
                          : t("admin.accountRequests.actions.approve")}
                      </Button>
                      <Button
                        onClick={() =>
                          setRejectDialog({
                            isOpen: true,
                            userId: user._id,
                            type,
                            userEmail: user.email,
                          })
                        }
                        disabled={actionLoading === user._id}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        {t("admin.accountRequests.actions.reject")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default function AccountRequestsClient() {
  const { t } = useTranslation();
  const getAccountTypeLabel = (type: "premium" | "business") =>
    t(
      `admin.accountRequests.accountType.${
        type === "premium" ? "premium" : "dealer"
      }`
    );
  const [premiumRequests, setPremiumRequests] = useState<UserRequest[]>([]);
  const [businessRequests, setBusinessRequests] = useState<UserRequest[]>([]);
  const [approvedPremiumAccounts, setApprovedPremiumAccounts] = useState<
    UserRequest[]
  >([]);
  const [approvedBusinessAccounts, setApprovedBusinessAccounts] = useState<
    UserRequest[]
  >([]);
  const [allUsers, setAllUsers] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    userId: string;
    type: "premium" | "business";
    userEmail: string;
  }>({
    isOpen: false,
    userId: "",
    type: "premium",
    userEmail: "",
  });
  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean;
    userId: string;
    type: "premium" | "business";
    userEmail: string;
  }>({
    isOpen: false,
    userId: "",
    type: "premium",
    userEmail: "",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const rejectTypeLabel = getAccountTypeLabel(rejectDialog.type);
  const cancelTypeLabel = getAccountTypeLabel(cancelDialog.type);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/admin/account-requests?t=${timestamp}`,
        {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setPremiumRequests(data.premiumRequests || []);
        setBusinessRequests(data.businessRequests || []);
        setApprovedPremiumAccounts(data.approvedPremiumAccounts || []);
        setApprovedBusinessAccounts(data.approvedBusinessAccounts || []);
        setAllUsers(data.allUsers || []);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error(t("admin.accountRequests.toast.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (
    userId: string,
    type: "premium" | "business"
  ) => {
    try {
      setActionLoading(userId);
      const response = await fetch("/api/admin/approve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setTimeout(async () => {
          setRefreshing(true);
          toast.info(t("admin.accountRequests.toast.updating"), {
            duration: 1000,
          });
          await fetchRequests();
          setRefreshing(false);
        }, 500);
      } else {
        const error = await response.json();
        toast.error(
          error.message ?? t("admin.accountRequests.toast.approveFailed")
        );
      }
    } catch (error) {
      console.error("Error approving account:", error);
      toast.error(t("admin.accountRequests.toast.approveFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(t("admin.accountRequests.toast.rejectReasonRequired"));
      return;
    }

    try {
      setActionLoading(rejectDialog.userId);
      const response = await fetch("/api/admin/reject-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: rejectDialog.userId,
          type: rejectDialog.type,
          reason: rejectReason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setRejectDialog({
          isOpen: false,
          userId: "",
          type: "premium",
          userEmail: "",
        });
        setRejectReason("");
        setTimeout(async () => {
          setRefreshing(true);
          toast.info(t("admin.accountRequests.toast.updating"), {
            duration: 1000,
          });
          await fetchRequests();
          setRefreshing(false);
        }, 500);
      } else {
        const error = await response.json();
        toast.error(
          error.message ?? t("admin.accountRequests.toast.rejectFailed")
        );
      }
    } catch (error) {
      console.error("Error rejecting account:", error);
      toast.error(t("admin.accountRequests.toast.rejectFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error(t("admin.accountRequests.toast.cancelReasonRequired"));
      return;
    }

    try {
      setActionLoading(cancelDialog.userId);
      const response = await fetch("/api/admin/cancel-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: cancelDialog.userId,
          type: cancelDialog.type,
          reason: cancelReason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setCancelDialog({
          isOpen: false,
          userId: "",
          type: "premium",
          userEmail: "",
        });
        setCancelReason("");
        setTimeout(async () => {
          setRefreshing(true);
          toast.info(t("admin.accountRequests.toast.updating"), {
            duration: 1000,
          });
          await fetchRequests();
          setRefreshing(false);
        }, 500);
      } else {
        const error = await response.json();
        toast.error(
          error.message ?? t("admin.accountRequests.toast.cancelFailed")
        );
      }
    } catch (error) {
      console.error("Error cancelling account:", error);
      toast.error(t("admin.accountRequests.toast.cancelFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, type: "premium" | "business") => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-800 border-amber-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            {t("admin.accountRequests.status.pending")}
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-success-highlight text-success-base border-success-highlight">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("admin.accountRequests.status.active")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-800 border-red-200"
          >
            <XCircle className="w-3 h-3 mr-1" />
            {t("admin.accountRequests.status.rejected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    totalPremiumRequests: allUsers.filter((u) => u.premiumStatus !== "none")
      .length,
    totalBusinessRequests: allUsers.filter((u) => u.businessStatus !== "none")
      .length,
    pendingPremiumRequests: premiumRequests.length,
    pendingBusinessRequests: businessRequests.length,
    approvedPremiumRequests: allUsers.filter(
      (u) => u.premiumStatus === "active"
    ).length,
    approvedBusinessRequests: allUsers.filter(
      (u) => u.businessStatus === "active"
    ).length,
    rejectedPremiumRequests: allUsers.filter(
      (u) => u.premiumStatus === "rejected"
    ).length,
    rejectedBusinessRequests: allUsers.filter(
      (u) => u.businessStatus === "rejected"
    ).length,
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("admin.accountRequests.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("admin.accountRequests.subtitle")}
          </p>
        </div>
        <Button
          onClick={fetchRequests}
          variant="outline"
          disabled={loading || refreshing}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${
              loading || refreshing ? "animate-spin" : ""
            }`}
          />
          {refreshing
            ? t("admin.accountRequests.refreshing")
            : t("admin.accountRequests.refresh")}
        </Button>
      </div>

      <AccountRequestsOverview stats={stats} />

      <Tabs defaultValue="premium" className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-3">
          <TabsTrigger value="premium" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            {t("admin.accountRequests.tabs.premium", {
              count: premiumRequests.length,
            })}
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {t("admin.accountRequests.tabs.dealer", {
              count: businessRequests.length,
            })}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {t("admin.accountRequests.approved.title", {
              count:
                approvedPremiumAccounts.length + approvedBusinessAccounts.length,
            })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="premium" className="space-y-4">
          <RequestTable
            users={premiumRequests}
            type="premium"
            handleApprove={handleApprove}
            setRejectDialog={setRejectDialog}
            actionLoading={actionLoading}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <RequestTable
            users={businessRequests}
            type="business"
            handleApprove={handleApprove}
            setRejectDialog={setRejectDialog}
            actionLoading={actionLoading}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <ApprovedAccountsTable
            premiumAccounts={approvedPremiumAccounts}
            businessAccounts={approvedBusinessAccounts}
            setCancelDialog={setCancelDialog}
          />
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({
              isOpen: false,
              userId: "",
              type: "premium",
              userEmail: "",
            });
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.accountRequests.rejectDialog.title", {
                type: rejectTypeLabel,
              })}
            </DialogTitle>
            <DialogDescription>
              {t("admin.accountRequests.rejectDialog.description", {
                email: rejectDialog.userEmail,
                type: rejectTypeLabel,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder={t("admin.accountRequests.rejectDialog.placeholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({
                  isOpen: false,
                  userId: "",
                  type: "premium",
                  userEmail: "",
                });
                setRejectReason("");
              }}
            >
              {t("admin.accountRequests.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={
                !rejectReason.trim() || actionLoading === rejectDialog.userId
              }
            >
              {actionLoading === rejectDialog.userId
                ? t("admin.accountRequests.rejectDialog.rejecting")
                : t("admin.accountRequests.rejectDialog.action")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCancelDialog({
              isOpen: false,
              userId: "",
              type: "premium",
              userEmail: "",
            });
            setCancelReason("");
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
            )}
          >
            <VisuallyHidden.Root>
              <DialogTitle>
                {t("admin.accountRequests.cancelDialog.confirmTitle", {
                  type: cancelTypeLabel,
                })}
              </DialogTitle>
            </VisuallyHidden.Root>
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border-4 border-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {t("admin.accountRequests.cancelDialog.title", {
                    type: cancelTypeLabel,
                  })}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("admin.accountRequests.cancelDialog.description", {
                    email: cancelDialog.userEmail,
                    type: cancelTypeLabel,
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder={t("admin.accountRequests.cancelDialog.placeholder")}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialog({
                    isOpen: false,
                    userId: "",
                    type: "premium",
                    userEmail: "",
                  });
                  setCancelReason("");
                }}
                className="min-w-[80px]"
              >
                {t("admin.accountRequests.actions.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={
                  !cancelReason.trim() || actionLoading === cancelDialog.userId
                }
                className="min-w-[120px] bg-red-600 hover:bg-red-700"
              >
                {actionLoading === cancelDialog.userId ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t("admin.accountRequests.cancelDialog.cancelling")}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {t("admin.accountRequests.cancelDialog.action")}
                  </div>
                )}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
