import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { isUserAdmin } from "@/lib/adminUtils";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress;

  if (!email || !isUserAdmin(email)) {
    return NextResponse.json({ success: false, message: "Forbidden: admin access required" }, { status: 403 });
  }

  return { email };
}

export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    // Get count of pending premium requests
    const pendingPremiumCount = await client.fetch(`
      count(*[_type == "userType" && premiumStatus == "pending"])
    `);

    // Get count of pending dealer requests
    const pendingBusinessCount = await client.fetch(`
      count(*[_type == "userType" && businessStatus == "pending"])
    `);

    // Get recent requests (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRequests = await client.fetch(`
      count(*[_type == "userType" && (
        (premiumStatus == "pending" && premiumAppliedAt > "${sevenDaysAgo.toISOString()}") ||
        (businessStatus == "pending" && businessAppliedAt > "${sevenDaysAgo.toISOString()}")
      )])
    `);

    return NextResponse.json({
      success: true,
      pendingPremiumCount,
      pendingBusinessCount,
      totalPendingRequests: pendingPremiumCount + pendingBusinessCount,
      recentRequests,
    });
  } catch (error) {
    console.error("Error fetching account requests summary:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch account requests summary" },
      { status: 500 }
    );
  }
}
