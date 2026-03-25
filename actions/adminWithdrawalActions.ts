"use server";

import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { isAdmin } from "@/lib/adminUtils";

/**
 * Admin: Get all pending withdrawal requests
 */
export async function getAllWithdrawalRequests(): Promise<{
  success: boolean;
  requests?: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    method: string;
    bankDetails?: any;
    paypalEmail?: string;
    status: string;
    requestedAt: string;
    processedAt?: string;
    processedBy?: string;
    rejectionReason?: string;
  }>;
  message?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Verify admin status - check both database field and environment variable
    const adminUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{ email, isAdmin }`,
      { clerkUserId }
    );

    if (!isAdmin(adminUser)) {
      return {
        success: false,
        message: "Admin access required to view withdrawal requests",
      };
    }

    // Get all users with pending withdrawals
    const users = await backendClient.fetch(
      `*[_type == "user" && defined(withdrawalRequests) && count(withdrawalRequests) > 0]{
        _id,
        clerkUserId,
        name,
        email,
        withdrawalRequests
      }`
    );

    const allRequests: any[] = [];

    users.forEach((user: any) => {
      user.withdrawalRequests.forEach((request: any) => {
        allRequests.push({
          ...request,
          userId: user.clerkUserId,
          userName: user.name,
          userEmail: user.email,
        });
      });
    });

    // Sort by requested date (newest first)
    allRequests.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

    return {
      success: true,
      requests: allRequests,
    };
  } catch (error) {
    console.error("Error fetching withdrawal requests:", error);
    return { success: false, message: "Failed to fetch withdrawal requests" };
  }
}

/**
 * Admin: Approve withdrawal request
 */
export async function approveWithdrawal(
  userId: string,
  requestId: string,
  transactionId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Verify admin status - check both database field and environment variable
    const adminUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{ email, isAdmin }`,
      { clerkUserId }
    );

    if (!isAdmin(adminUser)) {
      return {
        success: false,
        message: "Admin access required to approve withdrawals",
      };
    }

    // Get user and withdrawal request
    const user = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $userId][0]{ 
        _id, 
        walletBalance, 
        withdrawalRequests
      }`,
      { userId }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const request = user.withdrawalRequests.find(
      (r: any) => r.id === requestId
    );

    if (!request) {
      return { success: false, message: "Withdrawal request not found" };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        message: "Only pending requests can be approved",
      };
    }

    // Update withdrawal request status
    const updatedRequests = user.withdrawalRequests.map((r: any) =>
      r.id === requestId
        ? {
            ...r,
            status: "processing",
            processedAt: new Date().toISOString(),
            processedBy: adminUser.email,
            transactionId: transactionId || "",
          }
        : r
    );

    await backendClient
      .patch(user._id)
      .set({ withdrawalRequests: updatedRequests })
      .commit();

    return {
      success: true,
      message: "Withdrawal approved and processing",
    };
  } catch (error) {
    console.error("Error approving withdrawal:", error);
    return { success: false, message: "Failed to approve withdrawal" };
  }
}

/**
 * Admin: Complete withdrawal (after funds transferred)
 */
export async function completeWithdrawal(
  userId: string,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Verify admin status - check both database field and environment variable
    const adminUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{ email, isAdmin }`,
      { clerkUserId }
    );

    if (!isAdmin(adminUser)) {
      return {
        success: false,
        message: "Admin access required to complete withdrawals",
      };
    }

    // Get user
    const user = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $userId][0]{ 
        _id, 
        withdrawalRequests
      }`,
      { userId }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const request = user.withdrawalRequests.find(
      (r: any) => r.id === requestId
    );

    if (!request) {
      return { success: false, message: "Withdrawal request not found" };
    }

    if (request.status !== "processing") {
      return {
        success: false,
        message: "Only processing requests can be completed",
      };
    }

    // Update withdrawal request status
    const updatedRequests = user.withdrawalRequests.map((r: any) =>
      r.id === requestId
        ? {
            ...r,
            status: "completed",
            processedAt: new Date().toISOString(),
            processedBy: adminUser.email,
          }
        : r
    );

    await backendClient
      .patch(user._id)
      .set({ withdrawalRequests: updatedRequests })
      .commit();

    return {
      success: true,
      message: "Withdrawal marked as completed",
    };
  } catch (error) {
    console.error("Error completing withdrawal:", error);
    return { success: false, message: "Failed to complete withdrawal" };
  }
}

/**
 * Admin: Reject withdrawal request
 */
export async function rejectWithdrawal(
  userId: string,
  requestId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Verify admin status - check both database field and environment variable
    const adminUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{ email, isAdmin }`,
      { clerkUserId }
    );

    if (!isAdmin(adminUser)) {
      return {
        success: false,
        message: "Admin access required to reject withdrawals",
      };
    }

    // Get user
    const user = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $userId][0]{ 
        _id, 
        withdrawalRequests
      }`,
      { userId }
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const request = user.withdrawalRequests.find(
      (r: any) => r.id === requestId
    );

    if (!request) {
      return { success: false, message: "Withdrawal request not found" };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        message: "Only pending requests can be rejected",
      };
    }

    // Update withdrawal request status
    const updatedRequests = user.withdrawalRequests.map((r: any) =>
      r.id === requestId
        ? {
            ...r,
            status: "rejected",
            processedAt: new Date().toISOString(),
            processedBy: adminUser.email,
            rejectionReason: reason,
          }
        : r
    );

    await backendClient
      .patch(user._id)
      .set({ withdrawalRequests: updatedRequests })
      .commit();

    return {
      success: true,
      message: "Withdrawal request rejected",
    };
  } catch (error) {
    console.error("Error rejecting withdrawal:", error);
    return { success: false, message: "Failed to reject withdrawal" };
  }
}
