"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Package,
  CheckCircle,
  DollarSign,
  Search,
  Calendar,
  MapPin,
  RefreshCw,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrdersForEmployee } from "@/actions/orderEmployeeActions";
import DeliveryOrderSheet from "./DeliveryOrderSheet";
import { useTranslation } from "react-i18next";

type Order = {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderDate: string;
  shippingAddress?: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  products: Array<{
    _key: string;
    quantity: number;
    product: {
      _id: string;
      name: string;
      price: number;
      image?: string;
    };
  }>;
  dispatchedAt?: string;
  deliveredAt?: string;
  cashCollected?: boolean;
  cashCollectedAmount?: number;
  cashCollectedAt?: string;
  cashSubmittedToAccounts?: boolean;
  cashSubmittedBy?: string;
  cashSubmittedAt?: string;
  cashSubmissionNotes?: string;
  cashSubmissionStatus?: string;
  cashSubmissionRejectionReason?: string;
  paymentReceivedBy?: string;
  paymentReceivedAt?: string;
  rescheduledDate?: string;
  deliveryAttempts?: number;
};

export default function DeliveryOrdersList() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState("assigned");

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, activeTab]);

  const fetchOrders = async (forceFresh = false) => {
    if (forceFresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getOrdersForEmployee();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by tab
    switch (activeTab) {
      case "assigned":
        // Ready for delivery - assigned but not yet out for delivery
        filtered = filtered.filter(
          (order) => order.status === "ready_for_delivery"
        );
        break;
      case "delivering":
        // Out for delivery
        filtered = filtered.filter(
          (order) => order.status === "out_for_delivery"
        );
        break;
      case "delivered":
        // Delivered orders
        filtered = filtered.filter((order) => order.status === "delivered");
        break;
      case "collections":
        // Orders with cash collected but not yet submitted to accounts
        filtered = filtered.filter(
          (order) => order.cashCollected && !order.paymentReceivedBy
        );
        break;
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customerName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      ready_for_delivery: t("employee.deliveries.status.ready_for_delivery"),
      out_for_delivery: t("employee.deliveries.status.out_for_delivery"),
      delivered: t("employee.deliveries.status.delivered"),
      rescheduled: t("employee.deliveries.status.rescheduled"),
      failed_delivery: t("employee.deliveries.status.failed_delivery"),
    };
    const statusConfig: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      ready_for_delivery: {
        label: statusLabels.ready_for_delivery,
        variant: "secondary",
      },
      out_for_delivery: {
        label: statusLabels.out_for_delivery,
        variant: "default",
      },
      delivered: { label: statusLabels.delivered, variant: "outline" },
      rescheduled: { label: statusLabels.rescheduled, variant: "secondary" },
      failed_delivery: {
        label: statusLabels.failed_delivery,
        variant: "destructive",
      },
    };

    const config = statusConfig[status] || {
      label: statusLabels[status] ?? status,
      variant: "outline" as const,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentBadge = (order: Order) => {
    if (order.cashCollected && order.paymentReceivedBy) {
      return (
        <Badge variant="outline" className="bg-green-50">
          {t("employee.deliveries.payment.submitted")}
        </Badge>
      );
    }
    if (order.cashCollected) {
      return (
        <Badge variant="default" className="bg-blue-500">
          {t("employee.deliveries.payment.collected")}
        </Badge>
      );
    }
    if (
      order.paymentMethod === "cash_on_delivery" ||
      order.paymentStatus === "pending"
    ) {
      return (
        <Badge variant="destructive">
          {t("employee.deliveries.payment.codPending")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-50">
        {t("employee.deliveries.payment.paid")}
      </Badge>
    );
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setSheetOpen(true);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setSelectedOrder(null);
    fetchOrders(true);
  };

  // Calculate stats
  const stats = {
    assigned: orders.filter((o) => o.status === "ready_for_delivery").length,
    delivering: orders.filter((o) => o.status === "out_for_delivery").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    collections: orders.filter((o) => o.cashCollected && !o.paymentReceivedBy)
      .length,
    pendingSubmission: orders.filter(
      (o) =>
        o.cashCollected &&
        (!o.cashSubmittedToAccounts || o.cashSubmissionStatus === "rejected")
    ).length,
    totalCashCollected: orders
      .filter((o) => o.cashCollected && !o.paymentReceivedBy)
      .reduce((sum, o) => sum + (o.cashCollectedAmount || o.totalPrice), 0),
  };

  const displayedOrders =
    itemsPerPage === 0 ? filteredOrders : filteredOrders.slice(0, itemsPerPage);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("employee.deliveries.stats.assigned.title")}
            </CardTitle>
            <Package className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("employee.deliveries.stats.assigned.caption")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("employee.deliveries.stats.delivering.title")}
            </CardTitle>
            <Truck className="w-4 h-4 text-brand-red-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivering}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("employee.deliveries.stats.delivering.caption")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("employee.deliveries.stats.delivered.title")}
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-success-base" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("employee.deliveries.stats.delivered.caption")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("employee.deliveries.stats.collections.title")}
            </CardTitle>
            <DollarSign className="w-4 h-4 text-success-base" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collections}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("employee.deliveries.stats.collections.total", {
                amount: stats.totalCashCollected.toFixed(2),
              })}
            </p>
            {stats.pendingSubmission > 0 && (
              <p className="text-xs text-brand-red-accent mt-1 font-medium">
                {t("employee.deliveries.stats.collections.pending", {
                  count: stats.pendingSubmission,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders Table with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>{t("employee.deliveries.list.title")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchOrders(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing
                  ? t("employee.deliveries.list.actions.refreshing")
                  : t("employee.deliveries.list.actions.refresh")}
              </Button>
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("employee.deliveries.list.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(Number(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="0">
                    {t("employee.deliveries.list.pagination.all")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="assigned">
                {t("employee.deliveries.tabs.assigned")} ({stats.assigned})
              </TabsTrigger>
              <TabsTrigger value="delivering">
                {t("employee.deliveries.tabs.delivering")} ({stats.delivering})
              </TabsTrigger>
              <TabsTrigger value="delivered">
                {t("employee.deliveries.tabs.delivered")} ({stats.delivered})
              </TabsTrigger>
              <TabsTrigger value="collections">
                {t("employee.deliveries.tabs.collections")} ({stats.collections})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {displayedOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">
                    {t("employee.deliveries.empty.title")}
                  </p>
                  <p className="text-sm mt-1">
                    {searchQuery
                      ? t("employee.deliveries.empty.searchHint")
                      : t("employee.deliveries.empty.defaultHint")}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t("employee.deliveries.table.order")}
                          </TableHead>
                          <TableHead>
                            {t("employee.deliveries.table.customer")}
                          </TableHead>
                          <TableHead>
                            {t("employee.deliveries.table.address")}
                          </TableHead>
                          <TableHead>
                            {t("employee.deliveries.table.amount")}
                          </TableHead>
                          <TableHead>
                            {t("employee.deliveries.table.payment")}
                          </TableHead>
                          <TableHead>
                            {t("employee.deliveries.table.status")}
                          </TableHead>
                          <TableHead>
                            {t("employee.deliveries.table.date")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("employee.deliveries.table.action")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedOrders.map((order) => (
                          <TableRow
                            key={order._id}
                            className="hover:bg-muted/50"
                          >
                            <TableCell className="font-medium">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {order.customerName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {order.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-1 max-w-[200px]">
                                <MapPin className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                                <div className="text-sm">
                                  {order.shippingAddress?.street},{" "}
                                  {order.shippingAddress?.city}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                ${order.totalPrice.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("employee.deliveries.items", {
                                  count: order.products.length,
                                })}
                              </div>
                            </TableCell>
                            <TableCell>{getPaymentBadge(order)}</TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {format(
                                  new Date(
                                    order.dispatchedAt || order.orderDate
                                  ),
                                  "MMM d"
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOrderClick(order);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                {t("employee.deliveries.actions.view")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden space-y-4">
                    {displayedOrders.map((order) => (
                      <Card key={order._id} className="hover:bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold">
                                  {order.orderNumber}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {order.customerName}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">
                                  ${order.totalPrice.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t("employee.deliveries.items", {
                                    count: order.products.length,
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                              <div>
                                {order.shippingAddress?.street},{" "}
                                {order.shippingAddress?.city}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex gap-2 flex-wrap">
                                {getStatusBadge(order.status)}
                                {getPaymentBadge(order)}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(
                                  new Date(
                                    order.dispatchedAt || order.orderDate
                                  ),
                                  "MMM d"
                                )}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleOrderClick(order)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {t("employee.deliveries.actions.viewDetails")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {itemsPerPage > 0 && filteredOrders.length > itemsPerPage && (
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      {t("employee.deliveries.pagination.showing", {
                        shown: displayedOrders.length,
                        total: filteredOrders.length,
                      })}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Details Sheet */}
      {selectedOrder && (
        <DeliveryOrderSheet
          order={selectedOrder}
          open={sheetOpen}
          onClose={handleSheetClose}
        />
      )}
    </div>
  );
}
