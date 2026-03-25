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
  Package,
  RefreshCw,
  Eye,
  CheckCircle,
  Box,
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
import PackingOrderSheet from "./PackingOrderSheet";
import { useTranslation } from "react-i18next";

interface PackingOrdersListProps {
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
  orderConfirmedBy?: any;
  orderConfirmedAt?: string;
  packedBy?: any;
  packedAt?: string;
}

export default function PackingOrdersList({
  employee,
}: PackingOrdersListProps) {
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

      // Backend already filters for confirmed orders for packer role
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
    loadOrders(false);
  }, []);

  useEffect(() => {
    let filtered = orders;

    // Tab filter (Pending = not packed, Packed = packed)
    if (activeTab === "pending") {
      filtered = filtered.filter((order) => !order.packedBy);
    } else if (activeTab === "packed") {
      filtered = filtered.filter((order) => !!order.packedBy);
    }

    // Search filter
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
    setCurrentPage(1);
  }, [searchQuery, orders, activeTab]);

  const handleRefresh = async () => {
    await loadOrders(true);
  };

  const handleOrderUpdate = async (
    shouldSwitchToPacked = false,
    shouldCloseSheet = false
  ) => {
    const currentOrderId = selectedOrder?._id;

    await loadOrders(true);

    if (shouldCloseSheet) {
      setSelectedOrder(null);
    }

    if (shouldSwitchToPacked) {
      setTimeout(() => {
        setActiveTab("packed");
      }, 100);
    }
  };

  // Update selected order when orders change
  useEffect(() => {
    if (selectedOrder && orders.length > 0) {
      const updatedOrder = orders.find((o) => o._id === selectedOrder._id);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  }, [orders]);

  // Count orders by tab
  const pendingCount = orders.filter((order) => !order.packedBy).length;
  const packedCount = orders.filter((order) => !!order.packedBy).length;

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

  const getItemsLabel = (count: number) =>
    count === 1
      ? t("employee.packing.list.item")
      : t("employee.packing.list.items");

  const getPaymentStatusLabel = (status?: string) =>
    status ? t(`employee.orders.paymentStatus.${status}`) : t("employee.packing.list.na");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t("employee.packing.list.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
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
              {t("employee.packing.list.title")}
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
              {t("employee.packing.list.actions.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("employee.packing.list.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs for Pending/Packed */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="pending" className="gap-2">
                <Box className="w-4 h-4" />
                {t("employee.packing.list.tabs.toPack")} ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="packed" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                {t("employee.packing.list.tabs.packed")} ({packedCount})
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
                  <PackingTable
                    orders={paginatedOrders}
                    t={t}
                    getItemsLabel={getItemsLabel}
                    getPaymentStatusLabel={getPaymentStatusLabel}
                    onViewOrder={setSelectedOrder}
                  />

                  {/* Pagination Controls */}
                  {filteredOrders.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {t("employee.packing.list.pagination.showing", {
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
                          {t("employee.packing.list.pagination.perPage")}
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
                              {t("employee.packing.list.pagination.all")}
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
                            {t("employee.packing.list.pagination.previous")}
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
                            {t("employee.packing.list.pagination.next")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="packed" className="mt-4">
              {isRefreshing ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <PackingTable
                    orders={paginatedOrders}
                    t={t}
                    getItemsLabel={getItemsLabel}
                    getPaymentStatusLabel={getPaymentStatusLabel}
                    onViewOrder={setSelectedOrder}
                  />

                  {/* Pagination Controls */}
                  {filteredOrders.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {t("employee.packing.list.pagination.showing", {
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
                          {t("employee.packing.list.pagination.perPage")}
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
                              {t("employee.packing.list.pagination.all")}
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
                            {t("employee.packing.list.pagination.previous")}
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
                            {t("employee.packing.list.pagination.next")}
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

      {/* Packing Order Sheet */}
      <PackingOrderSheet
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
interface PackingTableProps {
  orders: Order[];
  t: (key: string, options?: Record<string, unknown>) => string;
  getItemsLabel: (count: number) => string;
  getPaymentStatusLabel: (status?: string) => string;
  onViewOrder: (order: Order) => void;
}

function PackingTable({
  orders,
  t,
  getItemsLabel,
  getPaymentStatusLabel,
  onViewOrder,
}: PackingTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t("employee.packing.list.empty")}</p>
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
              <TableHead>{t("employee.packing.list.table.order")}</TableHead>
              <TableHead>{t("employee.packing.list.table.customer")}</TableHead>
              <TableHead>{t("employee.packing.list.table.date")}</TableHead>
              <TableHead>{t("employee.packing.list.table.items")}</TableHead>
              <TableHead>{t("employee.packing.list.table.total")}</TableHead>
              <TableHead>{t("employee.packing.list.table.payment")}</TableHead>
              <TableHead className="text-right">
                {t("employee.packing.list.table.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order._id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  #{order.orderNumber}
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
                  <Badge
                    variant={
                      order.paymentStatus === "paid" ? "default" : "secondary"
                    }
                  >
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
                    {t("employee.packing.list.actions.view")}
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
                    {t("employee.packing.list.actions.view")}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("employee.packing.list.labels.date")}
                  </span>
                  <span>
                    {format(new Date(order.orderDate), "MMM dd, yyyy")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("employee.packing.list.labels.items")}
                  </span>
                  <span>
                    {order.products.length} {getItemsLabel(order.products.length)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("employee.packing.list.labels.total")}
                  </span>
                  <span className="font-semibold">
                    {order.currency} {order.totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      order.paymentStatus === "paid" ? "default" : "secondary"
                    }
                  >
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
