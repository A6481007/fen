import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { writeClient } from "@/sanity/lib/client";

// Disable caching for this route to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SanityUser {
  _id: string;
  clerkUserId: string;
  isActive: boolean;
  role?: string;
  accountStatus?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  activatedAt?: string;
  activatedBy?: string;
  loyaltyPoints?: number;
  totalSpent?: number;
  notificationCount?: number;
  isEmployee?: boolean;
  employeeRole?: string;
  employeeStatus?: string;
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const query = searchParams.get("query") || "";
    const activeOnly = searchParams.get("activeOnly") === "true";

    // Fetch data in parallel for better performance
    const [clerkUsers, sanityUsers] = await Promise.all([
      // Fetch only the needed users from Clerk
      clerk.users.getUserList({
        limit: query ? 100 : limit,
        offset: query ? 0 : offset,
        query: query || undefined,
        orderBy: "-created_at",
      }),

      // Fetch Sanity users with optimized query (only needed fields)
      writeClient.fetch(
        activeOnly
          ? `*[_type == "user" && isActive == true]{
              _id,
              clerkUserId,
              isActive,
              activatedAt,
              activatedBy,
              loyaltyPoints,
              totalSpent,
              "notificationCount": count(notifications),
              isEmployee,
              employeeRole,
              employeeStatus
            }`
          : `*[_type == "user"]{
              _id,
              clerkUserId,
              isActive,
              activatedAt,
              activatedBy,
              loyaltyPoints,
              totalSpent,
              "notificationCount": count(notifications),
              isEmployee,
              employeeRole,
              employeeStatus
            }`
      ),
    ]);

    // Create a map of Sanity users by clerkUserId
    const sanityUserMap = new Map<string, SanityUser>(
      sanityUsers.map((user: SanityUser) => [user.clerkUserId, user])
    );

    // Combine data: include all Clerk users with their Sanity status
    const combinedUsers = clerkUsers.data.map((clerkUser) => {
      const sanityUser = sanityUserMap.get(clerkUser.id);

      return {
        id: clerkUser.id,
        clerkUserId: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        fullName: `${clerkUser.firstName || ""} ${
          clerkUser.lastName || ""
        }`.trim(),
        email: clerkUser.primaryEmailAddress?.emailAddress,
        imageUrl: clerkUser.imageUrl,
        createdAt: clerkUser.createdAt,
        lastSignInAt: clerkUser.lastSignInAt,
        emailVerified:
          clerkUser.primaryEmailAddress?.verification?.status === "verified",
        banned: clerkUser.banned,
        locked: clerkUser.locked,
        // Sanity-specific fields
        isActive: sanityUser?.isActive || false,
        activatedAt: sanityUser?.activatedAt,
        activatedBy: sanityUser?.activatedBy,
        sanityId: sanityUser?._id,
        inSanity: !!sanityUser,
        loyaltyPoints: sanityUser?.loyaltyPoints || 0,
        totalSpent: sanityUser?.totalSpent || 0,
        notificationCount: sanityUser?.notificationCount || 0,
        // Employee fields
        isEmployee: sanityUser?.isEmployee || false,
        employeeRole: sanityUser?.employeeRole,
        employeeStatus: sanityUser?.employeeStatus,
      };
    });

    // Filter based on query if provided
    let filteredUsers = combinedUsers;
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredUsers = combinedUsers.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(lowerQuery) ||
          user.lastName?.toLowerCase().includes(lowerQuery) ||
          user.email?.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply pagination
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return NextResponse.json({
      users: paginatedUsers,
      totalCount: filteredUsers.length,
      hasNextPage: offset + limit < filteredUsers.length,
      sanityUsersCount: sanityUsers.length,
      activeUsersCount: sanityUsers.filter((u: SanityUser) => u.isActive)
        .length,
    });
  } catch (error) {
    console.error("Error fetching combined users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
