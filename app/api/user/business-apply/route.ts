import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { writeClient, client } from "@/sanity/lib/client";
import { getPricingSettings } from "@/sanity/queries";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pricingSettings = await getPricingSettings();
    const discountPercent = Number.isFinite(pricingSettings?.dealerDiscountPercent)
      ? Math.max(0, pricingSettings.dealerDiscountPercent ?? 0)
      : 0;
    const discountLabel = Number.isInteger(discountPercent)
      ? discountPercent.toFixed(0)
      : discountPercent.toFixed(2);
    const discountMessage =
      discountPercent > 0
        ? `you'll enjoy ${discountLabel}% additional discount once approved.`
        : "you'll enjoy dealer pricing benefits once approved.";

    // Check if user exists in Sanity
    const existingUser = await client.fetch(
      `*[_type == "userType" && email == $email][0]`,
      { email }
    );

    if (!existingUser) {
      const createdUser = await writeClient.create({
        _type: "userType",
        clerkUserId: userId,
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: false,
        premiumStatus: "none",
        premiumRequestEnabled: false,
        isBusiness: false,
        businessStatus: "pending",
        membershipType: "standard",
        businessAppliedAt: new Date().toISOString(),
        rewardPoints: 0,
        loyaltyPoints: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          newsletter: true,
          emailNotifications: true,
          smsNotifications: false,
          preferredCurrency: "THB",
          preferredLanguage: "en",
        },
      });

      return NextResponse.json({
        success: true,
        message:
          `🚀 Dealer account application submitted successfully! Your application is under review and ${discountMessage}`,
        user: createdUser,
      });
    }

    // Check dealer account status
    if (existingUser.businessStatus === "rejected") {
      return NextResponse.json(
        {
          error:
            "Dealer account application was rejected. Please contact admin for assistance.",
        },
        { status: 400 }
      );
    }

    if (existingUser.businessStatus === "pending") {
      return NextResponse.json(
        { error: "Dealer account application is already pending approval." },
        { status: 400 }
      );
    }

    if (existingUser.isBusiness) {
      return NextResponse.json(
        { error: "Dealer account already approved" },
        { status: 400 }
      );
    }

    // Apply for dealer account
    const result = await writeClient
      .patch(existingUser._id)
      .set({
        businessStatus: "pending",
        businessAppliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      message:
        `🚀 Dealer account application submitted successfully! Your application is under review and ${discountMessage}`,
      user: result,
    });
  } catch (error) {
    console.error("Error applying for dealer account:", error);
    return NextResponse.json(
      { error: "Failed to submit dealer account application" },
      { status: 500 }
    );
  }
}
