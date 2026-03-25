import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { client } from "@/sanity/lib/client";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(userId);
    const userEmail = currentUser.primaryEmailAddress?.emailAddress;

    if (!userEmail || !isUserAdmin(userEmail)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const contacts = await client.fetch(
      `*[_type == "salesContact" && defined(user) && user->isEmployee == true && user->employeeRole == "callcenter" && user->employeeStatus == "active"] | order(name asc){
        _id,
        name,
        phone,
        ext,
        fax,
        mobile,
        lineId,
        lineExt,
        email,
        web,
        terms{
          paymentCondition,
          deliveryCondition,
          validityCondition,
          warrantyCondition
        },
        paymentCondition,
        deliveryCondition,
        validityCondition,
        warrantyCondition
      }`,
      {},
      { cache: "no-store", next: { revalidate: 0 } }
    );

    return NextResponse.json(
      { salesContacts: contacts ?? [] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching sales contacts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
