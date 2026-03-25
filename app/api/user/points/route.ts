import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { calculatePointsUpdate } from "@/lib/pointsCalculation";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderTotal, orderId } = body;

    if (!orderTotal || !orderId) {
      return NextResponse.json(
        { error: "Order total and order ID are required" },
        { status: 400 }
      );
    }

    // Get user from Sanity
    const sanityUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{
        _id,
        rewardPoints,
        loyaltyPoints,
        totalSpent,
        "completedOrders": count(*[_type == "order" && user._ref == ^._id && status == "completed"])
      }`,
      { clerkUserId: userId }
    );

    if (!sanityUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate points update
    const pointsUpdate = calculatePointsUpdate(
      orderTotal,
      sanityUser.completedOrders || 0,
      sanityUser.rewardPoints || 0,
      sanityUser.loyaltyPoints || 0
    );

    // Update user points and total spent
    const updatedUser = await backendClient
      .patch(sanityUser._id)
      .set({
        rewardPoints: pointsUpdate.rewardPoints,
        loyaltyPoints: pointsUpdate.loyaltyPoints,
        totalSpent: (sanityUser.totalSpent || 0) + orderTotal,
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      user: updatedUser,
      pointsEarned: {
        rewardPoints:
          pointsUpdate.rewardPoints - (sanityUser.rewardPoints || 0),
        loyaltyPoints:
          pointsUpdate.loyaltyPoints - (sanityUser.loyaltyPoints || 0),
      },
      messages: pointsUpdate.message,
    });
  } catch (error) {
    console.error("Error updating user points:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user points and stats
    const userStats = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{
        _id,
        rewardPoints,
        loyaltyPoints,
        totalSpent,
        lastLogin,
        "completedOrders": count(*[_type == "order" && user._ref == ^._id && status == "completed"]),
        "pendingOrders": count(*[_type == "order" && user._ref == ^._id && status in ["pending", "processing"]]),
        "totalOrders": count(*[_type == "order" && user._ref == ^._id])
      }`,
      { clerkUserId: userId }
    );

    if (!userStats) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      stats: userStats,
    });
  } catch (error) {
    console.error("Error fetching user points:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
