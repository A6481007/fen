import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { client } from "@/sanity/lib/client";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contacts = await client.fetch(
      `*[_type == "salesContact" && defined(user) && user->isEmployee == true && user->employeeRole == "callcenter" && user->employeeStatus == "active"] | order(name asc){
        _id,
        name,
        email,
        phone
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
