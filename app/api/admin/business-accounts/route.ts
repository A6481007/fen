import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you can implement your own admin check logic)
    // For now, we'll fetch all users with dealer account requests
    const query = `
      *[_type == "userType" && businessStatus in ["pending", "active", "rejected"]] {
        _id,
        email,
        firstName,
        lastName,
        isBusiness,
        isActive,
        businessStatus,
        premiumStatus,
        businessApprovedBy,
        businessApprovedAt,
        businessAppliedAt,
        rejectionReason,
        membershipType,
        createdAt
      } | order(businessAppliedAt desc)
    `;

    const accounts = await client.fetch(query);

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error("Error fetching dealer accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch dealer accounts" },
      { status: 500 }
    );
  }
}
