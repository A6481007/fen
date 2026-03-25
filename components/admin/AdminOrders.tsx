"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Trash2, Eye, Package, Search, ArrowDownUp } from "lucide-react";
import { OrdersSkeleton } from "./SkeletonLoaders";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import OrderDetailsSidebar from "./OrderDetailsSidebar";
import { Order } from "./types";
import { safeApiCall, handleApiError } from "./apiHelpers";
import { useTranslation } from "react-i18next";

const AdminOrders: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [orderStatus, setOrderStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    hasNextPage: false,
    totalPages: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const limit = perPage;

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const rangeStart = (() => {
      const today = new Date();
      switch (dateRangeFilter) {
        case "today":
          return new Date(today.getFullYear(), today.getMonth(), today.getDate());
        case "7d":
          return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        case "30d":
          return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
        case "90d":
          return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
        default:
          return null;
      }
    })();

    const matchesSearch = (order: Order) => {
      if (!normalizedQuery) return true;
      const orderNumber = order.orderNumber?.toLowerCase() || "";
      const customerName = order.customerName?.toLowerCase() || "";
      const email = order.email?.toLowerCase() || "";
      const status = order.status?.toLowerCase() || "";
      const paymentStatus = order.paymentStatus?.toLowerCase() || "";
      const paymentMethod = order.paymentMethod?.toLowerCase() || "";
      const productMatch = order.products?.some((item) =>
        item.product?.name?.toLowerCase().includes(normalizedQuery)
      );
      const addressMatch = order.address
        ? [
            order.address.address,
            order.address.city,
            order.address.state,
            order.address.zip,
          ]
            .filter(Boolean)
            .some((value) =>
              value?.toLowerCase().includes(normalizedQuery)
            )
        : false;

      return (
        orderNumber.includes(normalizedQuery) ||
        customerName.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        status.includes(normalizedQuery) ||
        paymentStatus.includes(normalizedQuery) ||
        paymentMethod.includes(normalizedQuery) ||
        addressMatch ||
        productMatch
      );
    };

    const getOrderDateValue = (order: Order) => {
      const dateValue = order.orderDate
        ? new Date(order.orderDate).getTime()
        : 0;
      return Number.isNaN(dateValue) ? 0 : dateValue;
    };

    const filtered = orders.filter((order) => {
      if (!matchesSearch(order)) return false;

      if (
        paymentStatusFilter !== "all" &&
        (order.paymentStatus || "pending") !== paymentStatusFilter
      ) {
        return false;
      }

      if (
        paymentMethodFilter !== "all" &&
        order.paymentMethod !== paymentMethodFilter
      ) {
        return false;
      }

      if (rangeStart) {
        const orderDate = order.orderDate
          ? new Date(order.orderDate).getTime()
          : 0;
        if (!orderDate || orderDate < rangeStart.getTime()) {
          return false;
        }
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        return getOrderDateValue(a) - getOrderDateValue(b);
      }
      if (sortBy === "total_high") {
        return b.totalPrice - a.totalPrice;
      }
      if (sortBy === "total_low") {
        return a.totalPrice - b.totalPrice;
      }
      if (sortBy === "status") {
        return (a.status || "").localeCompare(b.status || "");
      }
      return getOrderDateValue(b) - getOrderDateValue(a);
    });

    return sorted;
  }, [
    orders,
    searchQuery,
    paymentStatusFilter,
    paymentMethodFilter,
    dateRangeFilter,
    sortBy,
  ]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      orderStatus !== "all" ||
      paymentStatusFilter !== "all" ||
      paymentMethodFilter !== "all" ||
      dateRangeFilter !== "all" ||
      sortBy !== "newest"
  );

  const clearFilters = () => {
    setSearchQuery("");
    setOrderStatus("all");
    setPaymentStatusFilter("all");
    setPaymentMethodFilter("all");
    setDateRangeFilter("all");
    setSortBy("newest");
    setSelectedOrders([]);
  };

  const allVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) => selectedOrders.includes(order._id));

  // Utility functions
  const formatCurrency = (amount: number): string => {
    const locale = i18n.language === "th" ? "th-TH" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const locale = i18n.language === "th" ? "th-TH" : "en-US";
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-success-highlight text-success-base";
      case "delivered":
        return "bg-success-highlight text-success-base";
      case "out_for_delivery":
        return "bg-blue-100 text-blue-800";
      case "ready_for_delivery":
        return "bg-cyan-100 text-cyan-800";
      case "packed":
        return "bg-purple-100 text-purple-800";
      case "order_confirmed":
        return "bg-emerald-100 text-emerald-800";
      case "address_confirmed":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-brand-red-accent/10 text-brand-red-accent";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "failed_delivery":
        return "bg-red-100 text-red-800";
      case "rescheduled":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusLabel = (status: string) =>
    t(`admin.orders.status.${status}`, status.replace(/_/g, " "));

  // Fetch orders
  const fetchOrders = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const statusParam = orderStatus === "all" ? "" : orderStatus;
        const timestamp = Date.now(); // Add timestamp to bust cache
        const url = `/api/admin/orders?limit=${limit}&offset=${
          page * limit
        }&status=${statusParam}&_t=${timestamp}`;

        const data = await safeApiCall(url);

        setOrders(data.orders);
        setPagination({
          totalCount: data.totalCount,
          hasNextPage: data.hasNextPage,
          totalPages: data.pagination.totalPages,
        });
      } catch (error) {
        console.error("Error in fetchOrders:", error);
        handleApiError(error, "Orders fetch");
      } finally {
        setLoading(false);
      }
    },
    [orderStatus, limit]
  );

  // Selection functions
  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (filteredOrders.length === 0) {
      setSelectedOrders([]);
      return;
    }

    const allVisibleSelected = filteredOrders.every((order) =>
      selectedOrders.includes(order._id)
    );

    if (allVisibleSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((order) => order._id));
    }
  }, [filteredOrders, selectedOrders]);

  // Order details functions
  const handleShowOrderDetails = async (order: Order) => {
    setIsSidebarOpen(true);
    setIsLoadingOrderDetails(true);
    setSelectedOrder(null); // Clear previous order

    try {
      // Fetch complete order details from the individual order API
      const response = await fetch(`/api/admin/orders/${order._id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }

      const data = await response.json();
      setSelectedOrder(data.order);
    } catch (error) {
      console.error("Error fetching order details:", error);
      handleApiError(error, "Order details fetch");
      // Fall back to the basic order data from the list
      setSelectedOrder(order);
    } finally {
      setIsLoadingOrderDetails(false);
    }
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedOrder(null);
    setIsLoadingOrderDetails(false);
    // Fetch latest orders when sidebar closes to reflect any updates
    fetchOrders(currentPage);
  };

  const handleOrderUpdate = async (updatedOrderId?: string) => {
    setIsRefreshing(true);
    try {
      // Small delay to ensure Sanity has processed the update
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Refresh orders list from server to ensure consistency
      await fetchOrders(currentPage);

      // Also refresh the selected order details if sidebar is still open
      if (selectedOrder && isSidebarOpen && updatedOrderId) {
        try {
          const timestamp = Date.now();
          const updatedOrderData = await safeApiCall(
            `/api/admin/orders/${updatedOrderId}?_t=${timestamp}`
          );
          if (updatedOrderData?.order) {
            setSelectedOrder(updatedOrderData.order);
          }
        } catch (error) {
          console.error("Error refreshing order details:", error);
        }
      }
    } catch (error) {
      console.error("Error updating orders:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Pagination functions
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedOrders([]); // Clear selections when changing page
  };

  const handlePerPageChange = (newPerPage: string) => {
    setPerPage(parseInt(newPerPage));
    setCurrentPage(0); // Reset to first page
    setSelectedOrders([]);
  };

  // Delete functions
  const openDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteOrders = async () => {
    setIsDeleting(true);
    try {
      const timestamp = Date.now();
      await safeApiCall(`/api/admin/orders?_t=${timestamp}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selectedOrders }),
      });

      // Close dialog and clear selections first
      setIsDeleteDialogOpen(false);
      setSelectedOrders([]);

      // Immediately update local state to remove deleted orders
      setOrders((prevOrders) =>
        prevOrders.filter((order) => !selectedOrders.includes(order._id))
      );

      // Update pagination count
      setPagination((prev) => ({
        ...prev,
        totalCount: Math.max(0, prev.totalCount - selectedOrders.length),
      }));

      // If all orders on current page were deleted, go back to page 0
      const willBeEmpty = selectedOrders.length === orders.length;
      const pageToFetch = willBeEmpty && currentPage > 0 ? 0 : currentPage;

      if (pageToFetch !== currentPage) {
        setCurrentPage(0);
      }

      // Wait a moment for Sanity to propagate changes
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Refresh the orders list to ensure consistency
      await fetchOrders(pageToFetch);
    } catch (error) {
      handleApiError(error, "Orders delete");
    } finally {
      setIsDeleting(false);
    }
  };

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchOrders(currentPage);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchOrders, currentPage]);

  // Effects - Combined to avoid multiple re-renders
  useEffect(() => {
    fetchOrders(currentPage);
  }, [fetchOrders, currentPage]);

  // Reset page when filters change - Combined effect
  useEffect(() => {
    setCurrentPage(0);
    setSelectedOrders([]);
  }, [orderStatus, perPage]);

  return (
    <>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {t("admin.orders.title")}
            </h3>
            <div className="flex items-center gap-2">
            <Select
              value={perPage.toString()}
              onValueChange={handlePerPageChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("admin.orders.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.orders.status.all")}</SelectItem>
                <SelectItem value="pending">{statusLabel("pending")}</SelectItem>
                <SelectItem value="address_confirmed">
                  {statusLabel("address_confirmed")}
                </SelectItem>
                <SelectItem value="order_confirmed">
                  {statusLabel("order_confirmed")}
                </SelectItem>
                <SelectItem value="packed">{statusLabel("packed")}</SelectItem>
                <SelectItem value="ready_for_delivery">
                  {statusLabel("ready_for_delivery")}
                </SelectItem>
                <SelectItem value="out_for_delivery">
                  {statusLabel("out_for_delivery")}
                </SelectItem>
                <SelectItem value="delivered">{statusLabel("delivered")}</SelectItem>
                <SelectItem value="completed">{statusLabel("completed")}</SelectItem>
                <SelectItem value="cancelled">{statusLabel("cancelled")}</SelectItem>
                <SelectItem value="rescheduled">{statusLabel("rescheduled")}</SelectItem>
                <SelectItem value="failed_delivery">
                  {statusLabel("failed_delivery")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleRefresh}
              size="sm"
              disabled={loading || isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || isRefreshing ? "animate-spin" : ""
                }`}
              />
            </Button>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("admin.orders.searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:min-w-[520px]">
              <Select
                value={paymentStatusFilter}
                onValueChange={setPaymentStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.orders.paymentStatusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.orders.paymentStatus.all")}</SelectItem>
                  <SelectItem value="paid">{t("admin.orders.paymentStatus.paid")}</SelectItem>
                  <SelectItem value="pending">{t("admin.orders.paymentStatus.pending")}</SelectItem>
                  <SelectItem value="failed">{t("admin.orders.paymentStatus.failed")}</SelectItem>
                  <SelectItem value="cancelled">{t("admin.orders.paymentStatus.cancelled")}</SelectItem>
                  <SelectItem value="credit_requested">
                    {t("admin.orders.paymentStatus.creditRequested")}
                  </SelectItem>
                  <SelectItem value="credit_approved">
                    {t("admin.orders.paymentStatus.creditApproved")}
                  </SelectItem>
                  <SelectItem value="credit_rejected">
                    {t("admin.orders.paymentStatus.creditRejected")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paymentMethodFilter}
                onValueChange={setPaymentMethodFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.orders.paymentMethodPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.orders.paymentMethod.all")}</SelectItem>
                  <SelectItem value="cash_on_delivery">
                    {t("admin.orders.paymentMethod.cashOnDelivery")}
                  </SelectItem>
                  <SelectItem value="stripe">{t("admin.orders.paymentMethod.stripe")}</SelectItem>
                  <SelectItem value="card">{t("admin.orders.paymentMethod.card")}</SelectItem>
                  <SelectItem value="credit">{t("admin.orders.paymentMethod.credit")}</SelectItem>
                  <SelectItem value="clerk">{t("admin.orders.paymentMethod.clerk")}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={dateRangeFilter}
                onValueChange={setDateRangeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.orders.dateRangePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.orders.dateRange.all")}</SelectItem>
                  <SelectItem value="today">{t("admin.orders.dateRange.today")}</SelectItem>
                  <SelectItem value="7d">{t("admin.orders.dateRange.last7d")}</SelectItem>
                  <SelectItem value="30d">{t("admin.orders.dateRange.last30d")}</SelectItem>
                  <SelectItem value="90d">{t("admin.orders.dateRange.last90d")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <ArrowDownUp className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t("admin.orders.sortPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("admin.orders.sort.newest")}</SelectItem>
                  <SelectItem value="oldest">{t("admin.orders.sort.oldest")}</SelectItem>
                  <SelectItem value="total_high">{t("admin.orders.sort.totalHigh")}</SelectItem>
                  <SelectItem value="total_low">{t("admin.orders.sort.totalLow")}</SelectItem>
                  <SelectItem value="status">{t("admin.orders.sort.status")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t("admin.orders.clearFilters")}
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <OrdersSkeleton />
        ) : (
          <>
            {selectedOrders.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border">
                <span className="text-sm font-medium">
                  {t("admin.orders.selectedCount", {
                    count: selectedOrders.length,
                  })}
                </span>
                <Button
                  onClick={openDeleteDialog}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("admin.orders.deleteSelected")}
                </Button>
              </div>
            )}

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>{t("admin.orders.table.orderNumber")}</TableHead>
                    <TableHead>{t("admin.orders.table.customer")}</TableHead>
                    <TableHead>{t("admin.orders.table.amount")}</TableHead>
                    <TableHead>{t("admin.orders.table.status")}</TableHead>
                    <TableHead>{t("admin.orders.table.payment")}</TableHead>
                    <TableHead>{t("admin.orders.table.date")}</TableHead>
                    <TableHead>{t("admin.orders.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-12 w-12 text-gray-400" />
                          <p className="text-lg font-medium text-gray-900">
                            {t("admin.orders.empty.title")}
                          </p>
                          <p className="text-sm text-gray-500">
                            {hasActiveFilters
                              ? t("admin.orders.empty.filtered")
                              : orderStatus !== "all"
                              ? t("admin.orders.empty.status", {
                                  status: statusLabel(orderStatus),
                                })
                              : t("admin.orders.empty.default")}
                          </p>
                          {hasActiveFilters && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={clearFilters}
                            >
                              {t("admin.orders.clearFilters")}
                            </Button>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {t("admin.orders.empty.total", {
                              count: pagination.totalCount,
                            })}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.includes(order._id)}
                            onCheckedChange={() =>
                              toggleOrderSelection(order._id)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{order.customerName}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(order.totalPrice)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(order.status)}>
                              {statusLabel(order.status)}
                            </Badge>
                            {(order as any).cancellationRequested && (
                              <Badge className="bg-brand-red-accent/10 text-brand-red-accent text-xs">
                                {t("admin.orders.cancellationPending")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium capitalize">
                            {t(
                              `admin.orders.paymentMethod.${order.paymentMethod}`,
                              order.paymentMethod.replace(/_/g, " ")
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {t(
                              `admin.orders.paymentStatus.${order.paymentStatus || "pending"}`,
                              (order.paymentStatus || "pending").replace(/_/g, " ")
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.orderDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShowOrderDetails(order)}
                              title={t("admin.orders.showDetails")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t("admin.orders.pagination.summary", {
                  showing: filteredOrders.length,
                  total: pagination.totalCount,
                })}
                {hasActiveFilters && orders.length > 0
                  ? ` ${t("admin.orders.pagination.filtered", {
                      count: orders.length,
                    })}`
                  : ""}
                {currentPage > 0
                  ? ` ${t("admin.orders.pagination.page", {
                      page: currentPage + 1,
                      pages: Math.max(1, pagination.totalPages),
                    })}`
                  : ""}
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  variant="outline"
                >
                  {t("admin.orders.pagination.previous")}
                </Button>
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  variant="outline"
                >
                  {t("admin.orders.pagination.next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteOrders}
        title={t("admin.orders.deleteTitle")}
        description={t("admin.orders.deleteDescription", {
          count: selectedOrders.length,
        })}
        itemCount={selectedOrders.length}
        isLoading={isDeleting}
      />

      {/* Order Details Sidebar */}
      <OrderDetailsSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        order={selectedOrder}
        onOrderUpdate={handleOrderUpdate}
        isLoading={isLoadingOrderDetails}
      />
    </>
  );
};

export default AdminOrders;
