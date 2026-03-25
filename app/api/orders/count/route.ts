import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total count of orders for this user
    const query = `count(*[_type == 'order' && clerkUserId == $userId])`;
    const totalOrders = await client.fetch(query, { userId: user.id });

    return NextResponse.json({
      success: true,
      totalOrders: totalOrders || 0,
    });
  } catch (error: unknown) {
    console.error("Error fetching orders count:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch orders count";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
