import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

export async function GET() {
  try {
    // Get count of pending premium requests
    const pendingPremiumCount = await client.fetch(`
      count(*[_type == "userType" && premiumStatus == "pending"])
    `);

    // Get count of pending business requests
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
