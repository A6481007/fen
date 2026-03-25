import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { ensureCustomerCodeForUser } from "@/lib/customerCode";

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    const clerkUser = await currentUser();

    if (!userId || !clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, dateOfBirth } = body;
    const resolvedFirstName =
      typeof firstName === "string" ? firstName : clerkUser.firstName || "";
    const resolvedLastName =
      typeof lastName === "string" ? lastName : clerkUser.lastName || "";
    const userEmail =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      "";

    const ensured = await ensureCustomerCodeForUser({
      clerkUserId: userId,
      email: userEmail,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      phone,
    });

    const result = await backendClient
      .patch(ensured.userId)
      .set({
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        phone,
        dateOfBirth,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: result,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
