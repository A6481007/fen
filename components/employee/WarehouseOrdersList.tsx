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
  Truck,
  RefreshCw,
  Eye,
  CheckCircle,
  Package,
  UserPlus,
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
import WarehouseOrderSheet from "./WarehouseOrderSheet";
import { useTranslation } from "react-i18next";

interface WarehouseOrdersListProps {
  employee: Employee;
}

interface Order {
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
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
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
  packedBy?: any;
  packedAt?: string;
  assignedDeliverymanId?: string;
  assignedDeliverymanName?: string;
  dispatchedBy?: any;
  dispatchedAt?: string;
}

export default function WarehouseOrdersList({
  employee,
}: WarehouseOrdersListProps) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const loadOrders = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsRefreshing(true);
      }
      const data = await getOrdersForEmployee();

      // Backend filters for packed orders for warehouse role
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customerName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by tab
    if (activeTab === "pending") {
      // Orders that are packed but not yet assigned to deliveryman
      filtered = filtered.filter((order) => !order.assignedDeliverymanId);
    } else if (activeTab === "assigned") {
      // Orders that have been assigned to deliveryman
      filtered = filtered.filter((order) => !!order.assignedDeliverymanId);
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [searchQuery, activeTab, orders]);

  const handleOrderUpdate = (refreshTab = false, closeSheet = false) => {
    loadOrders(false);
    if (closeSheet) {
      setSelectedOrder(null);
    }
    if (refreshTab) {
      // Optionally switch tabs if needed
    }
  };

  const handleRefresh = () => {
    loadOrders(true);
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

  const pendingCount = orders.filter((o) => !o.assignedDeliverymanId).length;
  const assignedCount = orders.filter((o) => !!o.assignedDeliverymanId).length;

  const formatCurrency = (amount: number, currency: string = "THB") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getItemsLabel = (count: number) =>
    count === 1
      ? t("employee.warehouse.list.item")
      : t("employee.warehouse.list.items");

  const getStatusLabel = (status: string) =>
    t(`employee.orders.status.${status}`, status);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; className: string; icon?: React.ReactNode }
    > = {
      packed: {
        label: getStatusLabel("packed"),
        className: "bg-purple-100 text-purple-800",
        icon: <Package className="w-3 h-3 mr-1" />,
      },
      ready_for_delivery: {
        label: getStatusLabel("ready_for_delivery"),
        className: "bg-cyan-100 text-cyan-800",
        icon: <CheckCircle className="w-3 h-3 mr-1" />,
      },
      out_for_delivery: {
        label: getStatusLabel("out_for_delivery"),
        className: "bg-blue-100 text-blue-800",
        icon: <Truck className="w-3 h-3 mr-1" />,
      },
    };

    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={config.className}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("employee.warehouse.list.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("employee.warehouse.list.subtitle")}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t("employee.warehouse.list.actions.refresh")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t("employee.warehouse.stats.total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t("employee.warehouse.stats.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-red-accent">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t("employee.warehouse.stats.assigned")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-base">
              {assignedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t("employee.warehouse.list.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={perPage.toString()}
              onValueChange={(value) => {
                setPerPage(value === "all" ? -1 : parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">
                  {t("employee.warehouse.list.perPage", { count: 10 })}
                </SelectItem>
                <SelectItem value="20">
                  {t("employee.warehouse.list.perPage", { count: 20 })}
                </SelectItem>
                <SelectItem value="30">
                  {t("employee.warehouse.list.perPage", { count: 30 })}
                </SelectItem>
                <SelectItem value="50">
                  {t("employee.warehouse.list.perPage", { count: 50 })}
                </SelectItem>
                <SelectItem value="all">
                  {t("employee.warehouse.list.all")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            {t("employee.warehouse.tabs.pending")}
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-brand-red-accent">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assigned" className="relative">
            {t("employee.warehouse.tabs.assigned")}
            {assignedCount > 0 && (
              <Badge className="ml-2 bg-success-base">{assignedCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Desktop Table View */}
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employee.warehouse.table.order")}</TableHead>
                  <TableHead>{t("employee.warehouse.table.customer")}</TableHead>
                  <TableHead>{t("employee.warehouse.table.products")}</TableHead>
                  <TableHead>{t("employee.warehouse.table.amount")}</TableHead>
                  <TableHead>{t("employee.warehouse.table.status")}</TableHead>
                  <TableHead>
                    {t("employee.warehouse.table.deliveryman")}
                  </TableHead>
                  <TableHead>{t("employee.warehouse.table.packedAt")}</TableHead>
                  <TableHead className="text-right">
                    {t("employee.warehouse.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Truck className="w-12 h-12" />
                        <p>{t("employee.warehouse.empty")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.products.length}{" "}
                          {getItemsLabel(order.products.length)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(order.totalPrice, order.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {order.assignedDeliverymanName ? (
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-success-base" />
                            <span className="text-sm">
                              {order.assignedDeliverymanName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {t("employee.warehouse.table.notAssigned")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.packedAt ? (
                          <div className="text-sm text-gray-600">
                            {t("employee.warehouse.table.packedAtValue", {
                              date: format(
                                new Date(order.packedAt),
                                "MMM dd, yyyy"
                              ),
                              time: format(new Date(order.packedAt), "HH:mm"),
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {t("employee.warehouse.na")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t("employee.warehouse.actions.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {paginatedOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Truck className="w-12 h-12" />
                    <p>{t("employee.warehouse.empty")}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              paginatedOrders.map((order) => (
                <Card key={order._id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-lg">
                            {order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.customerName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.email}
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">
                            {t("employee.warehouse.mobile.amount")}
                          </span>
                          <div className="font-medium">
                            {formatCurrency(order.totalPrice, order.currency)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            {t("employee.warehouse.mobile.products")}
                          </span>
                          <div className="font-medium">
                            {order.products.length}{" "}
                            {getItemsLabel(order.products.length)}
                          </div>
                        </div>
                      </div>

                      {order.assignedDeliverymanName && (
                        <div className="flex items-center gap-2 text-sm">
                          <UserPlus className="w-4 h-4 text-success-base" />
                          <span className="text-gray-600">
                            {t("employee.warehouse.mobile.assignedTo", {
                              name: order.assignedDeliverymanName,
                            })}
                          </span>
                        </div>
                      )}

                      {order.packedAt && (
                        <div className="text-xs text-gray-500">
                          {t("employee.warehouse.mobile.packedAt", {
                            date: format(
                              new Date(order.packedAt),
                              "MMM dd, yyyy"
                            ),
                            time: format(new Date(order.packedAt), "HH:mm"),
                          })}
                        </div>
                      )}

                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {t("employee.warehouse.actions.viewDetails")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {perPage !== -1 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                {t("employee.warehouse.pagination.showing", {
                  start: (currentPage - 1) * perPage + 1,
                  end: Math.min(
                    currentPage * perPage,
                    filteredOrders.length
                  ),
                  total: filteredOrders.length,
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {t("employee.warehouse.pagination.previous")}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) =>
                      (page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1) && (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      )
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  {t("employee.warehouse.pagination.next")}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Details Sheet */}
      {selectedOrder && (
        <WarehouseOrderSheet
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={handleOrderUpdate}
          employee={employee}
        />
      )}
    </div>
  );
}
