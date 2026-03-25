"use client";

import React, { useEffect, useState } from "react";
import { useClient } from "sanity";
import { Card, Stack, Flex, Text, Heading, Box, Badge, Button, Grid } from "@sanity/ui";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  todayOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockProducts: number;
  totalUsers: number;
  newUsersThisWeek: number;
  pendingReviews: number;
  pendingAccessRequests: number;
  activePromotions: number;
  newContacts: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  totalPrice: number;
  status: string;
  orderDate: string;
}

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];

const statusColors: Record<string, string> = {
  pending: "#F59E0B",
  address_confirmed: "#06B6D4",
  order_confirmed: "#10B981",
  packed: "#8B5CF6",
  out_for_delivery: "#3B82F6",
  delivered: "#22C55E",
  cancelled: "#EF4444",
};

export default function Dashboard() {
  const client = useClient({ apiVersion: "2023-10-01" });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch all stats in parallel
        const [
          totalOrders,
          pendingOrders,
          todayOrders,
          revenueData,
          totalProducts,
          lowStockProducts,
          totalUsers,
          newUsersThisWeek,
          pendingReviews,
          pendingAccessRequests,
          activePromotions,
          newContacts,
          recent,
          weekSales,
        ] = await Promise.all([
          client.fetch<number>('count(*[_type == "order"])'),
          client.fetch<number>('count(*[_type == "order" && status == "pending"])'),
          client.fetch<number>(
            'count(*[_type == "order" && orderDate >= $today])',
            { today: new Date().toISOString().split("T")[0] }
          ),
          client.fetch<{ total: number }[]>(
            '*[_type == "order" && paymentStatus == "paid"] { "total": totalPrice }'
          ),
          client.fetch<number>('count(*[_type == "product"])'),
          client.fetch<number>('count(*[_type == "product" && stock < 10])'),
          client.fetch<number>('count(*[_type == "user"])'),
          client.fetch<number>(
            'count(*[_type == "user" && createdAt >= $weekAgo])',
            { weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
          ),
          client.fetch<number>('count(*[_type == "review" && status == "pending"])'),
          client.fetch<number>(
            'count(*[_type == "userAccessRequest" && status == "pending"])'
          ),
          client.fetch<number>('count(*[_type == "promotion" && status == "active"])'),
          client.fetch<number>('count(*[_type == "contact" && status == "new"])'),
          client.fetch<RecentOrder[]>(
            '*[_type == "order"] | order(orderDate desc) [0...5] { _id, orderNumber, customerName, totalPrice, status, orderDate }'
          ),
          client.fetch<any[]>(
            '*[_type == "order" && orderDate >= $weekAgo] { orderDate, totalPrice }'
              .replace("$weekAgo", `"${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}"`)
          ),
        ]);

        const totalRevenue = revenueData.reduce((sum, order) => sum + (order.total || 0), 0);

        setStats({
          totalOrders,
          pendingOrders,
          todayOrders,
          totalRevenue,
          totalProducts,
          lowStockProducts,
          totalUsers,
          newUsersThisWeek,
          pendingReviews,
          pendingAccessRequests,
          activePromotions,
          newContacts,
        });

        setRecentOrders(recent);

        // Process sales data for chart
        const salesByDay = weekSales.reduce((acc: Record<string, number>, order: any) => {
          const day = new Date(order.orderDate).toLocaleDateString("en-US", { weekday: "short" });
          acc[day] = (acc[day] || 0) + (order.totalPrice || 0);
          return acc;
        }, {});

        setSalesData(
          Object.entries(salesByDay).map(([day, sales]) => ({ day, sales }))
        );

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [client]);

  if (loading) {
    return (
      <Box padding={4}>
        <Text>Loading dashboard...</Text>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box padding={4}>
        <Text>Failed to load dashboard data</Text>
      </Box>
    );
  }

  return (
    <Box padding={4} style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Stack space={5}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading size={3}>📊 Dashboard Overview</Heading>
          <Text size={1} muted>
            Last updated: {new Date().toLocaleString()}
          </Text>
        </Flex>

        {/* Quick Stats Grid */}
        <Grid columns={[1, 2, 4]} gap={4}>
          {/* Orders */}
          <Card padding={4} radius={2} shadow={1} tone="primary">
            <Stack space={3}>
              <Text size={1} muted>
                📦 Total Orders
              </Text>
              <Heading size={4}>{stats.totalOrders.toLocaleString()}</Heading>
              <Flex gap={2}>
                <Badge tone="caution">{stats.pendingOrders} pending</Badge>
                <Badge tone="positive">{stats.todayOrders} today</Badge>
              </Flex>
            </Stack>
          </Card>

          {/* Revenue */}
          <Card padding={4} radius={2} shadow={1} tone="positive">
            <Stack space={3}>
              <Text size={1} muted>
                💰 Total Revenue
              </Text>
              <Heading size={4}>${stats.totalRevenue.toLocaleString()}</Heading>
              <Text size={1} muted>
                From paid orders
              </Text>
            </Stack>
          </Card>

          {/* Products */}
          <Card padding={4} radius={2} shadow={1}>
            <Stack space={3}>
              <Text size={1} muted>
                🛍️ Products
              </Text>
              <Heading size={4}>{stats.totalProducts.toLocaleString()}</Heading>
              {stats.lowStockProducts > 0 && (
                <Badge tone="critical">⚠️ {stats.lowStockProducts} low stock</Badge>
              )}
            </Stack>
          </Card>

          {/* Users */}
          <Card padding={4} radius={2} shadow={1}>
            <Stack space={3}>
              <Text size={1} muted>
                👥 Total Users
              </Text>
              <Heading size={4}>{stats.totalUsers.toLocaleString()}</Heading>
              <Badge tone="primary">+{stats.newUsersThisWeek} this week</Badge>
            </Stack>
          </Card>
        </Grid>

        {/* Action Items */}
        <Card padding={4} radius={2} shadow={1} tone="caution">
          <Stack space={3}>
            <Heading size={2}>⚡ Requires Attention</Heading>
            <Grid columns={[1, 2, 4]} gap={3}>
              {stats.pendingOrders > 0 && (
                <Card padding={3} radius={2} tone="caution">
                  <Stack space={2}>
                    <Text weight="semibold">🔴 {stats.pendingOrders} Pending Orders</Text>
                    <Text size={1} muted>
                      Need confirmation
                    </Text>
                  </Stack>
                </Card>
              )}
              {stats.pendingReviews > 0 && (
                <Card padding={3} radius={2} tone="caution">
                  <Stack space={2}>
                    <Text weight="semibold">⭐ {stats.pendingReviews} Pending Reviews</Text>
                    <Text size={1} muted>
                      Awaiting moderation
                    </Text>
                  </Stack>
                </Card>
              )}
              {stats.pendingAccessRequests > 0 && (
                <Card padding={3} radius={2} tone="caution">
                  <Stack space={2}>
                    <Text weight="semibold">
                      👤 {stats.pendingAccessRequests} Access Requests
                    </Text>
                    <Text size={1} muted>
                      Need approval
                    </Text>
                  </Stack>
                </Card>
              )}
              {stats.newContacts > 0 && (
                <Card padding={3} radius={2} tone="caution">
                  <Stack space={2}>
                    <Text weight="semibold">💬 {stats.newContacts} New Messages</Text>
                    <Text size={1} muted>
                      Unread contacts
                    </Text>
                  </Stack>
                </Card>
              )}
            </Grid>
          </Stack>
        </Card>

        {/* Charts Row */}
        <Grid columns={[1, 2]} gap={4}>
          {/* Sales Chart */}
          <Card padding={4} radius={2} shadow={1}>
            <Stack space={4}>
              <Heading size={2}>📈 Sales This Week</Heading>
              <Box style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Stack>
          </Card>

          {/* Recent Orders */}
          <Card padding={4} radius={2} shadow={1}>
            <Stack space={4}>
              <Heading size={2}>🕐 Recent Orders</Heading>
              <Stack space={3}>
                {recentOrders.map((order) => (
                  <Card key={order._id} padding={3} radius={2} tone="transparent">
                    <Flex justify="space-between" align="center">
                      <Stack space={1}>
                        <Text weight="semibold">{order.customerName}</Text>
                        <Text size={1} muted>
                          {order.orderNumber.slice(0, 8)}...
                        </Text>
                      </Stack>
                      <Stack space={1} style={{ textAlign: "right" }}>
                        <Text weight="semibold">${order.totalPrice}</Text>
                        <Badge
                          style={{
                            backgroundColor: statusColors[order.status] || "#6B7280",
                            color: "white",
                          }}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </Stack>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Grid>

        {/* Marketing Stats */}
        <Card padding={4} radius={2} shadow={1} tone="positive">
          <Stack space={3}>
            <Heading size={2}>📢 Marketing Overview</Heading>
            <Grid columns={[2, 4]} gap={3}>
              <Stack space={1}>
                <Text size={1} muted>
                  Active Promotions
                </Text>
                <Heading size={3}>{stats.activePromotions}</Heading>
              </Stack>
              <Stack space={1}>
                <Text size={1} muted>
                  Low Stock Alerts
                </Text>
                <Heading size={3}>{stats.lowStockProducts}</Heading>
              </Stack>
              <Stack space={1}>
                <Text size={1} muted>
                  New Users (7d)
                </Text>
                <Heading size={3}>{stats.newUsersThisWeek}</Heading>
              </Stack>
              <Stack space={1}>
                <Text size={1} muted>
                  Pending Reviews
                </Text>
                <Heading size={3}>{stats.pendingReviews}</Heading>
              </Stack>
            </Grid>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
