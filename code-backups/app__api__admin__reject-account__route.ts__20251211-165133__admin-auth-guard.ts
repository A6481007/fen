import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import { backendClient } from "@/sanity/lib/backendClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, reason } = body;

    if (!userId || !type || !reason?.trim()) {
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
        businessStatus
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

    // Update the user status to rejected with reason
    const updateData: Record<string, string> = {
      [`${type}Status`]: "rejected",
      [`${type}RejectedAt`]: new Date().toISOString(),
      rejectionReason: reason.trim(),
    };

    await backendClient.patch(userId).set(updateData).commit();

    return NextResponse.json({
      success: true,
      message: `❌ ${
        type === "premium" ? "Premium" : "Business"
      } account rejected for ${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    console.error("Error rejecting account:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reject account" },
      { status: 500 }
    );
  }
}
