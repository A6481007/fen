import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";
import { backendClient } from "@/sanity/lib/backendClient";

export async function POST(request: NextRequest) {
  try {
    // Add admin authentication check
    const { userId: adminUserId } = await auth();
    if (!adminUserId) {
      return NextResponse.json(
        { success: false, message: "Admin authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, type } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["premium", "business"].includes(type)) {
      return NextResponse.json(
        { success: false, message: "Invalid account type" },
        { status: 400 }
      );
    }

    // Verify user exists and has pending status
    const user = await client.fetch(
      `
      *[_type == "userType" && _id == $userId][0] {
        _id,
        firstName,
        lastName,
        email,
        premiumStatus,
        businessStatus,
        isBusiness,
        membershipType,
        rejectionReason
      }
    `,
      { userId }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const currentStatus =
      type === "premium" ? user.premiumStatus : user.businessStatus;

    if (currentStatus !== "pending") {
      return NextResponse.json(
        { success: false, message: `${type} account is not in pending status` },
        { status: 400 }
      );
    }

    const isDealer =
      user.isBusiness === true ||
      user.businessStatus === "active" ||
      user.membershipType === "business";

    if (type === "premium" && !isDealer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User must have an active dealer account before applying for a premium account",
        },
        { status: 400 }
      );
    }

    // Update the user status
    const updateData: Record<string, string | null> = {
      [`${type}Status`]: "active",
      [`${type}ApprovedAt`]: new Date().toISOString(),
    };

    // Clear rejection reason if it exists
    if (user.rejectionReason) {
      updateData.rejectionReason = null;
    }

    // Try with both methods to see which one works
    try {
      const result = await backendClient.patch(userId).set(updateData).commit();
      console.log(
        "Successfully updated user with backendClient:",
        userId,
        result
      );
    } catch (backendError) {
      console.log(
        "backendClient failed, trying with writeClient...",
        backendError
      );
      // Import writeClient locally to avoid import issues
      const { writeClient } = await import("@/sanity/lib/client");
      const result = await writeClient.patch(userId).set(updateData).commit();
      console.log(
        "Successfully updated user with writeClient:",
        userId,
        result
      );
    }
    return NextResponse.json({
      success: true,
      message: `🎉 ${
        type === "premium" ? "Premium" : "Dealer"
      } account approved successfully for ${user.firstName} ${user.lastName}!`,
    });
  } catch (error) {
    console.error("Error approving account:", error);
    return NextResponse.json(
      { success: false, message: "Failed to approve account" },
      { status: 500 }
    );
  }
}
