import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { writeClient } from "@/sanity/lib/client";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Check if user exists in Sanity
    const userEmail = user.emailAddresses[0]?.emailAddress;
    const sanityUser = await backendClient.fetch(
      `*[_type in ["userType", "user"] && email == $email][0]{
        _id,
        email,
        firstName,
        lastName,
        isActive,
        isBusiness,
        premiumStatus,
        businessStatus,
        membershipType,
        premiumRequestEnabled,
        premiumAppliedAt,
        premiumApprovedBy,
        premiumApprovedAt,
        businessAppliedAt,
        businessApprovedBy,
        businessApprovedAt,
        rejectionReason
      }`,
      { email: userEmail }
    );

    return NextResponse.json({
      success: true,
      userExists: !!sanityUser,
      userProfile: sanityUser || null,
    });
  } catch (error) {
    console.error("Error checking user status:", error);
    return NextResponse.json(
      { error: "Failed to check user status" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Check if user already exists in Sanity
    const existingSanityUser = await backendClient.fetch(
      `*[_type == "userType" && email == $email][0]`,
      { email: userEmail }
    );

    if (!existingSanityUser) {
      return NextResponse.json(
        { success: false, error: "Please request a dealer account first." },
        { status: 404 }
      );
    }

    const isDealer =
      existingSanityUser.isBusiness === true ||
      existingSanityUser.businessStatus === "active" ||
      existingSanityUser.membershipType === "business";

    if (!isDealer) {
      return NextResponse.json(
        {
          success: false,
          error: "Dealer account approval is required before requesting premium.",
        },
        { status: 400 }
      );
    }

    if (!existingSanityUser.premiumRequestEnabled) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Premium request is not available yet. Please contact support for access.",
        },
        { status: 403 }
      );
    }

    // Check current premium status
    if (existingSanityUser.premiumStatus === "rejected") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Premium application was rejected. Please contact admin for assistance.",
        },
        { status: 400 }
      );
    }

    if (existingSanityUser.premiumStatus === "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "Premium application is already pending approval.",
        },
        { status: 400 }
      );
    }

    if (existingSanityUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "User already has premium account.",
        },
        { status: 400 }
      );
    }

    // Update existing user to pending status
    const updatedUser = await writeClient
      .patch(existingSanityUser._id)
      .set({
        premiumStatus: "pending",
        premiumAppliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      message:
        "🎉 Premium application submitted successfully! Your application is now under review and you'll be notified within 24-48 hours once it's processed.",
      userProfile: updatedUser,
    });

  } catch (error) {
    console.error("Error creating user in Sanity:", error);
    return NextResponse.json(
      { error: "Failed to register for premium services" },
      { status: 500 }
    );
  }
}
