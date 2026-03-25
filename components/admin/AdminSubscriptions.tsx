"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Trash2,
  Search,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  X,
  RefreshCw,
  Copy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Subscription {
  _id: string;
  email: string;
  status: "active" | "unsubscribed" | "pending";
  subscribedAt: string;
  unsubscribedAt?: string;
  source: string;
  ipAddress?: string;
}

export default function AdminSubscriptions() {
  const { t, i18n } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<
    Subscription[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] =
    useState<Subscription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const locale = i18n.language === "th" ? "th-TH" : "en-US";

  // Fetch subscriptions
  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // Filter subscriptions
  useEffect(() => {
    let filtered = subscriptions;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((sub) =>
        sub.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((sub) => sub.source === sourceFilter);
    }

    setFilteredSubscriptions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, statusFilter, sourceFilter, subscriptions]);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/subscriptions");
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      } else {
        toast.error(t("admin.subscriptions.toast.fetchFailed"));
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error(t("admin.subscriptions.toast.loadFailed"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    toast.info(t("admin.subscriptions.toast.refreshing"));
    await fetchSubscriptions();
    toast.success(t("admin.subscriptions.toast.refreshed"));
  };

  const handleCleanupDuplicates = async () => {
    if (
      !confirm(
        t("admin.subscriptions.confirmCleanup")
      )
    ) {
      return;
    }

    toast.info(t("admin.subscriptions.toast.cleaning"));
    try {
      const response = await fetch(
        "/api/admin/subscriptions/cleanup-duplicates",
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(
          t("admin.subscriptions.toast.cleaned", {
            removed: data.duplicatesRemoved,
            found: data.duplicatesFound,
          })
        );
        await fetchSubscriptions(); // Refresh the list
      } else {
        toast.error(t("admin.subscriptions.toast.cleanupFailed"));
      }
    } catch (error) {
      console.error("Error cleaning up duplicates:", error);
      toast.error(t("admin.subscriptions.toast.cleanupFailed"));
    }
  };

  const handleDeleteClick = (subscription: Subscription) => {
    setSubscriptionToDelete(subscription);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!subscriptionToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/subscriptions/${subscriptionToDelete._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success(t("admin.subscriptions.toast.deleted"));
        setSubscriptions((prev) =>
          prev.filter((sub) => sub._id !== subscriptionToDelete._id)
        );
        setDeleteDialogOpen(false);
        setSubscriptionToDelete(null);
      } else {
        const data = await response.json();
        toast.error(data.error || t("admin.subscriptions.toast.deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast.error(t("admin.subscriptions.toast.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      [
        t("admin.subscriptions.csv.email"),
        t("admin.subscriptions.csv.status"),
        t("admin.subscriptions.csv.source"),
        t("admin.subscriptions.csv.subscribedAt"),
        t("admin.subscriptions.csv.ipAddress"),
      ],
      ...filteredSubscriptions.map((sub) => [
        sub.email,
        t(`admin.subscriptions.status.${sub.status}`, sub.status),
        t(`admin.subscriptions.sources.${sub.source}`, sub.source),
        new Date(sub.subscribedAt).toLocaleString(locale),
        sub.ipAddress || t("admin.subscriptions.na"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(t("admin.subscriptions.toast.exported"));
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSubscriptions = filteredSubscriptions.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-success-base">
            {t("admin.subscriptions.status.active")}
          </Badge>
        );
      case "unsubscribed":
        return (
          <Badge variant="secondary">
            {t("admin.subscriptions.status.unsubscribed")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            {t("admin.subscriptions.status.pending")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      footer: "bg-blue-500",
      popup: "bg-purple-500",
      checkout: "bg-brand-red-accent",
      other: "bg-gray-500",
    };
    return (
      <Badge className={colors[source] || "bg-gray-500"}>
        {t(`admin.subscriptions.sources.${source}`, source)}
      </Badge>
    );
  };

  // Get unique sources for filter
  const uniqueSources = Array.from(
    new Set(subscriptions.map((sub) => sub.source))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-8 w-8 text-brand-black-strong" />
            {t("admin.subscriptions.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("admin.subscriptions.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCleanupDuplicates}
            variant="outline"
            className="text-brand-red-accent hover:text-brand-red-accent hover:bg-orange-50"
          >
            <Copy className="h-4 w-4 mr-2" />
            {t("admin.subscriptions.removeDuplicates")}
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            />
            {t("admin.subscriptions.refresh")}
          </Button>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t("admin.subscriptions.exportCsv")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>
              {t("admin.subscriptions.stats.total")}
            </CardDescription>
            <CardTitle className="text-3xl">{subscriptions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>
              {t("admin.subscriptions.stats.active")}
            </CardDescription>
            <CardTitle className="text-3xl text-success-base">
              {subscriptions.filter((s) => s.status === "active").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>
              {t("admin.subscriptions.stats.unsubscribed")}
            </CardDescription>
            <CardTitle className="text-3xl text-gray-600">
              {subscriptions.filter((s) => s.status === "unsubscribed").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>
              {t("admin.subscriptions.stats.thisMonth")}
            </CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {
                subscriptions.filter((s) => {
                  const subDate = new Date(s.subscribedAt);
                  const now = new Date();
                  return (
                    subDate.getMonth() === now.getMonth() &&
                    subDate.getFullYear() === now.getFullYear()
                  );
                }).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("admin.subscriptions.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t("admin.subscriptions.filters.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.subscriptions.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.subscriptions.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.subscriptions.status.active")}
                </SelectItem>
                <SelectItem value="unsubscribed">
                  {t("admin.subscriptions.status.unsubscribed")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("admin.subscriptions.status.pending")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.subscriptions.filters.source")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.subscriptions.filters.allSources")}
                </SelectItem>
                {uniqueSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {t(`admin.subscriptions.sources.${source}`, source)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin.subscriptions.subscribersTitle", {
              count: filteredSubscriptions.length,
            })}
          </CardTitle>
          <CardDescription>
            {isLoading ? (
              t("admin.subscriptions.loading")
            ) : (
              <>
                {t("admin.subscriptions.showing", {
                  start: Math.min(
                    filteredSubscriptions.length,
                    indexOfFirstItem + 1
                  ),
                  end: Math.min(
                    indexOfLastItem,
                    filteredSubscriptions.length
                  ),
                  total: filteredSubscriptions.length,
                })}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-10 ml-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold text-gray-900">
                        {t("admin.subscriptions.table.email")}
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900">
                        {t("admin.subscriptions.table.status")}
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900">
                        {t("admin.subscriptions.table.source")}
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900">
                        {t("admin.subscriptions.table.subscribedAt")}
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-900">
                        {t("admin.subscriptions.table.ipAddress")}
                      </th>
                      <th className="text-right p-4 font-semibold text-gray-900">
                        {t("admin.subscriptions.table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSubscriptions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center p-8 text-gray-500"
                        >
                          {t("admin.subscriptions.empty")}
                        </td>
                      </tr>
                    ) : (
                      currentSubscriptions.map((subscription) => (
                        <tr
                          key={subscription._id}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">
                                {subscription.email}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(subscription.status)}
                          </td>
                          <td className="p-4">
                            {getSourceBadge(subscription.source)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              {new Date(
                                subscription.subscribedAt
                              ).toLocaleDateString(locale)}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {subscription.ipAddress || t("admin.subscriptions.na")}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(subscription)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {t("admin.subscriptions.pagination.page", {
                      page: currentPage,
                      pages: totalPages,
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      {t("admin.subscriptions.pagination.previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      {t("admin.subscriptions.pagination.next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
            )}
          >
            <VisuallyHidden.Root>
              <DialogTitle>
                {t("admin.subscriptions.delete.confirmTitle")}
              </DialogTitle>
            </VisuallyHidden.Root>
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border-4 border-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {t("admin.subscriptions.delete.title")}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {t("admin.subscriptions.delete.description", {
                    email: subscriptionToDelete?.email,
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="flex-1 border-gray-300 hover:bg-gray-50 font-medium"
              >
                {t("admin.subscriptions.delete.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500 font-semibold shadow-lg hover:shadow-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting
                  ? t("admin.subscriptions.delete.deleting")
                  : t("admin.subscriptions.delete.action")}
              </Button>
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">
                {t("admin.subscriptions.delete.close")}
              </span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
