"use client";

import { useState, useEffect } from "react";
import {
  getOrdersForEmployee,
  confirmAddress,
  confirmOrder,
  markAsPacked,
  assignDeliveryman,
  markAsDelivered,
  receivePaymentFromDeliveryman,
} from "@/actions/orderEmployeeActions";
import {
  getCurrentEmployee,
  getEmployeesByRole,
} from "@/actions/employeeActions";
import {
  Employee,
  OrderWithTracking,
  getRoleDisplayName,
} from "@/types/employee";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle,
  Package,
  Truck,
  DollarSign,
  Clock,
  MapPin,
  User,
  Phone,
  RefreshCw,
} from "lucide-react";

export default function EmployeeOrderManagement() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [orders, setOrders] = useState<OrderWithTracking[]>([]);
  const [deliverymen, setDeliverymen] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithTracking | null>(
    null
  );
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [actionNotes, setActionNotes] = useState("");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [selectedDeliveryman, setSelectedDeliveryman] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [currentEmp, ordersData, deliverymenData] = await Promise.all([
        getCurrentEmployee(),
        getOrdersForEmployee(),
        getEmployeesByRole("deliveryman"),
      ]);

      setEmployee(currentEmp);
      setOrders(ordersData);
      setDeliverymen(deliverymenData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedOrder) return;

    setActionLoading(true);
    try {
      let result;

      switch (actionType) {
        case "confirmAddress":
          result = await confirmAddress(selectedOrder._id, actionNotes);
          break;
        case "confirmOrder":
          result = await confirmOrder(selectedOrder._id, actionNotes);
          break;
        case "markPacked":
          result = await markAsPacked(selectedOrder._id, actionNotes);
          break;
        case "assignDeliveryman":
          if (!selectedDeliveryman) {
            toast.error("Please select a deliveryman");
            return;
          }
          result = await assignDeliveryman(
            selectedOrder._id,
            selectedDeliveryman
          );
          break;
        case "markDelivered":
          result = await markAsDelivered(selectedOrder._id, actionNotes);
          break;
        case "receivePayment":
          result = await receivePaymentFromDeliveryman(
            selectedOrder._id,
            actionNotes
          );
          break;
        default:
          toast.error("Invalid action");
          return;
      }

      if (result.success) {
        toast.success(result.message);
        setShowActionDialog(false);
        setActionNotes("");
        setCashAmount(0);
        setSelectedDeliveryman("");
        loadData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error performing action:", error);
      toast.error("Failed to perform action");
    } finally {
      setActionLoading(false);
    }
  };

  const openActionDialog = (order: OrderWithTracking, type: string) => {
    setSelectedOrder(order);
    setActionType(type);
    setCashAmount(order.totalPrice);
    setShowActionDialog(true);
  };

  const canPerformAction = (
    order: OrderWithTracking,
    action: string
  ): boolean => {
    if (!employee) return false;

    switch (action) {
      case "confirmAddress":
        return (
          employee.role === "callcenter" && !order.tracking?.addressConfirmedBy
        );
      case "confirmOrder":
        return (
          (employee.role === "callcenter" || employee.role === "incharge") &&
          !!order.tracking?.addressConfirmedBy &&
          !order.tracking?.orderConfirmedBy
        );
      case "markPacked":
        return (
          (employee.role === "packer" || employee.role === "incharge") &&
          !!order.tracking?.orderConfirmedBy &&
          !order.tracking?.packedBy
        );
      case "assignDeliveryman":
        return (
          (employee.role === "packer" || employee.role === "incharge") &&
          !!order.tracking?.packedBy &&
          !order.tracking?.assignedDeliverymanId
        );
      case "markDelivered":
        return (
          (employee.role === "deliveryman" || employee.role === "incharge") &&
          !!order.tracking?.assignedDeliverymanId &&
          !order.tracking?.deliveredBy
        );
      case "receivePayment":
        return (
          (employee.role === "accounts" || employee.role === "incharge") &&
          !!order.tracking?.cashCollected &&
          !order.tracking?.paymentReceivedBy
        );
      default:
        return false;
    }
  };

  const getOrderProgress = (order: OrderWithTracking): number => {
    let progress = 0;
    if (order.tracking?.addressConfirmedBy) progress += 16.67;
    if (order.tracking?.orderConfirmedBy) progress += 16.67;
    if (order.tracking?.packedBy) progress += 16.67;
    if (order.tracking?.assignedDeliverymanId) progress += 16.67;
    if (order.tracking?.deliveredBy) progress += 16.67;
    if (order.tracking?.paymentReceivedBy) progress += 16.65;
    return progress;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">
            You are not assigned as an employee
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please contact your administrator
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Order Management</h1>
          <p className="text-gray-600">
            Role:{" "}
            <span className="font-semibold">
              {getRoleDisplayName(employee.role)}
            </span>
          </p>
        </div>
        <Button onClick={loadData} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Action</p>
              <p className="text-2xl font-bold">
                {
                  orders.filter((o) => {
                    if (employee.role === "callcenter")
                      return !o.tracking?.orderConfirmedBy;
                    if (employee.role === "packer")
                      return (
                        !o.tracking?.packedBy && o.tracking?.orderConfirmedBy
                      );
                    if (employee.role === "deliveryman")
                      return (
                        !o.tracking?.deliveredBy &&
                        o.tracking?.assignedDeliverymanId
                      );
                    return false;
                  }).length
                }
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold">
                {orders.filter((o) => o.tracking?.deliveredBy).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-base" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Your Performance</p>
              <p className="text-2xl font-bold">
                {employee.performance?.ordersProcessed || 0}
              </p>
            </div>
            <User className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">No orders to display</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Order #{order.orderNumber.slice(0, 8)}...
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.customerName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        order.status === "delivered" ? "default" : "secondary"
                      }
                    >
                      {order.status}
                    </Badge>
                    <Badge
                      variant={
                        order.paymentStatus === "paid"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(getOrderProgress(order))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getOrderProgress(order)}%` }}
                    />
                  </div>
                </div>

                {/* Order Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">Amount:</span> $
                      {order.totalPrice}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-semibold">City:</span>{" "}
                      {order.address.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span className="font-semibold">Items:</span>{" "}
                      {order.products.length}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold">Date:</span>{" "}
                      {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Tracking Info */}
                {order.tracking && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-sm">
                      Tracking Information
                    </h4>
                    <div className="space-y-1 text-xs">
                      {order.tracking.addressConfirmedBy && (
                        <p className="text-gray-600">
                          ✓ Address confirmed by{" "}
                          {order.tracking.addressConfirmedBy}
                        </p>
                      )}
                      {order.tracking.orderConfirmedBy && (
                        <p className="text-gray-600">
                          ✓ Order confirmed by {order.tracking.orderConfirmedBy}
                        </p>
                      )}
                      {order.tracking.packedBy && (
                        <p className="text-gray-600">
                          ✓ Packed by {order.tracking.packedBy}
                        </p>
                      )}
                      {order.tracking.assignedDeliverymanName && (
                        <p className="text-gray-600">
                          ✓ Assigned to {order.tracking.assignedDeliverymanName}
                        </p>
                      )}
                      {order.tracking.deliveredBy && (
                        <p className="text-gray-600">
                          ✓ Delivered by {order.tracking.deliveredBy}
                        </p>
                      )}
                      {order.tracking.paymentReceivedBy && (
                        <p className="text-gray-600">
                          ✓ Payment received by{" "}
                          {order.tracking.paymentReceivedBy}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {canPerformAction(order, "confirmAddress") && (
                    <Button
                      size="sm"
                      onClick={() => openActionDialog(order, "confirmAddress")}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      Confirm Address
                    </Button>
                  )}
                  {canPerformAction(order, "confirmOrder") && (
                    <Button
                      size="sm"
                      onClick={() => openActionDialog(order, "confirmOrder")}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Confirm Order
                    </Button>
                  )}
                  {canPerformAction(order, "markPacked") && (
                    <Button
                      size="sm"
                      onClick={() => openActionDialog(order, "markPacked")}
                      className="flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Mark as Packed
                    </Button>
                  )}
                  {canPerformAction(order, "assignDeliveryman") && (
                    <Button
                      size="sm"
                      onClick={() =>
                        openActionDialog(order, "assignDeliveryman")
                      }
                      className="flex items-center gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      Assign Deliveryman
                    </Button>
                  )}
                  {canPerformAction(order, "markDelivered") && (
                    <Button
                      size="sm"
                      onClick={() => openActionDialog(order, "markDelivered")}
                      className="flex items-center gap-2 bg-success-base hover:bg-success-base"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark as Delivered
                    </Button>
                  )}
                  {canPerformAction(order, "receivePayment") && (
                    <Button
                      size="sm"
                      onClick={() => openActionDialog(order, "receivePayment")}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                    >
                      <DollarSign className="h-4 w-4" />
                      Receive Payment
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "confirmAddress" && "Confirm Address"}
              {actionType === "confirmOrder" && "Confirm Order"}
              {actionType === "markPacked" && "Mark as Packed"}
              {actionType === "assignDeliveryman" && "Assign Deliveryman"}
              {actionType === "markDelivered" && "Mark as Delivered"}
              {actionType === "receivePayment" && "Receive Payment"}
            </DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "assignDeliveryman" && (
              <div>
                <Label htmlFor="deliveryman">Select Deliveryman</Label>
                <Select
                  value={selectedDeliveryman}
                  onValueChange={setSelectedDeliveryman}
                >
                  <SelectTrigger id="deliveryman">
                    <SelectValue placeholder="Choose deliveryman" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliverymen.map((dm) => (
                      <SelectItem key={dm._id} value={dm._id}>
                        {dm.firstName} {dm.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionType === "markDelivered" && (
              <div>
                <Label htmlFor="cashAmount">Cash Collected Amount</Label>
                <Input
                  id="cashAmount"
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  placeholder="Enter amount"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Order total: ${selectedOrder?.totalPrice}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={actionLoading}>
              {actionLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
