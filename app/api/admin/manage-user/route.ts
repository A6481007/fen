import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeClient, client } from "@/sanity/lib/client";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, setPremium, setPremiumRequest, setPremiumRequestEnabled } =
      await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await client.fetch(
      `*[_type == "userType" && email == $email][0]`,
      { email }
    );

    const premiumRequestToggle =
      typeof setPremiumRequestEnabled === "boolean"
        ? setPremiumRequestEnabled
        : typeof setPremiumRequest === "boolean"
          ? setPremiumRequest
          : null;

    if (typeof premiumRequestToggle === "boolean") {
      if (!existingUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      const result = await writeClient
        .patch(existingUser._id)
        .set({
          premiumRequestEnabled: premiumRequestToggle,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      return NextResponse.json({
        success: true,
        message: premiumRequestToggle
          ? "Premium request unlocked."
          : "Premium request hidden.",
        user: result,
      });
    }

    if (existingUser) {
      // Update existing user
      const result = await writeClient
        .patch(existingUser._id)
        .set({
          isActive: setPremium || existingUser.isActive,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      return NextResponse.json({
        success: true,
        message: `User premium status updated to: ${
          setPremium ? "Active" : "Inactive"
        }`,
        user: result,
      });
    } else {
      // Create new user
      const newUser = await writeClient.create({
        _type: "userType",
        email,
        isActive: setPremium || true, // Default to premium
        isBusiness: false,
        membershipType: setPremium ? "premium" : "standard",
        premiumRequestEnabled: false,
        activatedAt: new Date().toISOString(),
        activatedBy: "admin-creation",
        rewardPoints: 0,
        loyaltyPoints: setPremium ? 100 : 0,
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
        message: "User created successfully with premium status",
        user: newUser,
      });
    }
  } catch (error) {
    console.error("Error managing user:", error);
    return NextResponse.json(
      { error: "Failed to manage user" },
      { status: 500 }
    );
  }
}
