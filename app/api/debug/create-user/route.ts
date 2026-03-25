import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Create user debug endpoint" });
}
