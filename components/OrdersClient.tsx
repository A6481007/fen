"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ResponsiveOrdersComponent from "@/components/ResponsiveOrdersComponent";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { MY_ORDERS_QUERYResult } from "@/sanity.types";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/orderStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OrdersClientProps {
  initialOrders: MY_ORDERS_QUERYResult;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type OrderListItem = MY_ORDERS_QUERYResult[number] & {
  orderKind?: "order" | "quotation";
  quotationRequestedAt?: string | null;
};

export default function OrdersClient({
  initialOrders,
  totalPages,
  currentPage,
  hasNextPage,
  hasPrevPage,
}: OrdersClientProps) {
  const [orders, setOrders] = useState<OrderListItem[]>(initialOrders || []);
  const [isPending, startTransition] = useTransition();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showCancelledOrders, setShowCancelledOrders] = useState(false);
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const router = useRouter();
  const { t } = useTranslation();

  // Set initial load to false after first render
  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    setOrders(initialOrders || []);
  }, [initialOrders]);

  useEffect(() => {
    const getParam = (key: string, fallback: string) =>
      searchParams.get(key) ?? fallback;
    setSearchQuery(getParam("q", ""));
    setStatusFilter(getParam("status", "all"));
    setTypeFilter(getParam("type", "all"));
    setPaymentFilter(getParam("payment", "all"));
    setDateRangeFilter(getParam("range", "all"));
    setSortBy(getParam("sort", "newest"));
    setShowCancelledOrders(searchParams.get("showCancelled") === "1");
  }, [searchParams]);

  // Generate pagination items
  const generatePaginationItems = () => {
    const items = [];
    const showEllipsis = totalPages > 10;

    if (showEllipsis) {
      if (currentPage <= 4) {
        for (let i = 1; i <= Math.min(5, totalPages); i++) {
          items.push(i);
        }
        if (totalPages > 5) {
          items.push("ellipsis");
          items.push(totalPages);
        }
      } else if (currentPage >= totalPages - 3) {
        items.push(1);
        items.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          items.push(i);
        }
      } else {
        items.push(1);
        items.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          items.push(i);
        }
        items.push("ellipsis");
        items.push(totalPages);
      }
    } else {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    }

    return items;
  };

  const buildQueryString = (page: number) => {
    const params = new URLSearchParams();
    const trimmedQuery = searchQuery.trim();

    if (page > 1) {
      params.set("page", page.toString());
    }
    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (typeFilter !== "all") {
      params.set("type", typeFilter);
    }
    if (paymentFilter !== "all") {
      params.set("payment", paymentFilter);
    }
    if (dateRangeFilter !== "all") {
      params.set("range", dateRangeFilter);
    }
    if (sortBy !== "newest") {
      params.set("sort", sortBy);
    }
    if (showCancelledOrders) {
      params.set("showCancelled", "1");
    }

    return params.toString();
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const queryString = buildQueryString(page);
      router.push(`/user/orders${queryString ? `?${queryString}` : ""}`);
    });
  };

  const isQuotationOrder = (order: OrderListItem) =>
    order.orderKind === "quotation" ||
    order.status === (ORDER_STATUSES.QUOTATION_REQUESTED as OrderListItem["status"]) ||
    Boolean(order.quotationRequestedAt);

  const isCancelledOrder = (order: OrderListItem) =>
    order.status === ORDER_STATUSES.CANCELLED;

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const rangeStart = (() => {
      const today = new Date();
      switch (dateRangeFilter) {
        case "7d":
          return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        case "30d":
          return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
        case "90d":
          return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
        case "1y":
          return new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        default:
          return null;
      }
    })();

    const matchesSearch = (order: OrderListItem) => {
      if (!normalizedQuery) return true;
      const orderNumber = order.orderNumber?.toLowerCase() || "";
      const status = order.status?.toLowerCase() || "";
      const paymentStatus = order.paymentStatus?.toLowerCase() || "";
      const paymentMethod = order.paymentMethod?.toLowerCase() || "";
      const productMatch = (order.products || []).some((item) => {
        const productName = item?.product?.name?.toLowerCase() || "";
        return productName.includes(normalizedQuery);
      });

      return (
        orderNumber.includes(normalizedQuery) ||
        status.includes(normalizedQuery) ||
        paymentStatus.includes(normalizedQuery) ||
        paymentMethod.includes(normalizedQuery) ||
        productMatch
      );
    };

    const getOrderDateValue = (order: OrderListItem) => {
      const dateValue = order.orderDate
        ? new Date(order.orderDate).getTime()
        : 0;
      return Number.isNaN(dateValue) ? 0 : dateValue;
    };

    const filtered = orders.filter((order) => {
      if (!matchesSearch(order)) return false;

      const isQuotation = isQuotationOrder(order);
      if (typeFilter === "orders" && isQuotation) return false;
      if (typeFilter === "quotations" && !isQuotation) return false;

      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (
        paymentFilter !== "all" &&
        (order.paymentStatus || PAYMENT_STATUSES.PENDING) !== paymentFilter
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
        return (b.totalPrice || 0) - (a.totalPrice || 0);
      }
      if (sortBy === "total_low") {
        return (a.totalPrice || 0) - (b.totalPrice || 0);
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
    statusFilter,
    typeFilter,
    paymentFilter,
    dateRangeFilter,
    sortBy,
  ]);

  const showCancelled =
    showCancelledOrders || statusFilter === ORDER_STATUSES.CANCELLED;
  const cancelledOrders = filteredOrders.filter(isCancelledOrder);
  const showCancelledToggle =
    cancelledOrders.length > 0 &&
    statusFilter !== ORDER_STATUSES.CANCELLED;
  const visibleOrders = showCancelled
    ? filteredOrders
    : filteredOrders.filter((order) => !isCancelledOrder(order));

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      statusFilter !== "all" ||
      typeFilter !== "all" ||
      paymentFilter !== "all" ||
      dateRangeFilter !== "all" ||
      sortBy !== "newest" ||
      showCancelledOrders
  );

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPaymentFilter("all");
    setDateRangeFilter("all");
    setSortBy("newest");
    setShowCancelledOrders(false);
    startTransition(() => {
      router.push("/user/orders");
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-muted/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">
                {t("client.userOrders.filters.title")}
              </CardTitle>
              <CardDescription>
                {t("client.userOrders.filters.description")}
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="self-start"
              >
                {t("client.userOrders.filters.clear")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("client.userOrders.filters.searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("client.userOrders.filters.status.label")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("client.userOrders.filters.status.all")}
                  </SelectItem>
                  <SelectItem value={ORDER_STATUSES.PENDING}>
                    {t("client.userOrders.filters.status.pending")}
                  </SelectItem>
                  <SelectItem value={ORDER_STATUSES.PROCESSING}>
                    {t("client.userOrders.filters.status.processing")}
                  </SelectItem>
                  <SelectItem value={ORDER_STATUSES.PAID}>
                    {t("client.userOrders.filters.status.paid")}
                  </SelectItem>
                  <SelectItem value={ORDER_STATUSES.SHIPPED}>
                    {t("client.userOrders.filters.status.shipped")}
                  </SelectItem>
                  <SelectItem value={ORDER_STATUSES.OUT_FOR_DELIVERY}>
                    {t("client.userOrders.filters.status.outForDelivery")}
                  </SelectItem>
                  <SelectItem value={ORDER_STATUSES.DELIVERED}>
                    {t("client.userOrders.filters.status.delivered")}
                  </SelectItem>
                  <SelectItem value={ORDER_STATUSES.CANCELLED}>
                    {t("client.userOrders.filters.status.cancelled")}
                  </SelectItem>
                  <SelectItem value={ORDER_STATUSES.QUOTATION_REQUESTED}>
                    {t("client.userOrders.filters.status.quotationRequested")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("client.userOrders.filters.type.label")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("client.userOrders.filters.type.all")}
                  </SelectItem>
                  <SelectItem value="orders">
                    {t("client.userOrders.filters.type.orders")}
                  </SelectItem>
                  <SelectItem value="quotations">
                    {t("client.userOrders.filters.type.quotations")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("client.userOrders.filters.payment.label")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("client.userOrders.filters.payment.all")}
                  </SelectItem>
                  <SelectItem value={PAYMENT_STATUSES.PAID}>
                    {t("client.userOrders.filters.payment.paid")}
                  </SelectItem>
                  <SelectItem value={PAYMENT_STATUSES.PENDING}>
                    {t("client.userOrders.filters.payment.pending")}
                  </SelectItem>
                  <SelectItem value={PAYMENT_STATUSES.FAILED}>
                    {t("client.userOrders.filters.payment.failed")}
                  </SelectItem>
                  <SelectItem value={PAYMENT_STATUSES.CANCELLED}>
                    {t("client.userOrders.filters.payment.cancelled")}
                  </SelectItem>
                  <SelectItem value={PAYMENT_STATUSES.CREDIT_REQUESTED}>
                    {t("client.userOrders.filters.payment.creditRequested")}
                  </SelectItem>
                  <SelectItem value={PAYMENT_STATUSES.CREDIT_APPROVED}>
                    {t("client.userOrders.filters.payment.creditApproved")}
                  </SelectItem>
                  <SelectItem value={PAYMENT_STATUSES.CREDIT_REJECTED}>
                    {t("client.userOrders.filters.payment.creditRejected")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={dateRangeFilter}
                onValueChange={setDateRangeFilter}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("client.userOrders.filters.range.label")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("client.userOrders.filters.range.any")}
                  </SelectItem>
                  <SelectItem value="7d">
                    {t("client.userOrders.filters.range.last7")}
                  </SelectItem>
                  <SelectItem value="30d">
                    {t("client.userOrders.filters.range.last30")}
                  </SelectItem>
                  <SelectItem value="90d">
                    {t("client.userOrders.filters.range.last90")}
                  </SelectItem>
                  <SelectItem value="1y">
                    {t("client.userOrders.filters.range.last12")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("client.userOrders.filters.sort.label")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    {t("client.userOrders.filters.sort.newest")}
                  </SelectItem>
                  <SelectItem value="oldest">
                    {t("client.userOrders.filters.sort.oldest")}
                  </SelectItem>
                  <SelectItem value="total_high">
                    {t("client.userOrders.filters.sort.totalHigh")}
                  </SelectItem>
                  <SelectItem value="total_low">
                    {t("client.userOrders.filters.sort.totalLow")}
                  </SelectItem>
                  <SelectItem value="status">
                    {t("client.userOrders.filters.sort.status")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {t("client.userOrders.results.count", {
                count: visibleOrders.length,
              })}
            </Badge>
            <span>
              {t("client.userOrders.results.summary", { count: orders.length })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Orders Content */}
      <div>
        {isPending && !isInitialLoad ? (
          // Show only orders skeleton for pagination loading
          <Card className="overflow-hidden">
            <div className="p-4 space-y-6">
              {Array(5)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <Skeleton className="w-16 h-16 rounded" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Skeleton className="w-16 h-16 rounded" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-3 w-1/3" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="lg:w-1/3 space-y-3">
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-10 w-full rounded" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        ) : orders.length > 0 ? (
          <Card className="overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {showCancelledToggle && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {showCancelledOrders
                        ? t("client.userOrders.cancelled.showing", {
                            count: cancelledOrders.length,
                          })
                        : t("client.userOrders.cancelled.hidden", {
                            count: cancelledOrders.length,
                          })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowCancelledOrders((prev) => !prev)
                      }
                    >
                      {showCancelledOrders
                        ? t("client.userOrders.cancelled.hideButton")
                        : t("client.userOrders.cancelled.showButton")}
                    </Button>
                  </div>
                )}
                {visibleOrders.length > 0 ? (
                  <ResponsiveOrdersComponent orders={visibleOrders} />
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500 text-sm">
                      {hasActiveFilters
                        ? t("client.userOrders.empty.filtered")
                        : t("client.userOrders.empty.active")}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                        >
                          {t("client.userOrders.filters.clear")}
                        </Button>
                      )}
                      {showCancelledToggle && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCancelledOrders(true)}
                        >
                          {t("client.userOrders.cancelled.showButton")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500 text-lg">
              {t("client.userOrders.empty.none")}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {t("client.userOrders.empty.startShopping")}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Right Aligned Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  size="default"
                  onClick={(e) => {
                    e.preventDefault();
                    if (hasPrevPage && !isPending)
                      handlePageChange(currentPage - 1);
                  }}
                  className={
                    !hasPrevPage || isPending
                      ? "pointer-events-none opacity-50"
                      : "hover:bg-accent"
                  }
                />
              </PaginationItem>

              {generatePaginationItems().map((item, index) => (
                <PaginationItem key={index}>
                  {item === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href="#"
                      isActive={currentPage === item}
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        if (typeof item === "number" && !isPending)
                          handlePageChange(item);
                      }}
                      className={
                        currentPage === item
                          ? "bg-primary text-primary-foreground hover:bg-primary/80" +
                            (isPending ? " opacity-50" : "")
                          : "hover:bg-accent" +
                            (isPending ? " opacity-50 pointer-events-none" : "")
                      }
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  size="default"
                  onClick={(e) => {
                    e.preventDefault();
                    if (hasNextPage && !isPending)
                      handlePageChange(currentPage + 1);
                  }}
                  className={
                    !hasNextPage || isPending
                      ? "pointer-events-none opacity-50"
                      : "hover:bg-accent"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
