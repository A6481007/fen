import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMyOrders } from "@/sanity/helpers";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get orders count
    const orderData = await getMyOrders(userId, 1, 1);
    const totalOrders = orderData.totalCount || 0;

    return NextResponse.json({
      success: true,
      totalOrders,
    });
  } catch (error) {
    console.error("Error fetching orders count:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders count" },
      { status: 500 }
    );
  }
}
