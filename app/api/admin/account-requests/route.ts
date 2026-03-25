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

    // Fetch users with pending premium requests
    const premiumRequests = await client.fetch(`
      *[_type == "userType" && premiumStatus == "pending"] {
        _id,
        firstName,
        lastName,
        email,
        premiumStatus,
        businessStatus,
        premiumAppliedAt,
        businessAppliedAt,
        premiumApprovedAt,
        businessApprovedAt,
        rejectionReason
      } | order(premiumAppliedAt desc)
    `);

    // Fetch users with pending business requests
    const businessRequests = await client.fetch(`
      *[_type == "userType" && businessStatus == "pending"] {
        _id,
        firstName,
        lastName,
        email,
        premiumStatus,
        businessStatus,
        premiumAppliedAt,
        businessAppliedAt,
        premiumApprovedAt,
        businessApprovedAt,
        rejectionReason
      } | order(businessAppliedAt desc)
    `);

    // Fetch users with approved premium accounts
    const approvedPremiumAccounts = await client.fetch(`
      *[_type == "userType" && premiumStatus == "active"] {
        _id,
        firstName,
        lastName,
        email,
        premiumStatus,
        businessStatus,
        premiumAppliedAt,
        businessAppliedAt,
        premiumApprovedAt,
        businessApprovedAt,
        rejectionReason
      } | order(premiumApprovedAt desc)
    `);

    // Fetch users with approved dealer accounts
    const approvedBusinessAccounts = await client.fetch(`
      *[_type == "userType" && businessStatus == "active"] {
        _id,
        firstName,
        lastName,
        email,
        premiumStatus,
        businessStatus,
        premiumAppliedAt,
        businessAppliedAt,
        premiumApprovedAt,
        businessApprovedAt,
        rejectionReason
      } | order(businessApprovedAt desc)
    `);

    // Fetch all users with any account status for statistics
    const allUsers = await client.fetch(`
      *[_type == "userType" && (premiumStatus != "none" || businessStatus != "none")] {
        _id,
        firstName,
        lastName,
        email,
        premiumStatus,
        businessStatus,
        premiumAppliedAt,
        businessAppliedAt,
        premiumApprovedAt,
        businessApprovedAt,
        rejectionReason
      }
    `);

    const response = NextResponse.json({
      success: true,
      premiumRequests,
      businessRequests,
      approvedPremiumAccounts,
      approvedBusinessAccounts,
      allUsers,
    });

    // Add cache control headers to prevent stale data
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error fetching account requests:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch account requests" },
      { status: 500 }
    );
  }
}
