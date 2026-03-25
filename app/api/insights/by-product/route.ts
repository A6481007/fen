import { NextResponse } from "next/server";
import { getInsightsByProduct } from "@/sanity/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    return NextResponse.json({ insights: [] }, { status: 400 });
  }

  try {
    const insights = await getInsightsByProduct(productId);
    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Error fetching insights by product:", error);
    return NextResponse.json({ insights: [] }, { status: 500 });
  }
}
