import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import {
  getUserOrders,
  getUserWishlist,
  getUserNotifications,
  getUserByClerkId,
} from "@/sanity/queries/userQueries";
import { getUserRegistrationsWithEvents } from "@/sanity/queries/events";
import type { Address } from "@/lib/address";
import { ORDER_STATUSES } from "@/lib/orderStatus";

interface Notification {
  read: boolean;
  id: string;
  title: string;
  message: string;
  sentAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  totalPrice?: number;
  address?: Address;
  quotationDetails?: Address;
}

interface WishlistItem {
  _id: string;
  addedAt: string;
  name?: string;
  product?: {
    name: string;
  };
}

interface EventRegistration {
  _id?: string;
  submittedAt?: string;
  confirmedAt?: string;
  registrationStatus?: string;
  event?: {
    title?: string;
    date?: string;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch real data from Sanity
    const [
      userOrders,
      userWishlist,
      userNotifications,
      userData,
      userRegistrations,
    ] =
      await Promise.all([
        getUserOrders(user.id),
        getUserWishlist(user.id),
        getUserNotifications(user.id),
        getUserByClerkId(user.id),
        getUserRegistrationsWithEvents(user.id),
      ]);

    const sortedOrders = Array.isArray(userOrders)
      ? [...userOrders].sort(
          (a: Order, b: Order) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
        )
      : [];
    const latestOrder =
      sortedOrders.find(
        (order: Order) =>
          order.status === ORDER_STATUSES.QUOTATION_REQUESTED
      ) ?? sortedOrders[0] ?? null;
    const nonQuotationOrders = sortedOrders.filter(
      (order: Order) =>
        order.status !== ORDER_STATUSES.QUOTATION_REQUESTED
    );
    const registrations = Array.isArray(userRegistrations)
      ? userRegistrations
      : [];
    const getRegistrationTimestamp = (registration: EventRegistration) => {
      const timestamp =
        registration.submittedAt ||
        registration.confirmedAt ||
        registration.event?.date;
      return timestamp ? new Date(timestamp).getTime() : 0;
    };
    const sortedRegistrations = [...registrations].sort(
      (a, b) => getRegistrationTimestamp(b) - getRegistrationTimestamp(a)
    );

    // Calculate stats from real data
    const stats = {
      ordersCount: nonQuotationOrders.length,
      wishlistCount: userWishlist?.length || 0,
      notificationsCount: userNotifications?.length || 0,
      unreadNotifications:
        userNotifications?.filter((n: Notification) => !n.read)?.length || 0,
      rewardPoints: userData?.rewardPoints || 0,
      walletBalance: userData?.walletBalance || 0,
      registrationsCount: registrations.length,
    };

    // Create recent activity from real data
    const recentActivity = [];

    // Add recent orders to activity
    if (nonQuotationOrders.length > 0) {
      const recentOrders = nonQuotationOrders.slice(0, 2);

      recentOrders.forEach((order: Order) => {
        recentActivity.push({
          id: `order-${order._id}`,
          title: `Order ${
            order.status === "delivered"
              ? "Delivered"
              : order.status === "shipped"
              ? "Shipped"
              : "Placed"
          }`,
          description: `Order #${order.orderNumber} ${
            order.status === "delivered"
              ? "has been delivered"
              : order.status === "shipped"
              ? "has been shipped"
              : "has been placed successfully"
          }`,
          timestamp: order.orderDate,
          type: "order" as const,
        });
      });
    }

    // Add recent wishlist items to activity
    if (userWishlist && userWishlist.length > 0) {
      const recentWishlistItem = userWishlist[0];
      if (recentWishlistItem) {
        recentActivity.push({
          id: `wishlist-${recentWishlistItem._id}`,
          title: "Item Added to Wishlist",
          description: `Added ${recentWishlistItem.name} to your wishlist`,
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // Approximate time
          type: "wishlist" as const,
        });
      }
    }

    if (sortedRegistrations.length > 0) {
      const latestRegistration = sortedRegistrations[0];
      const registrationTimestamp =
        latestRegistration.submittedAt ||
        latestRegistration.confirmedAt ||
        latestRegistration.event?.date ||
        new Date().toISOString();
      const eventTitle = latestRegistration.event?.title;

      recentActivity.push({
        id: `registration-${latestRegistration._id ?? eventTitle ?? "event"}`,
        title: "Event Registration",
        description: eventTitle
          ? `Registered for ${eventTitle}`
          : "New event registration submitted",
        timestamp: registrationTimestamp,
        type: "registration" as const,
      });
    }

    // Add recent notifications to activity
    if (userNotifications && userNotifications.length > 0) {
      const recentNotifications = userNotifications
        .sort(
          (a: Notification, b: Notification) =>
            new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        )
        .slice(0, 1);

      recentNotifications.forEach((notification: Notification) => {
        recentActivity.push({
          id: `notification-${notification.id}`,
          title: notification.title,
          description:
            notification.message.length > 80
              ? notification.message.substring(0, 80) + "..."
              : notification.message,
          timestamp: notification.sentAt,
          type: "notification" as const,
        });
      });
    }

    // Sort activity by timestamp (newest first) and limit to 4 items
    recentActivity.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const limitedActivity = recentActivity.slice(0, 4);

    return NextResponse.json({
      success: true,
      stats,
      recentActivity: limitedActivity,
      latestOrder,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
