import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, type, reason } = await req.json();

    if (!accountId || !type || !reason) {
      return NextResponse.json(
        { error: "Account ID, type, and reason are required" },
        { status: 400 }
      );
    }

    if (!["premium", "business"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    // First, verify the user document exists and has active status
    const existingUser = await backendClient.fetch(
      `*[_type == "userType" && _id == $accountId][0]`,
      { accountId }
    );

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentStatus =
      type === "premium"
        ? existingUser.premiumStatus
        : existingUser.businessStatus;

    if (currentStatus !== "active") {
      return NextResponse.json(
        { error: `${type} account is not active` },
        { status: 400 }
      );
    }

    // Prepare the update data to cancel the account
    const updateData =
      type === "premium"
        ? {
            premiumStatus: "cancelled",
            premiumCancelledAt: new Date().toISOString(),
            premiumCancellationReason: reason,
          }
        : {
            businessStatus: "cancelled",
            businessCancelledAt: new Date().toISOString(),
            businessCancellationReason: reason,
          };

    // Use a transaction to update the user document
    const result = await backendClient
      .transaction()
      .patch(accountId, { set: updateData })
      .commit();

    return NextResponse.json({
      success: true,
      message: `${type} account cancelled successfully`,
      result,
    });
  } catch (error) {
    console.error("Error cancelling account:", error);

    // Detailed error logging
    if (error && typeof error === "object") {
      const err = error as {
        message?: string;
        statusCode?: number;
        responseBody?: unknown;
        details?: unknown;
      };
      console.error("Error details:", {
        message: err.message,
        statusCode: err.statusCode,
        responseBody: err.responseBody,
        details: err.details,
      });
    }

    return NextResponse.json(
      {
        error: "Failed to cancel account",
        details: error instanceof Error ? error.message : "Unknown error",
        type: "server_error",
      },
      { status: 500 }
    );
  }
}
