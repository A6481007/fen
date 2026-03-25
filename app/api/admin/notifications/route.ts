import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { client } from "@/sanity/lib/client";

interface Order {
  _id: string;
  _createdAt: string;
  orderNumber?: string;
  customerName?: string;
  email?: string;
  totalPrice: number;
}

interface Product {
  _id: string;
  name: string;
  title?: string;
  stock: number;
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

    // Get recent orders for notifications
    const recentOrders = await client.fetch(`
      *[_type == "order"] | order(_createdAt desc) [0...10] {
        _id,
        _createdAt,
        orderNumber,
        customerName,
        email,
        totalPrice,
        status
      }
    `);

    // Get recent products for low stock notifications
    const lowStockProducts = await client.fetch(`
      *[_type == "product" && stock < 10] | order(_createdAt desc) [0...5] {
        _id,
        title,
        stock
      }
    `);

    // Generate notifications
    const notifications = [
      // Order notifications
      ...recentOrders.map((order: Order) => ({
        id: `order-${order._id}`,
        title: `New order ${order.orderNumber || `#${order._id.slice(-6)}`}`,
        description: `${order.customerName || order.email} - $${
          order.totalPrice
        }`,
        time: getTimeAgo(new Date(order._createdAt)),
        type: "order",
        icon: "shopping-cart",
      })),

      // Low stock notifications
      ...lowStockProducts.map((product: Product) => ({
        id: `stock-${product._id}`,
        title: "Low stock alert",
        description: `${product.title} - Only ${product.stock} left`,
        time: "Today",
        type: "warning",
        icon: "alert-triangle",
      })),

      // System notification
      {
        id: "system-1",
        title: "Daily backup completed",
        description: "All data has been successfully backed up",
        time: "2 hours ago",
        type: "success",
        icon: "check-circle",
      },
    ].slice(0, 15); // Limit to 15 notifications

    return NextResponse.json({
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
}
