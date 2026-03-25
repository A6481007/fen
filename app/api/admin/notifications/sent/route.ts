import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { client } from "@/sanity/lib/client";

interface SentNotification {
  _id?: string;
  notificationId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  sentAt: string;
  sentBy: string;
  actionUrl?: string;
  recipientCount: number;
  recipients?: string[];
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type") || "";
    const priority = searchParams.get("priority") || "";
    const dateFilter = searchParams.get("dateFilter") || "";

    // Build filter conditions
    const filterConditions = [];
    if (type && type !== "all") {
      filterConditions.push(`type == "${type}"`);
    }
    if (priority && priority !== "all") {
      filterConditions.push(`priority == "${priority}"`);
    }

    // Add date filter conditions
    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      let dateCondition = "";

      switch (dateFilter) {
        case "today":
          const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          ).toISOString();
          dateCondition = `sentAt >= "${todayStart}"`;
          break;
        case "week":
          const weekStart = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000
          ).toISOString();
          dateCondition = `sentAt >= "${weekStart}"`;
          break;
        case "month":
          const monthStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          ).toISOString();
          dateCondition = `sentAt >= "${monthStart}"`;
          break;
      }

      if (dateCondition) {
        filterConditions.push(dateCondition);
      }
    }

    // Build GROQ query
    const query = `
      *[_type == "sentNotification"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }] | order(sentAt desc) [${offset}...${offset + limit}] {
        _id,
        notificationId,
        title,
        message,
        type,
        priority,
        sentAt,
        sentBy,
        actionUrl,
        recipientCount,
        recipients
      }
    `;

    // Get count query
    const countQuery = `
      count(*[_type == "sentNotification"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }])
    `;

    // Execute queries
    const [notifications, totalCount] = await Promise.all([
      client.fetch(query),
      client.fetch(countQuery),
    ]);

    // Transform the data to match the interface
    const transformedNotifications = notifications.map((notification: any) => ({
      id: notification._id, // Use Sanity _id for deletion
      notificationId: notification.notificationId, // Keep original notificationId
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      sentAt: notification.sentAt,
      sentBy: notification.sentBy,
      actionUrl: notification.actionUrl,
      recipientCount: notification.recipientCount,
      recipients: notification.recipients || [],
    }));

    return NextResponse.json({
      notifications: transformedNotifications,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching sent notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
