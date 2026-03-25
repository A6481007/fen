import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { sanityFetch } from "@/sanity/lib/live";
import { USER_BY_CLERK_ID_QUERY } from "@/sanity/queries/userQueries";
import ProfileClient from "@/components/profile/ProfileClient";
import type { Address } from "@/lib/address";

interface SanityUser {
  _id: string;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  profileImage?: {
    asset: {
      _id: string;
      url: string;
    };
  };
  addresses?: Address[];
  preferences?: Record<string, unknown>;
  loyaltyPoints?: number;
  rewardPoints?: number;
  totalSpent?: number;
  lastLogin?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Fetch user data from Sanity
  let sanityUser: SanityUser | null = null;
  try {
    const { data } = await sanityFetch({
      query: USER_BY_CLERK_ID_QUERY,
      params: { clerkUserId: userId },
    });
    sanityUser = data;
  } catch (error) {
    console.error("Error fetching user from Sanity:", error);
  }

  // Combine Clerk and Sanity data - serialize Clerk objects to plain data
  const userData = {
    clerk: {
      id: clerkUser.id,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      emailAddresses: clerkUser.emailAddresses.map((email) => ({
        id: email.id,
        emailAddress: email.emailAddress,
        verification: email.verification
          ? {
              status: email.verification.status,
              strategy: email.verification.strategy,
            }
          : null,
      })),
      imageUrl: clerkUser.imageUrl,
      createdAt: new Date(clerkUser.createdAt),
      updatedAt: new Date(clerkUser.updatedAt),
    },
    sanity: sanityUser,
  };

  return <ProfileClient userData={userData} />;
}
