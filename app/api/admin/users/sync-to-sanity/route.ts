import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { writeClient } from "@/sanity/lib/client";
import { generateCustomerCodeForDate } from "@/lib/customerCode";

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    // Get current user details to check admin status
    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(currentUserId);
    const adminEmail = currentUser.primaryEmailAddress?.emailAddress;

    // Check if current user is admin
    if (!adminEmail || !isUserAdmin(adminEmail)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { clerkUserIds } = await req.json(); // Array of Clerk user IDs

    if (
      !clerkUserIds ||
      !Array.isArray(clerkUserIds) ||
      clerkUserIds.length === 0
    ) {
      return NextResponse.json(
        { error: "clerkUserIds array is required" },
        { status: 400 }
      );
    }

    const results = [];

    for (const clerkUserId of clerkUserIds) {
      try {
        // Get user from Clerk
        const clerkUser = await clerk.users.getUser(clerkUserId);
        if (!clerkUser) {
          results.push({
            clerkUserId,
            success: false,
            error: "User not found in Clerk",
          });
          continue;
        }

        const userEmail = clerkUser.primaryEmailAddress?.emailAddress;
        if (!userEmail) {
          results.push({
            clerkUserId,
            success: false,
            error: "User email not found",
          });
          continue;
        }

        // Check if user already exists in Sanity
        const existingUser = await writeClient.fetch(
          `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
          { clerkUserId }
        );

        if (existingUser) {
          if (!existingUser.customerCode) {
            try {
              const createdAtSource =
                existingUser.createdAt ||
                existingUser._createdAt ||
                new Date().toISOString();
              const customerCode = await generateCustomerCodeForDate(
                new Date(createdAtSource)
              );
              await writeClient
                .patch(existingUser._id)
                .set({ customerCode })
                .commit();
            } catch (codeError) {
              console.error(
                `Failed to assign customer code for ${clerkUserId}:`,
                codeError
              );
            }
          }

          // Update existing user to active if not already
          if (!existingUser.isActive) {
            await writeClient
              .patch(existingUser._id)
              .set({
                isActive: true,
                activatedAt: new Date().toISOString(),
                activatedBy: adminEmail,
                updatedAt: new Date().toISOString(),
              })
              .commit();
          }

          results.push({
            clerkUserId,
            success: true,
            action: existingUser.isActive ? "already_active" : "activated",
            sanityId: existingUser._id,
          });
        } else {
          // Create new user in Sanity
          const createdAtSource = clerkUser.createdAt
            ? new Date(clerkUser.createdAt)
            : new Date();
          const customerCode = await generateCustomerCodeForDate(
            createdAtSource
          );
          const newUser = await writeClient.create({
            _type: "user",
            clerkUserId,
            email: userEmail,
            firstName: clerkUser.firstName || "",
            lastName: clerkUser.lastName || "",
            profileImageUrl: clerkUser.imageUrl || "",
            customerCode,
            isActive: true,
            activatedAt: new Date().toISOString(),
            activatedBy: adminEmail,
            createdAt: createdAtSource.toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              emailNotifications: true,
              smsNotifications: false,
              newsletter: false,
              preferredCurrency: "THB",
              preferredLanguage: "en",
            },
            loyaltyPoints: 0,
            totalSpent: 0,
            notifications: [],
            wishlist: [],
            cart: [],
            orders: [],
          });

          results.push({
            clerkUserId,
            success: true,
            action: "created",
            sanityId: newUser._id,
          });
        }
      } catch (error) {
        console.error(`Error syncing user ${clerkUserId}:`, error);
        results.push({
          clerkUserId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${clerkUserIds.length} users: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: clerkUserIds.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error("Error syncing users to Sanity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
