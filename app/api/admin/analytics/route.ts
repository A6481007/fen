import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { client } from "@/sanity/lib/client";

interface OrderProduct {
  name: string;
  quantity?: number;
  price?: number;
  category?: string;
  brand?: string;
}

interface AnalyticsOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  orderDate: string;
  products?: OrderProduct[];
}

interface RevenueOrder {
  totalAmount: number;
  orderDate: string;
}

interface OrderWithStatus {
  _id: string;
  status: string;
  totalPrice?: number;
  products?: OrderProduct[];
}

interface RecentOrder {
  orderNumber: string;
  status: string;
  orderDate: string;
  totalPrice?: number;
}
interface StatusOrder {
  status: string;
}

interface PaymentMethodOrder {
  paymentMethod: string;
}

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    // Get current user details to check admin status
    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(userId);
    const userEmail = currentUser.primaryEmailAddress?.emailAddress;

    // Check if current user is admin
    if (!userEmail || !isUserAdmin(userEmail)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d"; // days
    const type = searchParams.get("type") || "overview";

    // Calculate date ranges
    const currentDate = new Date();
    const startDate = new Date();
    let periodDays = 30;

    if (period === "7d") {
      periodDays = 7;
    } else if (period === "30d") {
      periodDays = 30;
    } else if (period === "90d") {
      periodDays = 90;
    } else if (period === "365d") {
      periodDays = 365;
    }

    startDate.setDate(currentDate.getDate() - periodDays);

    // Previous period for comparison
    const prevStartDate = new Date();
    prevStartDate.setDate(startDate.getDate() - periodDays);

    if (type === "overview") {
      // Overview analytics
      const [
        currentPeriodOrders,
        previousPeriodOrders,
        totalProducts,
        totalUsers,
        recentOrders,
        ordersByStatus,
        topProducts,
      ] = await Promise.all([
        // Current period orders
        client.fetch(
          `*[_type == "order" && dateTime(orderDate) >= dateTime($startDate) && dateTime(orderDate) <= dateTime($currentDate)] {
          _id,
          totalPrice,
          status,
          orderDate,
          customerName,
          email,
          products[] {
            name,
            quantity,
            price
          }
        }`,
          {
            startDate: startDate.toISOString(),
            currentDate: currentDate.toISOString(),
          }
        ),

        // Previous period orders for comparison
        client.fetch(
          `*[_type == "order" && dateTime(orderDate) >= dateTime($prevStartDate) && dateTime(orderDate) < dateTime($startDate)] {
          _id,
          totalPrice,
          status
        }`,
          {
            prevStartDate: prevStartDate.toISOString(),
            startDate: startDate.toISOString(),
          }
        ),

        // Total products
        client.fetch(`count(*[_type == "product"])`),

        // Get users count from Clerk
        (async () => {
          try {
            return await clerk.users.getCount();
          } catch (error) {
            console.error("Error fetching users count:", error);
            return 0;
          }
        })(),

        // Recent orders
        client.fetch(
          `*[_type == "order" && dateTime(orderDate) >= dateTime($startDate)] | order(orderDate desc) [0...10] {
          _id,
          orderNumber,
          customerName,
          totalPrice,
          status,
          orderDate
        }`,
          { startDate: startDate.toISOString() }
        ),

        // Orders by status
        client.fetch(
          `*[_type == "order" && dateTime(orderDate) >= dateTime($startDate)] {
          status
        }`,
          { startDate: startDate.toISOString() }
        ),

        // Top products analysis
        client.fetch(
          `*[_type == "order" && dateTime(orderDate) >= dateTime($startDate)] {
          products[] {
            name,
            quantity,
            price
          }
        }`,
          { startDate: startDate.toISOString() }
        ),
      ]);

      // Calculate current period stats
      const currentRevenue = currentPeriodOrders
        .filter((order: OrderWithStatus) => order.status === "delivered")
        .reduce(
          (sum: number, order: OrderWithStatus) =>
            sum + (order.totalPrice || 0),
          0
        );

      const previousRevenue = previousPeriodOrders
        .filter((order: OrderWithStatus) => order.status === "delivered")
        .reduce(
          (sum: number, order: OrderWithStatus) =>
            sum + (order.totalPrice || 0),
          0
        );

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      // Order status breakdown
      const statusCounts: Record<string, number> = {};
      ordersByStatus.forEach((order: OrderWithStatus) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });

      // Process top products
      const productSales: Record<
        string,
        { name: string; sales: number; revenue: number }
      > = {};

      topProducts.forEach((order: OrderWithStatus) => {
        order.products?.forEach((product: OrderProduct) => {
          const key = product.name || "Unknown Product";
          if (!productSales[key]) {
            productSales[key] = { name: key, sales: 0, revenue: 0 };
          }
          productSales[key].sales += product.quantity || 0;
          productSales[key].revenue +=
            (product.price || 0) * (product.quantity || 0);
        });
      });

      const topProductsList = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Create recent activity
      const recentActivity = recentOrders
        .slice(0, 8)
        .map((order: RecentOrder) => ({
          action: `Order ${order.orderNumber} ${order.status}`,
          time: new Date(order.orderDate).toLocaleDateString(),
          value: `$${order.totalPrice?.toLocaleString() || 0}`,
        }));

      // Return analytics data in the format expected by the component
      const result = {
        revenue: {
          total: currentRevenue,
          change: Number(
            calculateChange(currentRevenue, previousRevenue).toFixed(1)
          ),
          trend: [], // Could add daily revenue data here
        },
        orders: {
          total: currentPeriodOrders.length,
          change: Number(
            calculateChange(
              currentPeriodOrders.length,
              previousPeriodOrders.length
            ).toFixed(1)
          ),
          pending: statusCounts["pending"] || 0,
          completed: statusCounts["delivered"] || 0,
          cancelled: statusCounts["cancelled"] || 0,
        },
        customers: {
          total: totalUsers,
          change: 5.2, // Placeholder since we don't have historical user data
          active: Math.floor(totalUsers * 0.8), // Estimated
          new: Math.floor(totalUsers * 0.1), // Estimated
        },
        products: {
          total: totalProducts,
          change: 2.1, // Placeholder
          lowStock: 0, // Would need inventory data
          outOfStock: 0, // Would need inventory data
        },
        topProducts: topProductsList,
        recentActivity: recentActivity,
      };

      return NextResponse.json(result);
    } else if (type === "sales") {
      // Sales analytics - simplified for now
      return NextResponse.json({
        salesByCategory: [],
        salesByBrand: [],
        monthlySales: [],
      });
    } else if (type === "customers") {
      // Customer analytics - simplified for now
      return NextResponse.json({
        topCustomers: [],
        customerOrders: [],
      });
    }

    return NextResponse.json(
      { error: "Invalid analytics type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
