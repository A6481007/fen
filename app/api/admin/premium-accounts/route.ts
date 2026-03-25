import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all users with premium applications
    const query = `
      *[_type == "userType" && premiumStatus in ["pending", "active", "rejected"]] {
        _id,
        email,
        firstName,
        lastName,
        isActive,
        premiumStatus,
        businessStatus,
        isBusiness,
        premiumAppliedAt,
        premiumApprovedBy,
        premiumApprovedAt,
        rejectionReason,
        membershipType,
        createdAt
      } | order(premiumAppliedAt desc)
    `;

    const accounts = await client.fetch(query);

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error("Error fetching premium accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch premium accounts" },
      { status: 500 }
    );
  }
}
