import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

export async function GET() {
  try {
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

    // Fetch users with approved business accounts
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
