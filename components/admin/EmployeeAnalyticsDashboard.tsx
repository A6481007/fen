"use client";

import { useState, useEffect } from "react";
import { getCurrentEmployee, getAllEmployees } from "@/actions/employeeActions";
import { getOrdersForEmployee } from "@/actions/orderEmployeeActions";
import {
  Employee,
  OrderWithTracking,
  getRoleDisplayName,
} from "@/types/employee";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Package,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
} from "lucide-react";

export default function EmployeeAnalyticsDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<OrderWithTracking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [currentEmp, employeesData, ordersData] = await Promise.all([
        getCurrentEmployee(),
        getAllEmployees(),
        getOrdersForEmployee(),
      ]);

      setEmployee(currentEmp);
      setAllEmployees(employeesData);
      setOrders(ordersData);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const cashCollected = orders
    .filter((o) => o.tracking?.cashCollected)
    .reduce((sum, o) => sum + (o.tracking?.cashCollectedAmount || 0), 0);

  const cashPending = orders
    .filter((o) => o.tracking?.cashCollected && !o.tracking?.paymentReceivedBy)
    .reduce((sum, o) => sum + (o.tracking?.cashCollectedAmount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (
    !employee ||
    (employee.role !== "incharge" && employee.role !== "accounts")
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Access Denied</p>
          <p className="text-sm text-gray-500 mt-2">
            Only In-Charge and Accounts employees can access analytics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">
          Role:{" "}
          <span className="font-semibold">
            {getRoleDisplayName(employee.role)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-success-base" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <Package className="h-12 w-12 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cash Collected</p>
              <p className="text-2xl font-bold">${cashCollected.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Collection</p>
              <p className="text-2xl font-bold text-brand-red-accent">
                ${cashPending.toFixed(2)}
              </p>
            </div>
            <Clock className="h-12 w-12 text-brand-red-accent" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Employee Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Processed
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Confirmed
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Packed
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Delivered
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allEmployees.map((emp) => (
                <tr key={emp._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{emp.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {getRoleDisplayName(emp.role)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                    {emp.performance?.ordersProcessed || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                    {emp.performance?.ordersConfirmed || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                    {emp.performance?.ordersPacked || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                    {emp.performance?.ordersDelivered || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge
                      variant={
                        emp.status === "active"
                          ? "default"
                          : emp.status === "suspended"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {emp.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
