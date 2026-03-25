import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, type User } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    // Get current user details to check admin status
    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(userId);
    const userEmail = currentUser.primaryEmailAddress?.emailAddress;

    // Check if current user is admin
    if (!userEmail || !isUserAdmin(userEmail)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get pagination params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const query = searchParams.get("query") || "";

    // Fetch users from Clerk
    const usersResponse = await clerk.users.getUserList({
      limit,
      offset,
      query: query || undefined,
      orderBy: "-created_at",
    });

    // Format user data
    const formattedUsers = usersResponse.data.map((user: User) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.primaryEmailAddress?.emailAddress,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      emailVerified:
        user.primaryEmailAddress?.verification?.status === "verified",
      banned: user.banned,
      locked: user.locked,
      twoFactorEnabled: user.twoFactorEnabled,
      privateMetadata: user.privateMetadata,
      publicMetadata: user.publicMetadata,
      externalId: user.externalId,
    }));

    return NextResponse.json({
      users: formattedUsers,
      totalCount: usersResponse.totalCount,
      hasNextPage: offset + limit < (usersResponse.totalCount || 0),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete users (single or bulk)
export async function DELETE(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    // Get current user details to check admin status
    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(userId);
    const userEmail = currentUser.primaryEmailAddress?.emailAddress;

    // Check if current user is admin
    if (!userEmail || !isUserAdmin(userEmail)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userIds } = body; // Array of user IDs to delete

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required" },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userIds.includes(userId)) {
      return NextResponse.json(
        { error: "Cannot delete your own admin account" },
        { status: 400 }
      );
    }

    // Delete users from Clerk
    const deleteResults = [];
    for (const userIdToDelete of userIds) {
      try {
        await clerk.users.deleteUser(userIdToDelete);
        deleteResults.push({ userId: userIdToDelete, success: true });
      } catch (error) {
        console.error(`Failed to delete user ${userIdToDelete}:`, error);
        deleteResults.push({
          userId: userIdToDelete,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = deleteResults.filter((r) => r.success).length;
    const failureCount = deleteResults.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${successCount} user(s)${failureCount > 0 ? `, failed to delete ${failureCount}` : ""}`,
      results: deleteResults,
    });
  } catch (error) {
    console.error("Error deleting users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
