"use client";

import { useState, useEffect } from "react";
import { Employee } from "@/types/employee";
import { getOrdersForEmployee } from "@/actions/orderEmployeeActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Package,
  RefreshCw,
  Eye,
  CheckCircle,
  MapPin,
  Clock,
  CreditCard,
  ArrowDownUp,
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import OrderDetailSheet from "./OrderDetailSheet";
import { useTranslation } from "react-i18next";

interface OrdersListProps {
  employee: Employee;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone?: string;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderDate: string;
  address: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  products: Array<{
    quantity: number;
    product: {
      _id: string;
      name: string;
      price: number;
      image?: string;
    };
  }>;
  addressConfirmedBy?: string;
  addressConfirmedAt?: string;
  orderConfirmedBy?: string;
  orderConfirmedAt?: string;
  packedBy?: string;
  packedAt?: string;
  assignedDeliverymanId?: string;
  assignedDeliverymanName?: string;
  deliveredBy?: string;
  deliveredAt?: string;
  cashCollected?: boolean;
  cashCollectedAmount?: number;
  paymentReceivedBy?: string;
  paymentReceivedAt?: string;
}

export default function OrdersList({ employee }: OrdersListProps) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [quickFilter, setQuickFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const loadOrders = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsRefreshing(true);
      }
      const data = await getOrdersForEmployee();
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      if (showLoader) {
        setIsRefreshing(false);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(false); // Don't show loader on initial load
  }, []);

  useEffect(() => {
    let filtered = orders;

    // Tab filter (Pending = not confirmed, Confirmed = confirmed)
    if (activeTab === "pending") {
      filtered = filtered.filter((order) => !order.orderConfirmedBy);
    } else if (activeTab === "confirmed") {
      filtered = filtered.filter((order) => !!order.orderConfirmedBy);
    }

    // Search filter
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      filtered = filtered.filter((order) => {
        const productMatch = order.products?.some((item) =>
          item.product?.name?.toLowerCase().includes(normalizedQuery)
        );
        return (
          order.orderNumber.toLowerCase().includes(normalizedQuery) ||
          order.customerName.toLowerCase().includes(normalizedQuery) ||
          order.email.toLowerCase().includes(normalizedQuery) ||
          order.phone?.toLowerCase().includes(normalizedQuery) ||
          order.status.toLowerCase().includes(normalizedQuery) ||
          order.paymentStatus.toLowerCase().includes(normalizedQuery) ||
          order.paymentMethod.toLowerCase().includes(normalizedQuery) ||
          order.address?.address?.toLowerCase().includes(normalizedQuery) ||
          order.address?.city?.toLowerCase().includes(normalizedQuery) ||
          productMatch
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.paymentStatus === paymentStatusFilter
      );
    }

    if (paymentMethodFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.paymentMethod === paymentMethodFilter
      );
    }

    if (dateRangeFilter !== "all") {
      const today = new Date();
      const rangeStart = (() => {
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

      if (rangeStart) {
        filtered = filtered.filter((order) => {
          const orderDate = order.orderDate
            ? new Date(order.orderDate).getTime()
            : 0;
          return orderDate && orderDate >= rangeStart.getTime();
        });
      }
    }

    if (quickFilter !== "all") {
      filtered = filtered.filter((order) => {
        switch (quickFilter) {
          case "address_pending":
            return !order.addressConfirmedBy;
          case "confirmation_needed":
            return !!order.addressConfirmedBy && !order.orderConfirmedBy;
          case "payment_attention":
            return !["paid", "credit_approved"].includes(
              order.paymentStatus
            );
          default:
            return true;
        }
      });
    }

    const getOrderDateValue = (order: Order) => {
      const dateValue = order.orderDate
        ? new Date(order.orderDate).getTime()
        : 0;
      return Number.isNaN(dateValue) ? 0 : dateValue;
    };

    const statusPriority: Record<string, number> = {
      quotation_requested: 0,
      pending: 1,
      address_confirmed: 2,
      order_confirmed: 3,
      processing: 4,
      packed: 5,
      ready_for_delivery: 6,
      out_for_delivery: 7,
      shipped: 8,
      delivered: 9,
      cancelled: 10,
      failed_delivery: 11,
      rescheduled: 12,
    };

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
        return (
          (statusPriority[a.status] ?? 99) -
          (statusPriority[b.status] ?? 99)
        );
      }
      return getOrderDateValue(b) - getOrderDateValue(a);
    });

    setFilteredOrders(sorted);
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    searchQuery,
    statusFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    dateRangeFilter,
    quickFilter,
    sortBy,
    orders,
    activeTab,
  ]);

  const handleRefresh = async () => {
    await loadOrders(true); // Show loader when manually refreshing
  };

  const handleOrderUpdate = async (
    shouldSwitchToConfirmed = false,
    shouldCloseSheet = false
  ) => {
    const currentOrderId = selectedOrder?._id;

    // First, load the latest orders
    await loadOrders(true);

    // Then perform UI updates after data is loaded
    if (shouldCloseSheet) {
      setSelectedOrder(null); // Only close the sheet when order is confirmed
    } else if (currentOrderId) {
      // Keep the sheet open but update the selected order with fresh data
      // We'll update this in the next effect after orders are loaded
    }

    // Switch to confirmed tab AFTER orders are loaded
    if (shouldSwitchToConfirmed) {
      // Use setTimeout to ensure state updates after orders are processed
      setTimeout(() => {
        setActiveTab("confirmed");
      }, 100);
    }
  };

  // Update selected order when orders change (to reflect latest data in sidebar)
  useEffect(() => {
    if (selectedOrder && orders.length > 0) {
      const updatedOrder = orders.find((o) => o._id === selectedOrder._id);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  }, [orders]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      quotation_requested: "bg-orange-100 text-orange-800",
      pending: "bg-yellow-100 text-yellow-800",
      address_confirmed: "bg-blue-100 text-blue-800",
      order_confirmed: "bg-indigo-100 text-indigo-800",
      processing: "bg-blue-100 text-blue-800",
      packed: "bg-blue-100 text-blue-800",
      ready_for_delivery: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-success-highlight text-success-base",
      cancelled: "bg-red-100 text-red-800",
      out_for_delivery: "bg-brand-red-accent/10 text-brand-red-accent",
      failed_delivery: "bg-red-100 text-red-800",
      rescheduled: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status: string) => {
    return status === "paid"
      ? "bg-success-highlight text-success-base"
      : "bg-yellow-100 text-yellow-800";
  };

  const getPriorityBadge = (order: Order) => {
    // Show priority for orders that need action
    if (employee.role === "callcenter") {
      if (!order.addressConfirmedBy) {
        return (
          <Badge variant="destructive" className="gap-1 text-xs">
            <MapPin className="w-3 h-3" />
            {t("employee.orders.list.badges.addressPending")}
          </Badge>
        );
      }
      if (!order.orderConfirmedBy) {
        return (
          <Badge variant="default" className="gap-1 bg-blue-600 text-xs">
            <CheckCircle className="w-3 h-3" />
            {t("employee.orders.list.badges.needsConfirmation")}
          </Badge>
        );
      }
    }
    return null;
  };

  // Count orders by tab
  const pendingCount = orders.filter((order) => !order.orderConfirmedBy).length;
  const confirmedCount = orders.filter(
    (order) => !!order.orderConfirmedBy
  ).length;
  const tabOrders =
    activeTab === "pending"
      ? orders.filter((order) => !order.orderConfirmedBy)
      : activeTab === "confirmed"
      ? orders.filter((order) => !!order.orderConfirmedBy)
      : orders;
  const quickFilterCounts = {
    all: tabOrders.length,
    address_pending: tabOrders.filter((order) => !order.addressConfirmedBy)
      .length,
    confirmation_needed: tabOrders.filter(
      (order) => !!order.addressConfirmedBy && !order.orderConfirmedBy
    ).length,
    payment_attention: tabOrders.filter(
      (order) =>
        !["paid", "credit_approved"].includes(order.paymentStatus)
    ).length,
  };

  // Pagination
  const totalPages =
    perPage === -1 ? 1 : Math.ceil(filteredOrders.length / perPage);
  const paginatedOrders =
    perPage === -1
      ? filteredOrders
      : filteredOrders.slice(
          (currentPage - 1) * perPage,
          currentPage * perPage
        );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePerPageChange = (value: string) => {
    const newPerPage = value === "all" ? -1 : parseInt(value);
    setPerPage(newPerPage);
    setCurrentPage(1);
  };

  const statusLabels: Record<string, string> = {
    quotation_requested: t("employee.orders.status.quotation_requested"),
    pending: t("employee.orders.status.pending"),
    address_confirmed: t("employee.orders.status.address_confirmed"),
    order_confirmed: t("employee.orders.status.order_confirmed"),
    processing: t("employee.orders.status.processing"),
    packed: t("employee.orders.status.packed"),
    ready_for_delivery: t("employee.orders.status.ready_for_delivery"),
    shipped: t("employee.orders.status.shipped"),
    out_for_delivery: t("employee.orders.status.out_for_delivery"),
    delivered: t("employee.orders.status.delivered"),
    cancelled: t("employee.orders.status.cancelled"),
    failed_delivery: t("employee.orders.status.failed_delivery"),
    rescheduled: t("employee.orders.status.rescheduled"),
  };

  const paymentStatusLabels: Record<string, string> = {
    paid: t("employee.orders.paymentStatus.paid"),
    pending: t("employee.orders.paymentStatus.pending"),
    failed: t("employee.orders.paymentStatus.failed"),
    cancelled: t("employee.orders.paymentStatus.cancelled"),
    credit_requested: t("employee.orders.paymentStatus.credit_requested"),
    credit_approved: t("employee.orders.paymentStatus.credit_approved"),
    credit_rejected: t("employee.orders.paymentStatus.credit_rejected"),
  };

  const getStatusLabel = (status: string) =>
    statusLabels[status] ?? status.replace(/_/g, " ");

  const getPaymentStatusLabel = (status: string) =>
    paymentStatusLabels[status] ?? status.replace(/_/g, " ");

  const getItemsLabel = (count: number) =>
    count === 1
      ? t("employee.orders.list.item")
      : t("employee.orders.list.items");

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      statusFilter !== "all" ||
      paymentStatusFilter !== "all" ||
      paymentMethodFilter !== "all" ||
      dateRangeFilter !== "all" ||
      sortBy !== "newest" ||
      quickFilter !== "all"
  );

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setPaymentMethodFilter("all");
    setDateRangeFilter("all");
    setSortBy("newest");
    setQuickFilter("all");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("employee.orders.list.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-full md:w-48" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t("employee.orders.list.title")}
            </CardTitle>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {t("employee.orders.list.actions.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col xl:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("employee.orders.list.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[520px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue
                    placeholder={t("employee.orders.list.filters.status")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("employee.orders.list.filters.statusAll")}
                  </SelectItem>
                  <SelectItem value="quotation_requested">
                    {t("employee.orders.status.quotation_requested")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("employee.orders.status.pending")}
                  </SelectItem>
                  <SelectItem value="address_confirmed">
                    {t("employee.orders.status.address_confirmed")}
                  </SelectItem>
                  <SelectItem value="order_confirmed">
                    {t("employee.orders.status.order_confirmed")}
                  </SelectItem>
                  <SelectItem value="processing">
                    {t("employee.orders.status.processing")}
                  </SelectItem>
                  <SelectItem value="packed">
                    {t("employee.orders.status.packed")}
                  </SelectItem>
                  <SelectItem value="ready_for_delivery">
                    {t("employee.orders.status.ready_for_delivery")}
                  </SelectItem>
                  <SelectItem value="shipped">
                    {t("employee.orders.status.shipped")}
                  </SelectItem>
                  <SelectItem value="out_for_delivery">
                    {t("employee.orders.status.out_for_delivery")}
                  </SelectItem>
                  <SelectItem value="delivered">
                    {t("employee.orders.status.delivered")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("employee.orders.status.cancelled")}
                  </SelectItem>
                  <SelectItem value="failed_delivery">
                    {t("employee.orders.status.failed_delivery")}
                  </SelectItem>
                  <SelectItem value="rescheduled">
                    {t("employee.orders.status.rescheduled")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paymentStatusFilter}
                onValueChange={setPaymentStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("employee.orders.list.filters.paymentStatus")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("employee.orders.paymentStatus.all")}
                  </SelectItem>
                  <SelectItem value="paid">
                    {t("employee.orders.paymentStatus.paid")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("employee.orders.paymentStatus.pending")}
                  </SelectItem>
                  <SelectItem value="failed">
                    {t("employee.orders.paymentStatus.failed")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("employee.orders.paymentStatus.cancelled")}
                  </SelectItem>
                  <SelectItem value="credit_requested">
                    {t("employee.orders.paymentStatus.credit_requested")}
                  </SelectItem>
                  <SelectItem value="credit_approved">
                    {t("employee.orders.paymentStatus.credit_approved")}
                  </SelectItem>
                  <SelectItem value="credit_rejected">
                    {t("employee.orders.paymentStatus.credit_rejected")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paymentMethodFilter}
                onValueChange={setPaymentMethodFilter}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("employee.orders.list.filters.paymentMethod")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("employee.orders.paymentMethod.all")}
                  </SelectItem>
                  <SelectItem value="cash_on_delivery">
                    {t("employee.orders.paymentMethod.cash_on_delivery")}
                  </SelectItem>
                  <SelectItem value="stripe">
                    {t("employee.orders.paymentMethod.stripe")}
                  </SelectItem>
                  <SelectItem value="card">
                    {t("employee.orders.paymentMethod.card")}
                  </SelectItem>
                  <SelectItem value="credit">
                    {t("employee.orders.paymentMethod.credit")}
                  </SelectItem>
                  <SelectItem value="clerk">
                    {t("employee.orders.paymentMethod.clerk")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={dateRangeFilter}
                onValueChange={setDateRangeFilter}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("employee.orders.list.filters.dateRange")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("employee.orders.list.filters.dateAny")}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("employee.orders.list.filters.dateToday")}
                  </SelectItem>
                  <SelectItem value="7d">
                    {t("employee.orders.list.filters.date7d")}
                  </SelectItem>
                  <SelectItem value="30d">
                    {t("employee.orders.list.filters.date30d")}
                  </SelectItem>
                  <SelectItem value="90d">
                    {t("employee.orders.list.filters.date90d")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={quickFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickFilter("all")}
                className="gap-2"
              >
                {t("employee.orders.list.quickFilters.all")}
                <Badge variant="secondary" className="bg-white/70 text-xs">
                  {quickFilterCounts.all}
                </Badge>
              </Button>
              <Button
                variant={
                  quickFilter === "address_pending" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setQuickFilter("address_pending")}
                className="gap-2"
              >
                <MapPin className="w-3.5 h-3.5" />
                {t("employee.orders.list.quickFilters.addressPending")}
                <Badge variant="secondary" className="bg-white/70 text-xs">
                  {quickFilterCounts.address_pending}
                </Badge>
              </Button>
              <Button
                variant={
                  quickFilter === "confirmation_needed" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setQuickFilter("confirmation_needed")}
                className="gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {t("employee.orders.list.quickFilters.needsConfirmation")}
                <Badge variant="secondary" className="bg-white/70 text-xs">
                  {quickFilterCounts.confirmation_needed}
                </Badge>
              </Button>
              <Button
                variant={
                  quickFilter === "payment_attention" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setQuickFilter("payment_attention")}
                className="gap-2"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {t("employee.orders.list.quickFilters.paymentAttention")}
                <Badge variant="secondary" className="bg-white/70 text-xs">
                  {quickFilterCounts.payment_attention}
                </Badge>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-52">
                  <ArrowDownUp className="w-4 h-4 mr-2" />
                  <SelectValue
                    placeholder={t("employee.orders.list.sort.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    {t("employee.orders.list.sort.newest")}
                  </SelectItem>
                  <SelectItem value="oldest">
                    {t("employee.orders.list.sort.oldest")}
                  </SelectItem>
                  <SelectItem value="total_high">
                    {t("employee.orders.list.sort.totalHigh")}
                  </SelectItem>
                  <SelectItem value="total_low">
                    {t("employee.orders.list.sort.totalLow")}
                  </SelectItem>
                  <SelectItem value="status">
                    {t("employee.orders.list.sort.statusPriority")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  {t("employee.orders.list.clearFilters")}
                </Button>
              )}
            </div>
          </div>
        </div>

          {/* Tabs for Pending/Confirmed */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                {t("employee.orders.list.tabs.pending")} ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                {t("employee.orders.list.tabs.confirmed")} ({confirmedCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {isRefreshing ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <OrdersTable
                    orders={paginatedOrders}
                    employee={employee}
                    t={t}
                    onViewOrder={setSelectedOrder}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    getPaymentStatusColor={getPaymentStatusColor}
                    getPaymentStatusLabel={getPaymentStatusLabel}
                    getItemsLabel={getItemsLabel}
                    getPriorityBadge={getPriorityBadge}
                    hasActiveFilters={hasActiveFilters}
                  />

                  {/* Pagination Controls */}
                  {filteredOrders.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {t("employee.orders.list.pagination.showing", {
                            start:
                              perPage === -1
                                ? filteredOrders.length
                                : Math.min(
                                    (currentPage - 1) * perPage + 1,
                                    filteredOrders.length
                                  ),
                            end:
                              perPage === -1
                                ? filteredOrders.length
                                : Math.min(
                                    currentPage * perPage,
                                    filteredOrders.length
                                  ),
                            total: filteredOrders.length,
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("employee.orders.list.pagination.perPage")}
                        </span>
                        <Select
                          value={perPage === -1 ? "all" : perPage.toString()}
                          onValueChange={handlePerPageChange}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="all">
                              {t("employee.orders.list.pagination.all")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {perPage !== -1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            {t("employee.orders.list.pagination.previous")}
                          </Button>

                          <div className="flex items-center gap-1">
                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <Button
                                    key={pageNum}
                                    variant={
                                      currentPage === pageNum
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => handlePageChange(pageNum)}
                                    className="w-9"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              }
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            {t("employee.orders.list.pagination.next")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="mt-4">
              {isRefreshing ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <OrdersTable
                    orders={paginatedOrders}
                    employee={employee}
                    t={t}
                    onViewOrder={setSelectedOrder}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    getPaymentStatusColor={getPaymentStatusColor}
                    getPaymentStatusLabel={getPaymentStatusLabel}
                    getItemsLabel={getItemsLabel}
                    getPriorityBadge={getPriorityBadge}
                    hasActiveFilters={hasActiveFilters}
                  />

                  {/* Pagination Controls */}
                  {filteredOrders.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {t("employee.orders.list.pagination.showing", {
                            start:
                              perPage === -1
                                ? filteredOrders.length
                                : Math.min(
                                    (currentPage - 1) * perPage + 1,
                                    filteredOrders.length
                                  ),
                            end:
                              perPage === -1
                                ? filteredOrders.length
                                : Math.min(
                                    currentPage * perPage,
                                    filteredOrders.length
                                  ),
                            total: filteredOrders.length,
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("employee.orders.list.pagination.perPage")}
                        </span>
                        <Select
                          value={perPage === -1 ? "all" : perPage.toString()}
                          onValueChange={handlePerPageChange}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="all">
                              {t("employee.orders.list.pagination.all")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {perPage !== -1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            {t("employee.orders.list.pagination.previous")}
                          </Button>

                          <div className="flex items-center gap-1">
                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <Button
                                    key={pageNum}
                                    variant={
                                      currentPage === pageNum
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => handlePageChange(pageNum)}
                                    className="w-9"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              }
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            {t("employee.orders.list.pagination.next")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Detail Sheet */}
      <OrderDetailSheet
        order={selectedOrder}
        employee={employee}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdate={handleOrderUpdate}
      />
    </>
  );
}

// Table component for displaying orders
interface OrdersTableProps {
  orders: Order[];
  employee: Employee;
  t: (key: string, options?: Record<string, unknown>) => string;
  onViewOrder: (order: Order) => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  getPaymentStatusColor: (status: string) => string;
  getPaymentStatusLabel: (status: string) => string;
  getItemsLabel: (count: number) => string;
  getPriorityBadge: (order: Order) => React.ReactNode;
  hasActiveFilters: boolean;
}

function OrdersTable({
  orders,
  employee,
  t,
  onViewOrder,
  getStatusColor,
  getStatusLabel,
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getItemsLabel,
  getPriorityBadge,
  hasActiveFilters,
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>
          {hasActiveFilters
            ? t("employee.orders.list.empty.filtered")
            : t("employee.orders.list.empty.default")}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("employee.orders.list.table.order")}</TableHead>
              <TableHead>{t("employee.orders.list.table.customer")}</TableHead>
              <TableHead>{t("employee.orders.list.table.date")}</TableHead>
              <TableHead>{t("employee.orders.list.table.items")}</TableHead>
              <TableHead>{t("employee.orders.list.table.total")}</TableHead>
              <TableHead>{t("employee.orders.list.table.status")}</TableHead>
              <TableHead>{t("employee.orders.list.table.payment")}</TableHead>
              <TableHead className="text-right">
                {t("employee.orders.list.table.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order._id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  #{order.orderNumber.slice(-6)}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(order.orderDate), "MMM dd, yyyy")}
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(order.orderDate), "HH:mm")}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {order.products.length} {getItemsLabel(order.products.length)}
                </TableCell>
                <TableCell className="font-semibold">
                  {order.currency} {order.totalPrice.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    onClick={() => onViewOrder(order)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {t("employee.orders.list.actions.view")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 p-3">
        {orders.map((order) => (
          <Card key={order._id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">#{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.customerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.email}
                    </div>
                  </div>
                  <Button
                    onClick={() => onViewOrder(order)}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {t("employee.orders.list.actions.view")}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("employee.orders.list.labels.date")}
                  </span>
                  <span>
                    {format(new Date(order.orderDate), "MMM dd, yyyy")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("employee.orders.list.labels.items")}
                  </span>
                  <span>
                    {order.products.length}{" "}
                    {getItemsLabel(order.products.length)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("employee.orders.list.labels.total")}
                  </span>
                  <span className="font-semibold">
                    {order.currency} {order.totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                  <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </Badge>
                  {employee.role === "callcenter" && getPriorityBadge(order)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
