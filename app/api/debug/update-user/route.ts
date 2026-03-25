import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    const userEmail = user.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Find user
    const existingUser = await backendClient.fetch(
      `*[_type == "userType" && email == $email][0]`,
      { email: userEmail }
    );

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found in Sanity" },
        { status: 404 }
      );
    }

    let updatedUser;

    switch (action) {
      case "make-premium":
        updatedUser = await backendClient
          .patch(existingUser._id)
          .set({
            isActive: true,
            membershipType: "premium",
            activatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .commit();
        break;

      case "make-standard":
        updatedUser = await backendClient
          .patch(existingUser._id)
          .set({
            isActive: false,
            membershipType: "standard",
            updatedAt: new Date().toISOString(),
          })
          .commit();
        break;

      case "make-business":
        updatedUser = await backendClient
          .patch(existingUser._id)
          .set({
            isBusiness: true,
            businessApprovedBy: "admin@test.com",
            businessApprovedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .commit();
        break;

      case "remove-business":
        updatedUser = await backendClient
          .patch(existingUser._id)
          .set({
            isBusiness: false,
            businessApprovedBy: null,
            businessApprovedAt: null,
            updatedAt: new Date().toISOString(),
          })
          .commit();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `User updated to ${action}`,
      user: updatedUser,
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}