import { NextResponse } from "next/server";
import { getTaxRate } from "@/lib/taxRate";

export async function GET() {
  const taxRate = await getTaxRate();
  return NextResponse.json({ taxRate });
}
