import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentEmployee } from "@/actions/employeeActions";

export async function GET() {
  try {
    // Check if SANITY_API_TOKEN is available
    if (!process.env.SANITY_API_TOKEN) {
      console.warn("SANITY_API_TOKEN not configured - employee check disabled");
      return NextResponse.json({ isEmployee: false }, { status: 200 });
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ isEmployee: false }, { status: 200 });
    }

    try {
      const employee = await getCurrentEmployee();

      return NextResponse.json(
        {
          isEmployee: !!employee && employee.status === "active",
          role: employee?.role || null,
        },
        { status: 200 }
      );
    } catch (employeeError) {
      console.error("Error fetching employee data:", employeeError);
      // Return false instead of throwing error
      return NextResponse.json({ isEmployee: false }, { status: 200 });
    }
  } catch (error) {
    console.error("Error checking employee status:", error);
    return NextResponse.json(
      { isEmployee: false, error: "Failed to check employee status" },
      { status: 200 }
    ); // Return 200 instead of 500 to prevent fetch errors
  }
}
