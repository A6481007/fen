import { writeClient } from "@/sanity/lib/client";
import { v4 as uuidv4 } from "uuid";

export type NotificationType =
  | "promo"
  | "order"
  | "system"
  | "marketing"
  | "general";
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

interface CreateNotificationParams {
  clerkUserId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  sentBy?: string;
}

interface OrderStatusNotificationParams {
  clerkUserId: string;
  orderNumber: string;
  orderId: string;
  status: string;
  previousStatus?: string;
}

/**
 * Creates a notification for a user in Sanity
 */
export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const {
      clerkUserId,
      title,
      message,
      type,
      priority = "medium",
      actionUrl,
      sentBy = "System",
    } = params;

    // Fetch the user from Sanity
    const user = await writeClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
      { clerkUserId }
    );

    if (!user) {
      console.error("User not found:", clerkUserId);
      return { success: false, error: "User not found" };
    }

    // Create the notification object
    const notification = {
      id: uuidv4(),
      title,
      message,
      type,
      read: false,
      priority,
      sentAt: new Date().toISOString(),
      sentBy,
      ...(actionUrl && { actionUrl }),
    };

    // Get existing notifications or initialize empty array
    const existingNotifications = user.notifications || [];

    // Add new notification to the beginning of the array
    const updatedNotifications = [notification, ...existingNotifications];

    // Update the user document with the new notification
    await writeClient
      .patch(user._id)
      .set({ notifications: updatedNotifications })
      .commit();

    return { success: true, notification };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: "Failed to create notification" };
  }
};

/**
 * Get notification message based on order status
 */
const getOrderStatusMessage = (
  status: string,
  orderNumber: string,
  previousStatus?: string
): { title: string; message: string; priority: NotificationPriority } => {
  switch (status.toLowerCase()) {
    case "pending":
      return {
        title: "Order Received ✅",
        message: `Thank you for your order #${orderNumber}! We've received it and will confirm it shortly.`,
        priority: "medium",
      };
    case "quotation_requested":
      return {
        title: "Quotation Requested",
        message: `Your quotation #${orderNumber} has been generated. You can review and accept it anytime.`,
        priority: "medium",
      };
    case "address_confirmed":
      return {
        title: "Address Confirmed",
        message: `Your delivery address for order #${orderNumber} has been confirmed. We're processing your order now.`,
        priority: "medium",
      };
    case "order_confirmed":
      return {
        title: "Order Confirmed ✅",
        message: `Great news! Your order #${orderNumber} has been confirmed and will be packed soon.`,
        priority: "high",
      };
    case "packed":
      return {
        title: "Order Packed 📦",
        message: `Your order #${orderNumber} has been carefully packed and will be dispatched for delivery soon.`,
        priority: "high",
      };
    case "ready_for_delivery":
      return {
        title: "Ready for Delivery",
        message: `Order #${orderNumber} is ready for delivery and has been assigned to our delivery partner.`,
        priority: "high",
      };
    case "processing":
      return {
        title: "Order Processing",
        message: `Great news! Your order #${orderNumber} is now being processed. We're preparing your items for shipment.`,
        priority: "medium",
      };
    case "paid":
      return {
        title: "Payment Confirmed ✅",
        message: `Payment for order #${orderNumber} has been successfully confirmed. Your order will be processed shortly.`,
        priority: "high",
      };
    case "shipped":
      return {
        title: "Order Shipped! 🚚",
        message: `Exciting news! Your order #${orderNumber} has been shipped and is on its way to you. You can track your package using the tracking information.`,
        priority: "high",
      };
    case "out_for_delivery":
      return {
        title: "Out for Delivery �",
        message: `Your order #${orderNumber} is out for delivery! It should arrive at your doorstep today. Please be available to receive it.`,
        priority: "urgent",
      };
    case "delivered":
      return {
        title: "Order Delivered! 🎉",
        message: `Your order #${orderNumber} has been successfully delivered. We hope you enjoy your purchase! Please leave a review if you're satisfied.`,
        priority: "high",
      };
    case "completed":
      return {
        title: "Order Completed",
        message: `Order #${orderNumber} has been completed. Thank you for shopping with us!`,
        priority: "medium",
      };
    case "cancelled":
      return {
        title: "Order Cancelled",
        message: `Your order #${orderNumber} has been cancelled. If you didn't request this cancellation or have any questions, please contact our support team.`,
        priority: "urgent",
      };
    case "rescheduled":
      return {
        title: "Delivery Rescheduled",
        message: `The delivery for order #${orderNumber} has been rescheduled. We'll keep you updated with the new delivery date.`,
        priority: "high",
      };
    case "failed_delivery":
      return {
        title: "Delivery Attempt Failed",
        message: `We couldn't deliver order #${orderNumber}. Our team will contact you to reschedule the delivery.`,
        priority: "urgent",
      };
    default:
      return {
        title: "Order Status Updated",
        message: `The status of your order #${orderNumber} has been updated to: ${status}.`,
        priority: "medium",
      };
  }
};

/**
 * Send order status notification to user
 */
export const sendOrderStatusNotification = async (
  params: OrderStatusNotificationParams
) => {
  try {
    const { clerkUserId, orderNumber, orderId, status, previousStatus } =
      params;

    const { title, message, priority } = getOrderStatusMessage(
      status,
      orderNumber,
      previousStatus
    );

    // Get base URL from environment or fallback to localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const actionUrl = `${baseUrl}/user/orders/${orderId}`;

    const result = await createNotification({
      clerkUserId,
      title,
      message,
      type: "order",
      priority,
      actionUrl,
      sentBy: "ShopCart System",
    });

    return result;
  } catch (error) {
    console.error("Error sending order status notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
};

/**
 * Send bulk notifications to multiple users
 */
export const sendBulkNotifications = async (
  userIds: string[],
  notificationData: Omit<CreateNotificationParams, "clerkUserId">
) => {
  try {
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        createNotification({
          clerkUserId: userId,
          ...notificationData,
        })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: true,
      total: userIds.length,
      successful,
      failed,
    };
  } catch (error) {
    console.error("Error sending bulk notifications:", error);
    return { success: false, error: "Failed to send bulk notifications" };
  }
};
